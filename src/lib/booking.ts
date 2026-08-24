import { Prisma, type Booking, type JetSki } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  BookingStatus,
  DURATION_OPTIONS,
  DurationType,
  RidingOption,
  OPEN_HOUR,
  CLOSE_HOUR,
  PENDING_EXPIRY_MINUTES,
  bookingDepositFor,
} from "@/lib/constants";
import { fromDateKey, dockNowMs } from "@/lib/format";

// All slot times are stored as UTC datetimes that *represent local dock time*
// (no timezone conversion anywhere). A slot on "2026-07-10" from 10:00 for 2h
// is stored as 2026-07-10T10:00:00Z – 2026-07-10T12:00:00Z. This keeps
// availability math trivial and identical across SQLite and Postgres.

export class BookingConflictError extends Error {
  constructor(message = "This time slot is no longer available.") {
    super(message);
    this.name = "BookingConflictError";
  }
}

export class BookingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingValidationError";
  }
}

type Client = Prisma.TransactionClient | typeof prisma;

/** Prisma's defaults (2s to acquire, 5s to run) assume a local database. Ours
 * is remote, and the booking transaction makes several sequential round-trips,
 * so the defaults abort perfectly healthy writes. These bounds still fail fast
 * enough that a wedged transaction cannot hold a slot hostage. */
const TX_OPTIONS = { maxWait: 15_000, timeout: 20_000 } as const;

/** Mark overdue PENDING bookings as EXPIRED so they release their slots.
 * Called lazily by every availability read and booking write — no cron. */
export async function expireStaleBookings(client: Client = prisma): Promise<number> {
  const res = await client.booking.updateMany({
    where: { status: BookingStatus.PENDING, expiresAt: { lt: new Date() } },
    data: { status: BookingStatus.EXPIRED },
  });
  return res.count;
}

/** Where-clause for bookings that currently occupy a slot. */
function slotHoldingWhere(now: Date): Prisma.BookingWhereInput {
  return {
    OR: [
      { status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] } },
      { status: BookingStatus.PENDING, expiresAt: { gt: now } },
    ],
  };
}

export function computeSlotTimes(dateKey: string, startHour: number, hours: number) {
  const day = fromDateKey(dateKey);
  const startTime = new Date(day.getTime() + startHour * 3600_000);
  const endTime = new Date(startTime.getTime() + hours * 3600_000);
  return { day, startTime, endTime };
}

/** Rental price for `quantity` skis. Rates are per jet ski, so a group booking
 * is simply the single-ski price multiplied by how many are reserved. */
export function computePrice(
  jetSki: Pick<JetSki, "hourlyRate" | "halfDayRate" | "fullDayRate" | "weekendRate">,
  durationType: DurationType,
  hours: number,
  quantity = 1
): number {
  const perSki = (() => {
    switch (durationType) {
      case DurationType.HALF_DAY:
        return jetSki.halfDayRate;
      case DurationType.FULL_DAY:
        return jetSki.fullDayRate;
      case DurationType.WEEKEND:
        return jetSki.weekendRate;
      default:
        return jetSki.hourlyRate * hours;
    }
  })();
  return perSki * quantity;
}

/** Highest number of skis simultaneously committed at any instant of
 * [windowStart, windowEnd). Usage only ever changes at a booking's start, so
 * checking the window start plus every interior start instant is exact. */
export function peakUsage(
  intervals: { startTime: Date; endTime: Date; quantity: number }[],
  windowStart: Date,
  windowEnd: Date
): number {
  const from = windowStart.getTime();
  const to = windowEnd.getTime();
  const points = new Set<number>([from]);
  for (const i of intervals) {
    const t = i.startTime.getTime();
    if (t > from && t < to) points.add(t);
  }
  let peak = 0;
  for (const t of points) {
    let used = 0;
    for (const i of intervals) {
      if (i.startTime.getTime() <= t && i.endTime.getTime() > t) used += i.quantity;
    }
    if (used > peak) peak = used;
  }
  return peak;
}

