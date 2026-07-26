import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cancelBooking } from "@/lib/booking";
import { sendBookingCancellation } from "@/lib/email";
import { BookingStatus, CANCEL_CUTOFF_HOURS, SITE_PHONE } from "@/lib/constants";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const NOT_FOUND_MSG = "No booking found with that reference and email.";

/** Customer self-service cancellation. Everything is re-validated server-side:
 * reference + email match (404, no existence leak), cancellable status (409),
 * and the 12-hour cutoff (403). */
export async function POST(req: Request) {
  const limited = rateLimit(`cancel:${clientIp(req)}`, 10, 600_000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

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
    include: { jetSki: true },
  });

  if (!booking || booking.email.toLowerCase() !== email) {
    return NextResponse.json({ error: NOT_FOUND_MSG }, { status: 404 });
  }

  if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
    return NextResponse.json(
      { error: `This booking is ${booking.status.toLowerCase()} and can no longer be cancelled online.` },
      { status: 409 }
    );
  }

  if (booking.startTime.getTime() - Date.now() < CANCEL_CUTOFF_HOURS * 3600_000) {
    return NextResponse.json(
      {
        error: `Online cancellation closes ${CANCEL_CUTOFF_HOURS} hours before your rental. Call us at ${SITE_PHONE} and we'll do our best to help.`,
      },
      { status: 403 }
    );
  }

  const cancelled = await cancelBooking(booking.id);

  await sendBookingCancellation(cancelled, booking.jetSki);

  return NextResponse.json({ ok: true });
}
