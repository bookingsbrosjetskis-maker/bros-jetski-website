import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  createPendingBooking,
  computePrice,
  peakUsage,
  getDayAvailability,
  BookingConflictError,
  BookingValidationError,
  type CreateBookingInput,
} from "@/lib/booking";
import {
  BOOKING_DEPOSIT_CENTS,
  DurationType,
  RidingOption,
  bookingDepositFor,
} from "@/lib/constants";
import type { JetSki } from "@prisma/client";

// Group bookings need a fleet of a known size, so this suite owns a temporary
// jet ski instead of depending on whatever the seed data says.
const FLEET_SIZE = 3;

// Distinct far-future window from the other suites to avoid slot collisions.
const runOffsetDays = Math.floor(Date.now() / 1000) % 10_000;
const BASE_MS = Date.UTC(2035, 0, 1) + runOffsetDays * 86_400_000;
const dateKeyFor = (d: number) => new Date(BASE_MS + d * 86_400_000).toISOString().slice(0, 10);

const TEST_EMAIL = `vitest-qty-${Date.now()}@example.com`;

let jetSki: JetSki;

function input(overrides: Partial<CreateBookingInput>): CreateBookingInput {
  return {
    jetSkiId: jetSki.id,
    dateKey: dateKeyFor(1),
    startHour: 10,
    durationType: DurationType.HOURLY,
    hours: 2,
    customerName: "Vitest Group",
    email: TEST_EMAIL,
    phone: "343-324-0433",
    ridingOption: RidingOption.DESIGNATED,
    ...overrides,
  };
}

beforeAll(async () => {
  jetSki = await prisma.jetSki.create({
    data: {
      name: `__vitest group fleet ${Date.now()}`,
      model: "Vitest",
      horsepower: 90,
      seats: 2,
      description: "Temporary fixture for the group-booking suite.",
      imageUrl: "/photos/ride-action.jpg",
      hourlyRate: 12000,
      halfDayRate: 48000,
      fullDayRate: 96000,
      weekendRate: 160000,
      depositAmount: 100000,
      unitCount: FLEET_SIZE,
      featured: false,
      active: true,
    },
  });
});

afterAll(async () => {
  await prisma.booking.deleteMany({ where: { jetSkiId: jetSki.id } });
  await prisma.jetSki.delete({ where: { id: jetSki.id } });
  await prisma.$disconnect();
});

describe("pricing and deposit for multiple jet skis", () => {
  const rates = { hourlyRate: 12000, halfDayRate: 48000, fullDayRate: 96000, weekendRate: 160000 };

  it("multiplies the per-ski rate by the quantity", () => {
    expect(computePrice(rates, DurationType.HOURLY, 1, 2)).toBe(24000);
    expect(computePrice(rates, DurationType.HALF_DAY, 4, 3)).toBe(144000);
    // Omitting quantity still prices a single ski, as before.
    expect(computePrice(rates, DurationType.FULL_DAY, 8)).toBe(96000);
  });

  it("charges the per-ski deposit online and leaves the rest for the dock", () => {
    expect(bookingDepositFor(24000, 2)).toBe(2 * BOOKING_DEPOSIT_CENTS);
    expect(bookingDepositFor(36000, 3)).toBe(3 * BOOKING_DEPOSIT_CENTS);
  });

  it("never takes more online than the rental is worth", () => {
    // A hypothetical $30 rental: the deposit collapses to the full price.
    expect(bookingDepositFor(3000, 1)).toBe(3000);
  });

  it("persists total, deposit, and balance on the booking", async () => {
    const booking = await createPendingBooking(
      input({ dateKey: dateKeyFor(1), startHour: 9, hours: 1, quantity: 2 })
    );
    expect(booking.quantity).toBe(2);
    expect(booking.totalPrice).toBe(jetSki.hourlyRate * 2);
    expect(booking.depositPaid).toBe(2 * BOOKING_DEPOSIT_CENTS);
    expect(booking.balanceDue).toBe(booking.totalPrice - booking.depositPaid);
  });

  it("scales the free-range security deposit per jet ski", async () => {
    const booking = await createPendingBooking(
      input({
        dateKey: dateKeyFor(2),
        startHour: 9,
        hours: 1,
        quantity: 2,
        ridingOption: RidingOption.FREE_RANGE,
      })
    );
    expect(booking.securityDeposit).toBe(jetSki.depositAmount * 2);
  });
});

