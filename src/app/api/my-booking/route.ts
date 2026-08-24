import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BookingStatus, CANCEL_CUTOFF_HOURS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const NOT_FOUND_MSG = "No booking found with that reference and email.";

/** Customer self-service lookup. Requires BOTH the booking reference and the
 * email it was made with; any mismatch returns the same 404 so the endpoint
 * never reveals whether a reference exists. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const bookingId = typeof b.bookingId === "string" ? b.bookingId.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";

  if (!bookingId || !email) {
    return NextResponse.json(
      { error: "Please provide your booking reference and email." },
      { status: 400 }
    );
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { jetSki: true, waiver: { select: { id: true } } },
  });

  if (!booking || booking.email.toLowerCase() !== email) {
    return NextResponse.json({ error: NOT_FOUND_MSG }, { status: 404 });
  }

  const cancellable =
    (booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED) &&
    booking.startTime.getTime() - Date.now() >= CANCEL_CUTOFF_HOURS * 3600_000;

  return NextResponse.json({
    booking: {
      id: booking.id,
      status: booking.status,
      startTime: booking.startTime,
      endTime: booking.endTime,
      hours: booking.hours,
      durationType: booking.durationType,
      quantity: booking.quantity,
      ridingOption: booking.ridingOption,
      totalPrice: booking.totalPrice,
      depositPaid: booking.depositPaid,
      balanceDue: booking.balanceDue,
      securityDeposit: booking.securityDeposit,
      createdAt: booking.createdAt,
      expiresAt: booking.expiresAt,
    },
    jetSki: {
      name: booking.jetSki.name,
      model: booking.jetSki.model,
      imageUrl: booking.jetSki.imageUrl,
      horsepower: booking.jetSki.horsepower,
      seats: booking.jetSki.seats,
    },
    waiverSigned: booking.waiver !== null,
    canCancel: cancellable,
    cancelCutoffHours: CANCEL_CUTOFF_HOURS,
  });
}
