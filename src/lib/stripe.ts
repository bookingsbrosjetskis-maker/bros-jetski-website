import Stripe from "stripe";
import type { Booking, JetSki } from "@prisma/client";
import { formatBookingRange, formatCAD, formatDate, toDateKey } from "@/lib/format";
import { CANCEL_CUTOFF_HOURS } from "@/lib/constants";

/** True when checkout should be simulated (instant redirect to the success
 * page) instead of hitting Stripe. Mock mode is allowed only when explicitly
 * opted in via MOCK_PAYMENTS="true", or in local development when no key is set.
 * In production, a missing STRIPE_SECRET_KEY without MOCK_PAYMENTS="true" is a
 * hard error — we refuse to silently confirm bookings for free (fail closed). */
export function isMockPayments(): boolean {
  if (process.env.MOCK_PAYMENTS === "true") return true;
  if (process.env.STRIPE_SECRET_KEY) return false;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      'Payments misconfigured: STRIPE_SECRET_KEY is not set and MOCK_PAYMENTS is not "true". ' +
        'Set STRIPE_SECRET_KEY to take real payments, or set MOCK_PAYMENTS="true" to explicitly allow mock checkout.'
    );
  }
  // Local development convenience: mock when no key is configured.
  return true;
}

let stripeClient: Stripe | null = null;
export function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

/** Stripe line-item description: what this charge is, and what is still owed. */
function depositDescription(booking: Booking): string {
  const when = `${formatDate(toDateKey(booking.startTime))}, ${formatBookingRange(booking.startTime, booking.endTime)}`;
  const balance =
    booking.balanceDue > 0
      ? ` Deposit goes toward your ${formatCAD(booking.totalPrice)} rental; ${formatCAD(booking.balanceDue)} balance due at the dock by card or cash.`
      : "";
  const policy = ` Refundable if you cancel ${CANCEL_CUTOFF_HOURS}+ hours ahead.`;
  return `${when}.${balance}${policy}`;
}

/**
 * Create the Checkout Session for a PENDING booking and return the URL to
 * redirect the customer to. Only the booking deposit ($50 per jet ski) is
 * charged online; the balance is collected at the dock by card or cash. In
 * mock mode this is the success URL directly (the success page treats mock=1
 * as a paid session).
 */
export async function createCheckoutUrl(
  booking: Booking,
  jetSki: JetSki
): Promise<{ url: string; stripeSessionId: string | null }> {
  const successUrl = `${baseUrl()}/book/success?booking_id=${booking.id}`;

  if (isMockPayments()) {
    return { url: `${successUrl}&mock=1`, stripeSessionId: null };
  }

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    currency: "cad",
    customer_email: booking.email,
    // Stripe sends its own automatic payment receipt to this address (enable
    // "Successful payments" under Customer emails in the Stripe dashboard).
    payment_intent_data: { receipt_email: booking.email },
    line_items: [
      {
        // One line for the whole deposit rather than N x $50: the amount is
        // already clamped to the rental total, so this can never round oddly.
        quantity: 1,
        price_data: {
          currency: "cad",
          unit_amount: booking.depositPaid,
          product_data: {
            name: `Booking deposit — ${booking.quantity} ${jetSki.name}${booking.quantity === 1 ? "" : "s"}`,
            description: depositDescription(booking),
          },
        },
      },
    ],
    metadata: { bookingId: booking.id },
    // Stripe holds the slot only as long as the booking hold; align expiry.
    expires_at: booking.expiresAt
      ? Math.max(Math.floor(booking.expiresAt.getTime() / 1000), Math.floor(Date.now() / 1000) + 30 * 60)
      : undefined,
    success_url: `${successUrl}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl()}/book/${booking.jetSkiId}?cancelled=1`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url, stripeSessionId: session.id };
}

/** Server-side verification used by the success page (works without the
 * Stripe CLI/webhooks in local dev). Returns the bookingId if paid. */
export async function verifyPaidSession(sessionId: string): Promise<string | null> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status === "paid" && session.metadata?.bookingId) {
    return session.metadata.bookingId;
  }
  return null;
}
