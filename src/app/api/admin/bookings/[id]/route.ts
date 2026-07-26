import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { cancelBooking, completeBooking, BookingValidationError } from "@/lib/booking";
import { BookingStatus } from "@/lib/constants";
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

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return jsonError("Booking not found.", 404);

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
    const updated =
      action === "complete" ? await completeBooking(id) : await cancelBooking(id);
    return NextResponse.json({ ok: true, booking: updated });
  } catch (err) {
    if (err instanceof BookingValidationError) return jsonError(err.message, 409);
    throw err;
  }
}