describe("quantity validation", () => {
  it("defaults to one jet ski when quantity is omitted", async () => {
    const booking = await createPendingBooking(
      input({ dateKey: dateKeyFor(3), startHour: 9, hours: 1 })
    );
    expect(booking.quantity).toBe(1);
    expect(booking.depositPaid).toBe(BOOKING_DEPOSIT_CENTS);
  });

  it("rejects zero, negative, and fractional quantities", async () => {
    for (const quantity of [0, -1, 1.5]) {
      await expect(
        createPendingBooking(input({ dateKey: dateKeyFor(4), startHour: 9, hours: 1, quantity }))
      ).rejects.toBeInstanceOf(BookingValidationError);
    }
  });

  it("rejects more jet skis than the fleet owns", async () => {
    await expect(
      createPendingBooking(
        input({ dateKey: dateKeyFor(5), startHour: 9, hours: 1, quantity: FLEET_SIZE + 1 })
      )
    ).rejects.toBeInstanceOf(BookingValidationError);
  });

  it("caps on the fleet size alone, with no arbitrary ceiling above it", async () => {
    // A wildly oversized request is still refused, but by the fleet check --
    // so growing the fleet past any hard-coded number just works.
    await expect(
      createPendingBooking(input({ dateKey: dateKeyFor(5), startHour: 9, hours: 1, quantity: 500 }))
    ).rejects.toThrowError(new RegExp(`only have ${FLEET_SIZE} jet ski`));
  });
});

describe("capacity-based availability", () => {
  it("lets separate bookings share a slot until the fleet runs out", async () => {
    const slot = { dateKey: dateKeyFor(6), startHour: 10, hours: 2 };
    const first = await createPendingBooking(input({ ...slot, quantity: 2 }));
    const second = await createPendingBooking(input({ ...slot, quantity: 1 }));
    expect(first.id).not.toBe(second.id);

    // All three units are now committed for 10:00-12:00.
    await expect(createPendingBooking(input({ ...slot, quantity: 1 }))).rejects.toBeInstanceOf(
      BookingConflictError
    );
  });

  it("rejects a group that does not fit in what is left", async () => {
    const slot = { dateKey: dateKeyFor(7), startHour: 10, hours: 2 };
    await createPendingBooking(input({ ...slot, quantity: 2 }));
    // Only one unit is free, so a two-ski group cannot fit...
    await expect(createPendingBooking(input({ ...slot, quantity: 2 }))).rejects.toBeInstanceOf(
      BookingConflictError
    );
    // ...but a single ski still can.
    const solo = await createPendingBooking(input({ ...slot, quantity: 1 }));
    expect(solo.quantity).toBe(1);
  });

  it("counts capacity against partial overlaps, not just identical slots", async () => {
    // 10:00-13:00 takes 2 of 3 units; 12:00-14:00 overlaps by an hour.
    await createPendingBooking(
      input({ dateKey: dateKeyFor(8), startHour: 10, hours: 3, quantity: 2 })
    );
    await expect(
      createPendingBooking(input({ dateKey: dateKeyFor(8), startHour: 12, hours: 2, quantity: 2 }))
    ).rejects.toBeInstanceOf(BookingConflictError);
    const fits = await createPendingBooking(
      input({ dateKey: dateKeyFor(8), startHour: 12, hours: 2, quantity: 1 })
    );
    expect(fits.quantity).toBe(1);
  });

  it("reports unit count and per-interval quantities in day availability", async () => {
    const dateKey = dateKeyFor(9);
    await createPendingBooking(input({ dateKey, startHour: 10, hours: 2, quantity: 2 }));
    const day = await getDayAvailability(jetSki.id, dateKey);
    expect(day.unitCount).toBe(FLEET_SIZE);
    expect(day.busy).toEqual([{ startHour: 10, endHour: 12, quantity: 2 }]);
  });
});

describe("peakUsage", () => {
  const at = (h: number) => new Date(Date.UTC(2035, 0, 1, h));

  it("sums overlapping bookings and reports the busiest instant", () => {
    const intervals = [
      { startTime: at(10), endTime: at(12), quantity: 2 },
      { startTime: at(11), endTime: at(13), quantity: 1 },
    ];
    // 11:00-12:00 is the peak: both bookings are live.
    expect(peakUsage(intervals, at(10), at(13))).toBe(3);
    // Looking only at 12:00-13:00 sees just the second booking.
    expect(peakUsage(intervals, at(12), at(13))).toBe(1);
  });

  it("ignores intervals that merely touch the window", () => {
    const intervals = [{ startTime: at(9), endTime: at(10), quantity: 3 }];
    expect(peakUsage(intervals, at(10), at(12))).toBe(0);
  });
});
