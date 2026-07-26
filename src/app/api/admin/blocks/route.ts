import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { BlockReason, BookingStatus } from "@/lib/constants";
import { fromDateKey, toDateKey } from "@/lib/format";
import { jsonError, readJson, unauthorized } from "../_lib";

export async function GET() {
  if (!(await getAdminSession())) return unauthorized();
  const today = fromDateKey(toDateKey(new Date()));
  const blocks = await prisma.blockedDate.findMany({
    where: { date: { gte: today } },
    include: { jetSki: { select: { id: true, name: true } } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ blocks });
}

export async function POST(req: Request) {
  if (!(await getAdminSession())) return unauthorized();
  const body = await readJson(req);
  if (!body) return jsonError("Invalid JSON body.");

  // jetSkiId: null / "" / undefined all mean "whole fleet".
  const rawSkiId = body.jetSkiId;
  if (rawSkiId !== null && rawSkiId !== undefined && typeof rawSkiId !== "string") {
    return jsonError("jetSkiId must be a string or null.");
  }
  const jetSkiId = typeof rawSkiId === "string" && rawSkiId !== "" ? rawSkiId : null;

  const dateKey = typeof body.date === "string" ? body.date : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return jsonError("Invalid date.");
  const todayKey = toDateKey(new Date());
  if (dateKey < todayKey) return jsonError("The date must be today or later.");

  const reason = typeof body.reason === "string" ? body.reason : "";
  if (!Object.values(BlockReason).includes(reason as BlockReason)) {
    return jsonError("Reason must be MAINTENANCE, WEATHER or OTHER.");
  }
  const note =
    typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

  if (jetSkiId) {
    const ski = await prisma.jetSki.findUnique({ where: { id: jetSkiId } });
    if (!ski) return jsonError("Jet ski not found.", 404);
  }

  const date = fromDateKey(dateKey);
  const duplicate = await prisma.blockedDate.findFirst({ where: { jetSkiId, date } });
  if (duplicate) {
    return jsonError(
      jetSkiId
        ? "That date is already blocked for this unit."
        : "That date is already blocked for the whole fleet.",
      409
    );
  }

  // Warn (but still create) if bookings that currently hold a slot already
  // exist that day for the affected unit(s) — confirmed bookings and live
  // (unexpired) PENDING holds both count, so a hold mid-payment isn't missed.
  const dayEnd = new Date(date.getTime() + 24 * 3600_000);
  const conflicting = await prisma.booking.count({
    where: {
      startTime: { lt: dayEnd },
      endTime: { gt: date },
      ...(jetSkiId ? { jetSkiId } : {}),
      OR: [
        { status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] } },
        { status: BookingStatus.PENDING, expiresAt: { gt: new Date() } },
      ],
    },
  });

  const block = await prisma.blockedDate.create({
    data: { jetSkiId, date, reason, note },
    include: { jetSki: { select: { id: true, name: true } } },
  });

  return NextResponse.json(
    {
      ok: true,
      block,
      ...(conflicting > 0
        ? {
            warning: `Heads up: ${conflicting} confirmed booking(s) already exist on that date for the affected unit(s). The block was still created. Contact the customer(s) to reschedule.`,
          }
        : {}),
    },
    { status: 201 }
  );
}