function validateSlot(dateKey: string, startHour: number, durationType: DurationType, hours: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new BookingValidationError("Invalid date.");
  }
  const option = DURATION_OPTIONS.find((o) => o.type === durationType && o.hours === hours);
  if (!option) throw new BookingValidationError("Invalid rental duration.");
  // A weekend runs day 1 at OPEN_HOUR straight through to day 2 at CLOSE_HOUR,
  // so it deliberately exceeds the single-day close-hour bound.
  if (durationType === DurationType.WEEKEND) {
    if (startHour !== OPEN_HOUR) {
      throw new BookingValidationError(`Weekend rentals start at ${OPEN_HOUR}:00.`);
    }
    return;
  }
  if (!Number.isInteger(startHour) || startHour < OPEN_HOUR || startHour + hours > CLOSE_HOUR) {
    throw new BookingValidationError(
      `Rentals run between ${OPEN_HOUR}:00 and ${CLOSE_HOUR}:00.`
    );
  }
}

/** Blocked-date rows that affect this unit on any day the slot touches.
 * A row with jetSkiId=null blocks the entire fleet. */
async function findBlocks(client: Client, jetSkiId: string, startTime: Date, endTime: Date) {
  const firstDay = new Date(Date.UTC(startTime.getUTCFullYear(), startTime.getUTCMonth(), startTime.getUTCDate()));
  const lastInstant = new Date(endTime.getTime() - 1);
  const lastDay = new Date(Date.UTC(lastInstant.getUTCFullYear(), lastInstant.getUTCMonth(), lastInstant.getUTCDate()));
  return client.blockedDate.findMany({
    where: {
      date: { gte: firstDay, lte: lastDay },
      OR: [{ jetSkiId: null }, { jetSkiId }],
    },
  });
}

export type DayAvailability = {
  blocked: boolean;
  blockReason: string | null;
  /** How many identical units the fleet has for this jet ski. */
  unitCount: number;
  /** Occupied intervals as start/end hours within the day, each carrying the
   * number of skis it holds. A slot is bookable while the skis committed
   * across it stay below unitCount. */
  busy: { startHour: number; endHour: number; quantity: number }[];
};

/** Availability for one jet ski on one day ("YYYY-MM-DD"). */
export async function getDayAvailability(jetSkiId: string, dateKey: string): Promise<DayAvailability> {
  await expireStaleBookings();
  const now = new Date();
  const day = fromDateKey(dateKey);
  const dayEnd = new Date(day.getTime() + 24 * 3600_000);

  const [jetSki, blocks, bookings] = await Promise.all([
    prisma.jetSki.findUnique({ where: { id: jetSkiId }, select: { unitCount: true } }),
    prisma.blockedDate.findMany({
      where: { date: day, OR: [{ jetSkiId: null }, { jetSkiId }] },
    }),
    prisma.booking.findMany({
      where: {
        jetSkiId,
        startTime: { lt: dayEnd },
        endTime: { gt: day },
        ...slotHoldingWhere(now),
      },
      select: { startTime: true, endTime: true, quantity: true },
    }),
  ]);

  return {
    blocked: blocks.length > 0,
    blockReason: blocks[0]?.reason ?? null,
    unitCount: jetSki?.unitCount ?? 1,
    busy: bookings.map((b) => ({
      startHour: Math.max(0, (b.startTime.getTime() - day.getTime()) / 3600_000),
      endHour: Math.min(24, (b.endTime.getTime() - day.getTime()) / 3600_000),
      quantity: b.quantity,
    })),
  };
}

export type CreateBookingInput = {
  jetSkiId: string;
  dateKey: string; // "YYYY-MM-DD"
  startHour: number;
  durationType: DurationType;
  hours: number;
  customerName: string;
  email: string;
  phone: string;
  ridingOption?: RidingOption; // defaults to DESIGNATED (no security deposit)
  quantity?: number; // jet skis for this slot; defaults to 1
};

