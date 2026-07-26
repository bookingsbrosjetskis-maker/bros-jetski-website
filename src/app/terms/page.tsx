import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { LegalSection } from "@/components/LegalDoc";
import { SITE_NAME, SITE_PHONE, SITE_ADDRESS, CANCEL_CUTOFF_HOURS } from "@/lib/constants";

// NOTE (developer): This is a working template reflecting the business's actual
// practices. Have it reviewed by legal counsel before relying on it, and update
// the "last updated" date whenever the terms change.
export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms governing jet ski rentals and bookings with ${SITE_NAME}.`,
};

const LAST_UPDATED = "July 2026";

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Terms of Service"
        subtitle={`Please read these terms carefully before booking. By reserving a rental with ${SITE_NAME}, you agree to them.`}
      />
      <Container className="max-w-3xl space-y-8 py-12 sm:py-16">
        <p className="text-xs uppercase tracking-wide text-outline">Last updated: {LAST_UPDATED}</p>

        <LegalSection heading="1. Who we are">
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) govern your use of this website and the
            rental of personal watercraft from {SITE_NAME}, operating at {SITE_ADDRESS}. In these
            Terms, &ldquo;we,&rdquo; &ldquo;us,&rdquo; and &ldquo;our&rdquo; refer to {SITE_NAME},
            and &ldquo;you&rdquo; refers to the person booking or renting.
          </p>
        </LegalSection>

        <LegalSection heading="2. Eligibility and operator requirements">
          <ul>
            <li>You must be at least 18 years old to rent and operate a jet ski from us.</li>
            <li>
              The operator must hold a valid Pleasure Craft Operator Card (PCOC) or complete a
              Rental Boat Safety Checklist with us before launch, as permitted by Transport Canada.
            </li>
            <li>Valid government-issued photo identification is required for the renter.</li>
            <li>
              You must not operate a jet ski while under the influence of alcohol, cannabis, or any
              other impairing substance.
            </li>
          </ul>
        </LegalSection>

        <LegalSection heading="3. Bookings and payment">
          <ul>
            <li>All prices are in Canadian dollars (CAD) and are charged in full at the time of booking.</li>
            <li>Payments are processed by our third-party payment provider (Stripe). We do not store your full card details.</li>
            <li>
              A booking is confirmed only once payment is completed. Unpaid holds are released
              automatically after a short period.
            </li>
            <li>
              Free-range riding (outside our designated area) requires a refundable $1,000 security
              deposit per jet ski, collected in person before launch and returned in full once the
              jet ski is returned undamaged.
            </li>
          </ul>
        </LegalSection>

        <LegalSection heading="4. Cancellations, changes, and weather">
          <ul>
            <li>
              You may cancel online up to {CANCEL_CUTOFF_HOURS} hours before your rental start time
              for a full refund. Within {CANCEL_CUTOFF_HOURS} hours, contact us at {SITE_PHONE}.
            </li>
            <li>
              We may delay or cancel rentals for thunderstorms, lightning, high winds, severe
              weather warnings, or any conditions our staff consider unsafe. If we cancel for unsafe
              weather, you may reschedule at no extra cost or receive a full refund.
            </li>
            <li>
              If conditions are safe but you choose not to attend, standard cancellation terms apply.
            </li>
          </ul>
        </LegalSection>

        <LegalSection heading="5. Safety, waiver, and responsible use">
          <p>
            Every rider must attend the safety briefing, wear the provided Transport Canada approved
            life jacket at all times on the water, and follow all applicable boating laws, local
            rules, and staff instructions. Before riding, the renter must sign our liability waiver
            and rental agreement. You are responsible for operating the jet ski safely and for the
            conduct of your passengers.
          </p>
        </LegalSection>

        <LegalSection heading="6. Damage, loss, and liability">
          <ul>
            <li>
              You are responsible for loss of or damage to the jet ski and equipment during your
              rental caused by misuse, negligence, or violation of these Terms.
            </li>
            <li>
              To the fullest extent permitted by law, our liability is limited to the amount you paid
              for the rental. We are not liable for indirect or consequential losses.
            </li>
            <li>Jet ski operation carries inherent risks, which you accept as set out in the signed waiver.</li>
          </ul>
        </LegalSection>

        <LegalSection heading="7. Changes to these Terms">
          <p>
            We may update these Terms from time to time. The version in effect at the time of your
            booking applies to that booking. Continued use of the site after changes constitutes
            acceptance of the updated Terms.
          </p>
        </LegalSection>

        <LegalSection heading="8. Contact">
          <p>
            Questions about these Terms? Call us at {SITE_PHONE} or reach us through our{" "}
            <a href="/contact">contact page</a>. {SITE_NAME}, {SITE_ADDRESS}.
          </p>
        </LegalSection>
      </Container>
    </>
  );
}
