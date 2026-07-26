import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BookingStatus } from "@/lib/constants";
import { createCheckoutUrl } from "@/lib/stripe";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const limited = rateLimit(`checkout:${clientIp(req)}`, 20, 600_000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const bookingId =
    typeof (body as Record<string, unknown>).bookingId === "string"
      ? ((body as Record<string, unknown>).bookingId as string)
      : "";
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId is required." }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { waiver: true, jetSki: true },
  });
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  // Waiver-before-payment is a hard business rule.
  if (!booking.waiver) {
    return NextResponse.json(
      { error: "The liability waiver must be signed before payment." },
      { status: 403 }
    );
  }

  if (booking.status !== BookingStatus.PENDING) {
    return NextResponse.json(
      { error: `This booking is ${booking.status.toLowerCase()} and cannot be paid for.` },
      { status: 409 }
    );
  }
  if (booking.expiresAt && booking.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "This booking hold has expired. Please start again." },
      { status: 410 }
    );
  }

  try {
    const { url, stripeSessionId } = await createCheckoutUrl(booking, booking.jetSki);
    if (stripeSessionId) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { stripeSessionId },
      });
    }
    return NextResponse.json({ url });
  } catch (err) {
    console.error("POST /api/checkout failed:", err);
    return NextResponse.json({ error: "Could not start the payment session." }, { status: 500 });
  }
}