/** Skis still free for [startTime, endTime), ignoring `excludeBookingId`
 * (used when re-checking a booking against everything *else*). */
async function remainingCapacity(
  client: Client,
  jetSkiId: string,
  unitCount: number,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string
): Promise<number> {
  const overlapping = await client.booking.findMany({
    where: {
      jetSkiId,
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      ...slotHoldingWhere(new Date()),
    },
    select: { startTime: true, endTime: true, quantity: true },
  });
  return unitCount - peakUsage(overlapping, startTime, endTime);
}

/** "Only 1 jet ski is left…" / "All 3 jet skis are booked…" */
function capacityMessage(remaining: number, unitCount: number): string {
  if (remaining <= 0) {
    return unitCount === 1
      ? "This time slot is no longer available."
      : `All ${unitCount} jet skis are booked for that time. Please pick another time.`;
  }
  return `Only ${remaining} jet ski${remaining === 1 ? " is" : "s are"} left for that time. Please reduce the number of jet skis or pick another time.`;
}

/**
 * THE single write path for new bookings. Runs an interactive transaction:
 * expire stale holds → re-check blocks + overlaps → insert PENDING booking
 * with a 15-minute hold. SQLite serializes writers, making this race-free in
 * dev; on Postgres pass Serializable isolation (already set below — Prisma
 * ignores isolationLevel on SQLite versions that don't support it).
 * Throws BookingConflictError if the slot is taken or blocked.
 */
