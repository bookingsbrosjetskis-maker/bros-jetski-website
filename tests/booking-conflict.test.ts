import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  createPendingBooking,
  confirmBooking,
  BookingConflictError,
  BookingValidationError,
  type CreateBookingInput,
} from "@/lib/booking";
import { DurationType, RidingOption } from "@/lib/constants";
import type { JetSki } from "@prisma/client";

// Unique far-future date window per test run so parallel/repeated runs never
// collide with each other or with real seed data.
const runOffsetDays = Math.floor(Date.now() / 1000) % 10_000;
const BASE_MS = Date.UTC(2031, 0, 1) + runOffsetDays * 86_400_000;

function dateKeyFor(dayIndex: number): string {
  return new Date(BASE_MS + dayIndex * 86_400_000).toISOString().slice(0, 10);
}

const TEST_EMAIL = `vitest-${Date.now()}@example.com`;

let jetSki: JetSki;
const createdBlockIds: string[] = [];

function input(overrides: Partial<CreateBookingInput>): CreateBookingInput {
  return {
    jetSkiId: jetSki.id,
    dateKey: dateKeyFor(1),
    startHour: 10,
    durationType: DurationType.HOURLY,
    hours: 2,
    customerName: "Vitest Runner",
    email: TEST_EMAIL,
    phone: "343-324-0433",
    ridingOption: RidingOption.DESIGNATED,
    ...overrides,
  };
}

const WEEKEND = {
  startHour: 9,
  durationType: DurationType.WEEKEND,
  hours: 36,
} as const;

beforeAll(async () => {
  jetSki = await prisma.jetSki.findFirstOrThrow({ where: { active: true } });
});

afterAll(async () => {
  // Waivers cascade on booking delete; none are created here anyway.
  await prisma.booking.deleteMany({ where: { email: TEST_EMAIL } });
  if (createdBlockIds.length > 0) {
    await prisma.blockedDate.deleteMany({ where: { id: { in: createdBlockIds } } });
  }
  await prisma.$disconnect();
});

