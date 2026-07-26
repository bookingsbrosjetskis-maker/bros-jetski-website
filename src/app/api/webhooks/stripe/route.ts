import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { confirmBooking } from "@/lib/booking";
import {
  sendBookingConfirmation,
  sendChecklistLink,
  sendAdminBookingNotification,
} from "@/lib/email";
import { ensureChecklist } from "@/lib/checklist";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    if (session.payment_status === "paid" && bookingId) {
      try {
        const { booking, confirmedNow } = await confirmBooking(bookingId, session.id);
        if (confirmedNow) {
          const jetSki = await prisma.jetSki.findUnique({ where: { id: booking.jetSkiId } });
          if (jetSki) {
            await sendBookingConfirmation(booking, jetSki);
            await sendAdminBookingNotification(booking, jetSki);
            const checklist = await ensureChecklist(booking);
            await sendChecklistLink(booking, checklist.token);
          }
        }
      } catch (err) {
        // Log but still 200: retrying won't fix a cancelled/re-booked slot,
        // and Stripe retry storms would just repeat the same failure.
        console.error(`Webhook: failed to confirm booking ${bookingId}:`, err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
