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

export function computePrice(
  jetSki: Pick<JetSki, "hourlyRate" | "halfDayRate" | "fullDayRate" | "weekendRate">,
  durationType: DurationType,
  hours: number
): number {
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
  /** Occupied intervals as start/end hours within the day. */
  busy: { startHour: number; endHour: number }[];
};

/** Availability for one unit on one day ("YYYY-MM-DD"). */
export async function getDayAvailability(jetSkiId: string, dateKey: string): Promise<DayAvailability> {
  await expireStaleBookings();
  const now = new Date();
  const day = fromDateKey(dateKey);
  const dayEnd = new Date(day.getTime() + 24 * 3600_000);

  const [blocks, bookings] = await Promise.all([
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
      select: { startTime: true, endTime: true },
    }),
  ]);

  return {
    blocked: blocks.length > 0,
    blockReason: blocks[0]?.reason ?? null,
    busy: bookings.map((b) => ({
      startHour: Math.max(0, (b.startTime.getTime() - day.getTime()) / 3600_000),
      endHour: Math.min(24, (b.endTime.getTime() - day.getTime()) / 3600_000),
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
  ridingOption?: RidingOption; // defaults to DESIGNATED (no deposit)
};

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

      await expireStaleBookings(tx);
      const now = new Date();

      const blocks = await findBlocks(tx, jetSkiId, startTime, endTime);
      if (blocks.length > 0) {
        throw new BookingConflictError("That date is unavailable (maintenance or weather).");
      }

      const conflict = await tx.booking.findFirst({
        where: {
          jetSkiId,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
          ...slotHoldingWhere(now),
        },
        select: { id: true },
      });
      if (conflict) throw new BookingConflictError();

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
          totalPrice: computePrice(jetSki, durationType, hours),
          ridingOption,
          // Free-range riders owe a refundable security deposit in person;
          // designated-area riders owe none.
          depositAmount:
            ridingOption === RidingOption.FREE_RANGE ? jetSki.depositAmount : 0,
          status: BookingStatus.PENDING,
          expiresAt: new Date(now.getTime() + PENDING_EXPIRY_MINUTES * 60_000),
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
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
      const conflict = await tx.booking.findFirst({
        where: {
          id: { not: booking.id },
          jetSkiId: booking.jetSkiId,
          startTime: { lt: booking.endTime },
          endTime: { gt: booking.startTime },
          ...slotHoldingWhere(new Date()),
        },
        select: { id: true },
      });
      if (conflict) throw new BookingConflictError("Payment received but the slot was re-booked; refund required.");
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
  });
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
  });
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
  });
}
