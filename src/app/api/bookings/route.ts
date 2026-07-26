import { NextResponse } from "next/server";
import {
  createPendingBooking,
  BookingConflictError,
  BookingValidationError,
} from "@/lib/booking";
import { DurationType, RidingOption } from "@/lib/constants";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = rateLimit(`bookings:${clientIp(req)}`, 15, 600_000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const jetSkiId = typeof b.jetSkiId === "string" ? b.jetSkiId : "";
  const dateKey = typeof b.dateKey === "string" ? b.dateKey : "";
  const startHour = typeof b.startHour === "number" ? b.startHour : NaN;
  const hours = typeof b.hours === "number" ? b.hours : NaN;
  const durationType = typeof b.durationType === "string" ? b.durationType : "";
  const customerName = typeof b.customerName === "string" ? b.customerName : "";
  const email = typeof b.email === "string" ? b.email : "";
  const phone = typeof b.phone === "string" ? b.phone : "";
  const ridingOption =
    b.ridingOption === RidingOption.FREE_RANGE
      ? RidingOption.FREE_RANGE
      : RidingOption.DESIGNATED;

  if (
    !jetSkiId ||
    !dateKey ||
    !Number.isFinite(startHour) ||
    !Number.isFinite(hours) ||
    !Object.values(DurationType).includes(durationType as DurationType)
  ) {
    return NextResponse.json({ error: "Missing or invalid booking fields." }, { status: 400 });
  }

  try {
    const booking = await createPendingBooking({
      jetSkiId,
      dateKey,
      startHour,
      durationType: durationType as DurationType,
      hours,
      customerName,
      email,
      phone,
      ridingOption,
    });
    return NextResponse.json(
      {
        bookingId: booking.id,
        expiresAt: booking.expiresAt,
        totalPrice: booking.totalPrice,
        depositAmount: booking.depositAmount,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof BookingConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof BookingValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("POST /api/bookings failed:", err);
    return NextResponse.json({ error: "Something went wrong creating your booking." }, { status: 500 });
  }
}
