import Link from "next/link";
import type { Metadata } from "next";
import type { Booking, JetSki } from "@prisma/client";
import { prisma } from "@/lib/db";
import { confirmBooking } from "@/lib/booking";
import {
  sendBookingConfirmation,
  sendChecklistLink,
  sendAdminBookingNotification,
} from "@/lib/email";
import { ensureChecklist } from "@/lib/checklist";
import { isMockPayments, verifyPaidSession } from "@/lib/stripe";
import { formatBookingRange, formatCAD, formatDate, toDateKey } from "@/lib/format";
import { RidingOption, SITE_ADDRESS, SITE_NAME, SITE_PHONE } from "@/lib/constants";
import { ButtonLink, Card, Container } from "@/components/ui";

export const metadata: Metadata = { title: `Booking confirmed | ${SITE_NAME}` };
export const dynamic = "force-dynamic";

function FailureState({ retryHref, message }: { retryHref: string; message: string }) {
  return (
    <div className="pb-16 pt-24 sm:pt-28">
      <Container className="max-w-lg">
        <Card className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 ring-1 ring-inset ring-amber-400/30">
            <svg viewBox="0 0 24 24" className="h-7 w-7 fill-amber-400" aria-hidden>
              <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 5a1.25 1.25 0 011.25 1.25v4.5a1.25 1.25 0 01-2.5 0v-4.5A1.25 1.25 0 0112 7zm0 10.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-ink">We couldn&apos;t confirm this booking</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">{message}</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href={retryHref}>Try booking again</ButtonLink>
            <ButtonLink href="/" variant="outline">
              Back to home
            </ButtonLink>
          </div>
          <p className="mt-6 text-xs text-outline">
            Already paid? Call us at {SITE_PHONE} and we&apos;ll sort it out.
          </p>
        </Card>
      </Container>
    </div>
  );
}

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const bookingId = typeof sp.booking_id === "string" ? sp.booking_id : null;
  const sessionId = typeof sp.session_id === "string" ? sp.session_id : null;
  const mock = sp.mock === "1";

  if (!bookingId) {
    return (
      <FailureState
        retryHref="/"
        message="This confirmation link is missing its booking reference."
      />
    );
  }

  const existing = await prisma.booking.findUnique({ where: { id: bookingId } });
  const retryHref = existing ? `/book/${existing.jetSkiId}` : "/";

  let booking: Booking | null = null;
  let confirmedNow = false;

  try {
    if (mock) {
      // Only honor the mock shortcut when payments are actually mocked.
      if (!isMockPayments()) {
        return (
          <FailureState
            retryHref={retryHref}
            message="This payment could not be verified. Please try booking again."
          />
        );
      }
      ({ booking, confirmedNow } = await confirmBooking(bookingId));
    } else if (sessionId) {
      const paidBookingId = await verifyPaidSession(sessionId);
      if (paidBookingId !== bookingId) {
        return (
          <FailureState
            retryHref={retryHref}
            message="We couldn't verify your payment with Stripe. If you were charged, contact us and we'll make it right."
          />
        );
      }
      ({ booking, confirmedNow } = await confirmBooking(bookingId, sessionId));
    } else {
      return (
        <FailureState
          retryHref={retryHref}
          message="This confirmation link is missing its payment reference."
        />
      );
    }
  } catch {
    return (
      <FailureState
        retryHref={retryHref}
        message="This booking could not be confirmed. The hold may have expired, or the slot may have been re-booked. If you were charged, contact us for a full refund."
      />
    );
  }

  const jetSki: JetSki | null = await prisma.jetSki.findUnique({
    where: { id: booking.jetSkiId },
  });
  if (!jetSki) {
    return (
      <FailureState retryHref="/" message="The jet ski for this booking no longer exists." />
    );
  }

  if (confirmedNow) {
    await sendBookingConfirmation(booking, jetSki);
    await sendAdminBookingNotification(booking, jetSki);
    const checklist = await ensureChecklist(booking);
    await sendChecklistLink(booking, checklist.token);
  }

  const timeRange = formatBookingRange(booking.startTime, booking.endTime);
  const isFreeRange = booking.ridingOption === RidingOption.FREE_RANGE;

  const icsHref = `/api/bookings/${booking.id}/ics?email=${encodeURIComponent(booking.email)}`;

  return (
    <div className="pb-12 pt-24 sm:pb-16 sm:pt-28">
      <Container className="max-w-xl">
        <Card className="overflow-hidden">
          <div className="animated-gradient relative overflow-hidden px-6 py-10 text-center text-ink sm:px-8">
            <div className="animate-pulse-glow pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan/25 blur-2xl" />
            <div className="animate-pop-in glow-cyan relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan/10 ring-2 ring-cyan/50">
              <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" aria-hidden>
                <path
                  d="M5 12.5l4 4 10-10"
                  className="draw-check"
                  stroke="#00f1fe"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="animate-fade-up relative text-2xl font-bold [animation-delay:0.2s]">
              You&apos;re booked!
            </h1>
            <p className="animate-fade-up relative mt-1 text-sm text-ink-muted [animation-delay:0.3s]">
              Paid in full. A confirmation email is on its way.
            </p>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            <dl className="space-y-2.5 text-sm">
              {(
                [
                  ["Reference", booking.id],
                  ["Jet ski", jetSki.name],
                  ["Date", formatDate(toDateKey(booking.startTime))],
                  ["Time", timeRange],
                  ["Riding", isFreeRange ? "Free range" : "Designated riding area"],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="shrink-0 text-outline">{k}</dt>
                  <dd className="break-all text-right font-medium text-ink">{v}</dd>
                </div>
              ))}
              <div className="border-t border-outline-variant/50 pt-2.5">
                <div className="flex justify-between gap-4">
                  <dt className="text-outline">Paid in full</dt>
                  <dd className="font-semibold text-emerald-300">{formatCAD(booking.totalPrice)}</dd>
                </div>
              </div>
            </dl>

            {isFreeRange && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-200">
                Remember: a $1,000 refundable security deposit is due in person before you launch.
              </div>
            )}

            <div className="rounded-xl border border-cyan/20 bg-surface-high p-4 text-sm leading-relaxed text-ink-muted">
              <p className="font-semibold text-ink">What to bring</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Pleasure Craft Operator Card (PCOC) or complete our rental safety checklist</li>
                <li>Government-issued photo ID</li>
                <li>Swimwear, towel, and sunscreen. Life jackets and safety kit are included</li>
              </ul>
              <p className="mt-3">
                Please arrive 15 minutes early for the safety briefing at {SITE_ADDRESS}.
              </p>
            </div>

            <p className="text-center text-sm text-ink-muted">
              Check your email ({booking.email}) for your confirmation. Questions? Call{" "}
              {SITE_PHONE}.
            </p>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href={icsHref}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-2.5 text-sm font-semibold text-ink-muted transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan hover:text-cyan"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M8 2v4M16 2v4M3 9h18M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM12 12v5M9.5 14.5h5" />
                </svg>
                Add to calendar
              </a>
              <ButtonLink href="/">Back to home</ButtonLink>
            </div>
          </div>
        </Card>
        <p className="mt-4 text-center text-xs text-outline">
          <Link href="/my-booking" className="hover:text-cyan">
            Manage this booking
          </Link>{" "}
          ·{" "}
          <Link href={`/book/${jetSki.id}`} className="hover:text-cyan">
            Book another ride
          </Link>
        </p>
      </Container>
    </div>
  );
}
