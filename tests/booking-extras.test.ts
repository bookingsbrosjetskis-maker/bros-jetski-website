import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  createPendingBooking,
  confirmBooking,
  cancelBooking,
  completeBooking,
  computePrice,
  BookingConflictError,
  BookingValidationError,
  type CreateBookingInput,
} from "@/lib/booking";
import { DurationType, RidingOption } from "@/lib/constants";
import { dockNowMs, dockTodayKey } from "@/lib/format";
import type { JetSki } from "@prisma/client";

// Distinct far-future window from the other suite to avoid slot collisions.
const runOffsetDays = Math.floor(Date.now() / 1000) % 10_000;
const BASE_MS = Date.UTC(2033, 0, 1) + runOffsetDays * 86_400_000;
const dateKeyFor = (d: number) => new Date(BASE_MS + d * 86_400_000).toISOString().slice(0, 10);

const TEST_EMAIL = `vitest-extras-${Date.now()}@example.com`;

let jetSki: JetSki;
const createdBlockIds: string[] = [];

function input(overrides: Partial<CreateBookingInput>): CreateBookingInput {
  return {
    jetSkiId: jetSki.id,
    dateKey: dateKeyFor(1),
    startHour: 10,
    durationType: DurationType.HOURLY,
    hours: 2,
    customerName: "Vitest Extras",
    email: TEST_EMAIL,
    phone: "343-324-0433",
    ridingOption: RidingOption.DESIGNATED,
    ...overrides,
  };
}

beforeAll(async () => {
  jetSki = await prisma.jetSki.findFirstOrThrow({ where: { active: true } });
});

afterAll(async () => {
  await prisma.booking.deleteMany({ where: { email: TEST_EMAIL } });
  if (createdBlockIds.length > 0) {
    await prisma.blockedDate.deleteMany({ where: { id: { in: createdBlockIds } } });
  }
  await prisma.$disconnect();
});

describe("computePrice", () => {
  const rates = { hourlyRate: 12000, halfDayRate: 48000, fullDayRate: 96000, weekendRate: 160000 };

  it("prices each duration type from the right rate field", () => {
    expect(computePrice(rates, DurationType.HOURLY, 1)).toBe(12000);
    expect(computePrice(rates, DurationType.HOURLY, 3)).toBe(36000);
    expect(computePrice(rates, DurationType.HALF_DAY, 4)).toBe(48000);
    expect(computePrice(rates, DurationType.FULL_DAY, 8)).toBe(96000);
    expect(computePrice(rates, DurationType.WEEKEND, 36)).toBe(160000);
  });

  it("persists the weekend rate as the booking total", async () => {
    const booking = await createPendingBooking(
      input({ dateKey: dateKeyFor(2), startHour: 9, durationType: DurationType.WEEKEND, hours: 36 })
    );
    expect(booking.totalPrice).toBe(jetSki.weekendRate);
  });
});

describe("validateSlot boundaries", () => {
  it("rejects a slot in the past", async () => {
    await expect(
      createPendingBooking(input({ dateKey: "2020-01-01", startHour: 10 }))
    ).rejects.toBeInstanceOf(BookingValidationError);
  });

  it("rejects a slot that runs past the close hour", async () => {
    await expect(
      createPendingBooking(input({ dateKey: dateKeyFor(3), startHour: 20, hours: 3 }))
    ).rejects.toBeInstanceOf(BookingValidationError);
  });

  it("rejects a malformed date key", async () => {
    await expect(
      createPendingBooking(input({ dateKey: "07/15/2033", startHour: 10 }))
    ).rejects.toBeInstanceOf(BookingValidationError);
  });
});

describe("dock-local time helpers", () => {
  it("encodes dock wall-clock time as UTC (summer EDT = UTC-4)", () => {
    // 18:30 UTC on a July day is 14:30 in Ottawa (EDT).
    const ms = dockNowMs(new Date("2033-07-15T18:30:00.000Z"));
    expect(new Date(ms).toISOString()).toBe("2033-07-15T14:30:00.000Z");
  });

  it("keeps 'today' on the dock day late in the UTC evening", () => {
    // 01:30 UTC July 16 is still 21:30 July 15 in Ottawa.
    expect(dockTodayKey(new Date("2033-07-16T01:30:00.000Z"))).toBe("2033-07-15");
  });
});

describe("confirmBooking after lazy expiry", () => {
  it("rejects when the slot was re-booked after the hold expired", async () => {
    const slot = { dateKey: dateKeyFor(10), startHour: 10, hours: 2 };
    const stale = await createPendingBooking(input(slot));
    await prisma.booking.update({
      where: { id: stale.id },
      data: { status: "EXPIRED", expiresAt: new Date(Date.now() - 60_000) },
    });
    // Someone else takes the freed slot.
    await createPendingBooking(input(slot));

    await expect(confirmBooking(stale.id)).rejects.toBeInstanceOf(BookingConflictError);
  });

  it("rejects when the date was blocked after the hold expired", async () => {
    const slot = { dateKey: dateKeyFor(11), startHour: 10, hours: 2 };
    const stale = await createPendingBooking(input(slot));
    await prisma.booking.update({
      where: { id: stale.id },
      data: { status: "EXPIRED", expiresAt: new Date(Date.now() - 60_000) },
    });
    const block = await prisma.blockedDate.create({
      data: { jetSkiId: null, date: new Date(`${dateKeyFor(11)}T00:00:00.000Z`), reason: "WEATHER" },
    });
    createdBlockIds.push(block.id);

    await expect(confirmBooking(stale.id)).rejects.toBeInstanceOf(BookingConflictError);
  });
});

describe("cancel / complete transitions", () => {
  it("cancels a PENDING booking, then refuses a second cancel", async () => {
    const booking = await createPendingBooking(input({ dateKey: dateKeyFor(12), startHour: 9, hours: 1 }));
    const cancelled = await cancelBooking(booking.id);
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.expiresAt).toBeNull();
    await expect(cancelBooking(booking.id)).rejects.toBeInstanceOf(BookingValidationError);
  });

  it("completes only a CONFIRMED booking", async () => {
    const booking = await createPendingBooking(input({ dateKey: dateKeyFor(13), startHour: 9, hours: 1 }));
    // Cannot complete while still PENDING.
    await expect(completeBooking(booking.id)).rejects.toBeInstanceOf(BookingValidationError);
    await confirmBooking(booking.id);
    const done = await completeBooking(booking.id);
    expect(done.status).toBe("COMPLETED");
  });
});