export async function createPendingBooking(input: CreateBookingInput): Promise<Booking> {
  const { jetSkiId, dateKey, startHour, durationType, hours } = input;
  validateSlot(dateKey, startHour, durationType, hours);

  // Shape only. There is deliberately no arbitrary ceiling here: the fleet's
  // unitCount is the single source of truth for how many skis can be booked,
  // and it is checked inside the transaction below against live data.
  const quantity = input.quantity ?? 1;
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new BookingValidationError("Please choose at least one jet ski.");
  }

  const customerName = input.customerName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  if (!customerName || !/^\S+@\S+\.\S+$/.test(email) || phone.replace(/\D/g, "").length < 10) {
    throw new BookingValidationError("Please provide a valid name, email, and phone number.");
  }
  if (customerName.length > 120 || email.length > 320 || phone.length > 40) {
    throw new BookingValidationError("Your name, email, or phone number is too long.");
  }

  const ridingOption =
    input.ridingOption === RidingOption.FREE_RANGE
      ? RidingOption.FREE_RANGE
      : RidingOption.DESIGNATED;

  const { startTime, endTime } = computeSlotTimes(dateKey, startHour, hours);
  // Slot times are UTC-encoded dock-local time, so compare against dock-local
  // "now" (not Date.now(), which would wrongly reject same-day near-future
  // slots by the dock's UTC offset).
  if (startTime.getTime() < dockNowMs()) {
    throw new BookingValidationError("That time is in the past.");
  }

  try {
    return await prisma.$transaction(
    async (tx) => {
      const jetSki = await tx.jetSki.findFirst({ where: { id: jetSkiId, active: true } });
      if (!jetSki) throw new BookingValidationError("This jet ski is not available for booking.");
      if (quantity > jetSki.unitCount) {
        throw new BookingValidationError(
          `We only have ${jetSki.unitCount} jet ski${jetSki.unitCount === 1 ? "" : "s"} in the fleet.`
        );
      }

      await expireStaleBookings(tx);
      const now = new Date();

      const blocks = await findBlocks(tx, jetSkiId, startTime, endTime);
      if (blocks.length > 0) {
        throw new BookingConflictError("That date is unavailable (maintenance or weather).");
      }

      // Capacity, not exclusivity: the slot is free while the skis already
      // committed across it leave `quantity` spare.
      const remaining = await remainingCapacity(
        tx,
        jetSkiId,
        jetSki.unitCount,
        startTime,
        endTime
      );
      if (remaining < quantity) {
        throw new BookingConflictError(capacityMessage(remaining, jetSki.unitCount));
      }

      const totalPrice = computePrice(jetSki, durationType, hours, quantity);
      const depositPaid = bookingDepositFor(totalPrice, quantity);

      return tx.booking.create({
        data: {
          jetSkiId,
          customerName,
          email,
          phone,
          startTime,
          endTime,
          durationType,
          hours,
          quantity,
          totalPrice,
          // Only the deposit is charged online; the rest is collected at the
          // dock by card (Stripe Tap to Pay) or cash before the ride.
          depositPaid,
          balanceDue: totalPrice - depositPaid,
          ridingOption,
          // Free-range riders owe a refundable security deposit in person, per
          // ski; designated-area riders owe none.
          securityDeposit:
            ridingOption === RidingOption.FREE_RANGE ? jetSki.depositAmount * quantity : 0,
          status: BookingStatus.PENDING,
          expiresAt: new Date(now.getTime() + PENDING_EXPIRY_MINUTES * 60_000),
        },
      });
    },
    { ...TX_OPTIONS, isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (err) {
    // On Postgres, two racing inserts that both pass the overlap SELECT abort
    // one with serialization_failure (40001), which Prisma surfaces as P2034.
    // Treat it as a slot race so the API returns 409, not a generic 500.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      throw new BookingConflictError();
    }
    throw err;
  }
}

/** Confirm a booking after successful payment. Idempotent: `confirmedNow` is
 * true only for the call that performed the transition to CONFIRMED, so the
 * webhook and success-page verification can't double-send the email. */
export async function confirmBooking(
  bookingId: string,
  stripeSessionId?: string
): Promise<{ booking: Booking; confirmedNow: boolean }> {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new BookingValidationError("Booking not found.");
    if (booking.status === BookingStatus.CONFIRMED) {
      return { booking, confirmedNow: false };
    }
    if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.EXPIRED) {
      throw new BookingValidationError(`Cannot confirm a ${booking.status} booking.`);
    }
    // A payment that lands just after lazy expiry still wins the slot unless
    // someone else has since taken it, or the day was blocked in the meantime.
    if (booking.status === BookingStatus.EXPIRED) {
      const blocks = await findBlocks(tx, booking.jetSkiId, booking.startTime, booking.endTime);
      if (blocks.length > 0) {
        throw new BookingConflictError("Payment received but that date was closed (maintenance or weather); refund required.");
      }
      const jetSki = await tx.jetSki.findUnique({
        where: { id: booking.jetSkiId },
        select: { unitCount: true },
      });
      const remaining = await remainingCapacity(
        tx,
        booking.jetSkiId,
        jetSki?.unitCount ?? 1,
        booking.startTime,
        booking.endTime,
        booking.id
      );
      if (remaining < booking.quantity) {
        throw new BookingConflictError(
          "Payment received but the slot was re-booked; refund required."
        );
      }
    }
    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: BookingStatus.CONFIRMED,
        expiresAt: null,
        ...(stripeSessionId ? { stripeSessionId } : {}),
      },
    });
    return { booking: updated, confirmedNow: true };
  }, TX_OPTIONS);
}

/** Cancel a booking (from PENDING or CONFIRMED). The single write path for
 * cancellation so the status guard lives in one place. Throws
 * BookingValidationError if the booking isn't in a cancellable state. */
export async function cancelBooking(bookingId: string): Promise<Booking> {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new BookingValidationError("Booking not found.");
    if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
      throw new BookingValidationError(`Cannot cancel a ${booking.status} booking.`);
    }
    return tx.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED, expiresAt: null },
    });
  }, TX_OPTIONS);
}

/** Mark a CONFIRMED booking COMPLETED. The single write path for completion. */
export async function completeBooking(bookingId: string): Promise<Booking> {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new BookingValidationError("Booking not found.");
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BookingValidationError(`Cannot complete a ${booking.status} booking.`);
    }
    return tx.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.COMPLETED },
    });
  }, TX_OPTIONS);
}