describe("booking conflict handling", () => {
  it("allows exactly one of two concurrent bookings for the same slot", async () => {
    const slot = { dateKey: dateKeyFor(1), startHour: 10, hours: 2 };
    const results = await Promise.allSettled([
      createPendingBooking(input(slot)),
      createPendingBooking(input(slot)),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(BookingConflictError);
  });

  it("rejects a partially overlapping slot", async () => {
    // 10:00–13:00 booked, then 12:00–14:00 attempted.
    await createPendingBooking(
      input({ dateKey: dateKeyFor(2), startHour: 10, durationType: DurationType.HOURLY, hours: 3 })
    );
    await expect(
      createPendingBooking(
        input({ dateKey: dateKeyFor(2), startHour: 12, durationType: DurationType.HOURLY, hours: 2 })
      )
    ).rejects.toBeInstanceOf(BookingConflictError);
  });

  it("allows back-to-back adjacent slots", async () => {
    const first = await createPendingBooking(
      input({ dateKey: dateKeyFor(3), startHour: 10, hours: 2 })
    );
    const second = await createPendingBooking(
      input({ dateKey: dateKeyFor(3), startHour: 12, hours: 2 })
    );
    expect(first.id).not.toBe(second.id);
    expect(first.endTime.getTime()).toBe(second.startTime.getTime());
  });

  it("rejects bookings on a unit-blocked date and on a fleet-wide blocked date", async () => {
    const unitBlock = await prisma.blockedDate.create({
      data: {
        jetSkiId: jetSki.id,
        date: new Date(`${dateKeyFor(4)}T00:00:00.000Z`),
        reason: "MAINTENANCE",
      },
    });
    createdBlockIds.push(unitBlock.id);
    await expect(
      createPendingBooking(input({ dateKey: dateKeyFor(4) }))
    ).rejects.toBeInstanceOf(BookingConflictError);

    const fleetBlock = await prisma.blockedDate.create({
      data: {
        jetSkiId: null,
        date: new Date(`${dateKeyFor(5)}T00:00:00.000Z`),
        reason: "WEATHER",
      },
    });
    createdBlockIds.push(fleetBlock.id);
    await expect(
      createPendingBooking(input({ dateKey: dateKeyFor(5) }))
    ).rejects.toBeInstanceOf(BookingConflictError);
  });

  it("releases the slot when a pending hold has expired", async () => {
    const slot = { dateKey: dateKeyFor(6), startHour: 14, hours: 2 };
    const stale = await createPendingBooking(input(slot));

    // Force the hold into the past; the next attempt should lazily expire it.
    await prisma.booking.update({
      where: { id: stale.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const rebooked = await createPendingBooking(input(slot));
    expect(rebooked.id).not.toBe(stale.id);

    const staleAfter = await prisma.booking.findUniqueOrThrow({ where: { id: stale.id } });
    expect(staleAfter.status).toBe("EXPIRED");
  });

  it("weekend booking is rejected when day 2 already has an hourly booking", async () => {
    // Hourly booking on day 21 morning; a weekend starting day 20 spans into it.
    await createPendingBooking(
      input({ dateKey: dateKeyFor(21), startHour: 10, hours: 2 })
    );
    await expect(
      createPendingBooking(input({ ...WEEKEND, dateKey: dateKeyFor(20) }))
    ).rejects.toBeInstanceOf(BookingConflictError);
  });

  it("hourly booking on day 2 is rejected when a weekend already holds it", async () => {
    await createPendingBooking(input({ ...WEEKEND, dateKey: dateKeyFor(30) }));
    // Day 31 (the second weekend day) is now fully held.
    await expect(
      createPendingBooking(input({ dateKey: dateKeyFor(31), startHour: 12, hours: 2 }))
    ).rejects.toBeInstanceOf(BookingConflictError);
  });

  it("rejects a weekend that does not start at the open hour", async () => {
    await expect(
      createPendingBooking(input({ ...WEEKEND, startHour: 11, dateKey: dateKeyFor(40) }))
    ).rejects.toBeInstanceOf(BookingValidationError);
  });

  it("books a weekend that spans a month boundary", async () => {
    // Jan 31 -> Feb 1 of the run-offset base year.
    const janLast = new Date(Date.UTC(2032, 0, 31)).toISOString().slice(0, 10);
    const booking = await createPendingBooking(
      input({ ...WEEKEND, dateKey: janLast })
    );
    expect(booking.durationType).toBe(DurationType.WEEKEND);
    // Ends the next day at 21:00 (09:00 + 36h).
    expect(booking.endTime.getTime() - booking.startTime.getTime()).toBe(36 * 3600_000);
    expect(booking.endTime.getUTCMonth()).toBe(1); // February
    await prisma.booking.delete({ where: { id: booking.id } });
  });

  it("free-range booking carries a security deposit; designated carries none", async () => {
    const free = await createPendingBooking(
      input({ dateKey: dateKeyFor(45), startHour: 9, hours: 1, ridingOption: RidingOption.FREE_RANGE })
    );
    expect(free.depositAmount).toBeGreaterThan(0);
    const designated = await createPendingBooking(
      input({ dateKey: dateKeyFor(46), startHour: 9, hours: 1, ridingOption: RidingOption.DESIGNATED })
    );
    expect(designated.depositAmount).toBe(0);
  });

  it("confirmBooking is idempotent: confirmedNow true once, then false", async () => {
    const booking = await createPendingBooking(
      input({ dateKey: dateKeyFor(7), startHour: 9, hours: 1 })
    );

    const first = await confirmBooking(booking.id, `cs_test_${booking.id}`);
    expect(first.confirmedNow).toBe(true);
    expect(first.booking.status).toBe("CONFIRMED");
    expect(first.booking.expiresAt).toBeNull();

    const second = await confirmBooking(booking.id);
    expect(second.confirmedNow).toBe(false);
    expect(second.booking.status).toBe("CONFIRMED");
  });
});
