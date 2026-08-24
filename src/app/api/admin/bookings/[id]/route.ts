import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { cancelBooking, completeBooking, BookingValidationError } from "@/lib/booking";
import { BookingStatus } from "@/lib/constants";
import { sendBookingCancellation } from "@/lib/email";
import { jsonError, readJson, unauthorized } from "../../_lib";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdminSession())) return unauthorized();
  const { id } = await params;

  const body = await readJson(req);
  if (!body) return jsonError("Invalid JSON body.");
  const action = body.action;
  if (action !== "complete" && action !== "cancel") {
    return jsonError('action must be "complete" or "cancel".');
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { jetSki: true },
  });
  if (!booking) return jsonError("Booking not found.", 404);

  // Optional note shown to the customer ("thunderstorm forecast", etc.).
  const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : undefined;

  if (action === "complete" && booking.status !== BookingStatus.CONFIRMED) {
    return jsonError(
      `Only CONFIRMED bookings can be marked completed (this one is ${booking.status}).`
    );
  }
  if (
    action === "cancel" &&
    booking.status !== BookingStatus.PENDING &&
    booking.status !== BookingStatus.CONFIRMED
  ) {
    return jsonError(
      `Only PENDING or CONFIRMED bookings can be cancelled (this one is ${booking.status}).`
    );
  }

  try {
    if (action === "complete") {
      const updated = await completeBooking(id);
      return NextResponse.json({ ok: true, booking: updated });
    }

    const updated = await cancelBooking(id);
    // A cancellation from this side is the business cancelling, so the customer
    // is told their deposit is NOT forfeited. Without this they were never
    // notified at all.
    await sendBookingCancellation(updated, booking.jetSki, "business", reason);
    return NextResponse.json({ ok: true, booking: updated });
  } catch (err) {
    if (err instanceof BookingValidationError) return jsonError(err.message, 409);
    throw err;
  }
}
