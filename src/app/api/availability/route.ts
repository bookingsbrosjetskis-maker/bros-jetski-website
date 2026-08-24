import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { expireStaleBookings, getDayAvailability } from "@/lib/booking";
import { BookingStatus, OPEN_HOUR, CLOSE_HOUR } from "@/lib/constants";
import { fromDateKey, toDateKey } from "@/lib/format";

export const dynamic = "force-dynamic";

type Busy = { startHour: number; endHour: number; quantity: number };

type DaySummary = {
  blocked: boolean;
  fullyBooked: boolean;
  busy: Busy[];
};

/** True when no hour in [OPEN_HOUR, CLOSE_HOUR) has a spare jet ski. */
function isFullyBooked(busy: Busy[], unitCount: number): boolean {
  for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
    const used = busy
      .filter((b) => b.startHour < h + 1 && b.endHour > h)
      .reduce((sum, b) => sum + b.quantity, 0);
    if (used < unitCount) return false;
  }
  return true;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const jetSkiId = searchParams.get("jetSkiId");
  const month = searchParams.get("month");
  const date = searchParams.get("date");

  if (!jetSkiId) {
    return NextResponse.json({ error: "jetSkiId is required." }, { status: 400 });
  }

  // Single-day mode: ?date=YYYY-MM-DD
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "date must be YYYY-MM-DD." }, { status: 400 });
    }
    const day = await getDayAvailability(jetSkiId, date);
    return NextResponse.json(day);
  }

  // Month mode: ?month=YYYY-MM
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month must be YYYY-MM (or pass date=YYYY-MM-DD)." }, { status: 400 });
  }

  const [year, mon] = month.split("-").map(Number);
  if (mon < 1 || mon > 12) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  }

  const monthStart = fromDateKey(`${month}-01`);
  const nextMonthStart = new Date(Date.UTC(year, mon, 1)); // first day of the following month
  const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();

  await expireStaleBookings();
  const now = new Date();

  const [jetSki, bookings, blocks] = await Promise.all([
    prisma.jetSki.findUnique({ where: { id: jetSkiId }, select: { unitCount: true } }),
    prisma.booking.findMany({
      where: {
        jetSkiId,
        startTime: { lt: nextMonthStart },
        endTime: { gt: monthStart },
        OR: [
          { status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] } },
          { status: BookingStatus.PENDING, expiresAt: { gt: now } },
        ],
      },
      select: { startTime: true, endTime: true, quantity: true },
    }),
    prisma.blockedDate.findMany({
      where: {
        date: { gte: monthStart, lt: nextMonthStart },
        OR: [{ jetSkiId: null }, { jetSkiId }],
      },
      select: { date: true },
    }),
  ]);

  const blockedKeys = new Set(blocks.map((b) => toDateKey(b.date)));
  const unitCount = jetSki?.unitCount ?? 1;

  const days: Record<string, DaySummary> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStart = new Date(monthStart.getTime() + (d - 1) * 24 * 3600_000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600_000);
    const key = toDateKey(dayStart);

    const busy = bookings
      .filter((b) => b.startTime < dayEnd && b.endTime > dayStart)
      .map((b) => ({
        startHour: Math.max(0, (b.startTime.getTime() - dayStart.getTime()) / 3600_000),
        endHour: Math.min(24, (b.endTime.getTime() - dayStart.getTime()) / 3600_000),
        quantity: b.quantity,
      }));

    days[key] = {
      blocked: blockedKeys.has(key),
      fullyBooked: isFullyBooked(busy, unitCount),
      busy,
    };
  }

  return NextResponse.json({ unitCount, days });
}
