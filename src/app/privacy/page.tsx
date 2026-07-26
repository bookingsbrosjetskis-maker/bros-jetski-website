import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { LegalSection } from "@/components/LegalDoc";
import { SITE_NAME, SITE_PHONE, SITE_ADDRESS } from "@/lib/constants";

// NOTE (developer): This is a working template reflecting how the site actually
// handles data. Have it reviewed by legal counsel (and check PIPEDA obligations)
// before relying on it, and update the "last updated" date when practices change.
export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE_NAME} collects, uses, and protects your personal information.`,
};

const LAST_UPDATED = "July 2026";

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        subtitle={`How ${SITE_NAME} collects, uses, and protects your personal information.`}
      />
      <Container className="max-w-3xl space-y-8 py-12 sm:py-16">
        <p className="text-xs uppercase tracking-wide text-outline">Last updated: {LAST_UPDATED}</p>

        <LegalSection heading="1. Overview">
          <p>
            {SITE_NAME} (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;) respects your
            privacy. This policy explains what personal information we collect when you use this
            website and rent from us, why we collect it, and how we protect it. We handle personal
            information in accordance with applicable Canadian privacy law, including PIPEDA.
          </p>
        </LegalSection>

        <LegalSection heading="2. Information we collect">
          <ul>
            <li>
              <strong>Booking details:</strong> your name, email address, and phone number, along
              with your rental date, time, and riding option.
            </li>
            <li>
              <strong>Waiver and safety checklist:</strong> your typed signature, acknowledgements,
              and the emergency-contact details you provide.
            </li>
            <li>
              <strong>Messages:</strong> the name, email, and message you submit through our contact,
              corporate, or gift-card forms, and any reviews you choose to submit.
            </li>
            <li>
              <strong>Payment information:</strong> card payments are processed by Stripe. We receive
              a confirmation of payment but do not collect or store your full card number.
            </li>
          </ul>
        </LegalSection>

        <LegalSection heading="3. How we use your information">
          <ul>
            <li>To create, confirm, and manage your booking and to send you booking-related emails.</li>
            <li>To meet safety and regulatory requirements (waiver and rental safety checklist).</li>
            <li>To respond to your enquiries and to operate and improve our services.</li>
            <li>To process refunds and cancellations, and to prevent fraud and misuse.</li>
          </ul>
        </LegalSection>

        <LegalSection heading="4. Sharing and service providers">
          <p>
            We do not sell your personal information. We share it only with service providers who
            help us operate, such as our payment processor (Stripe) and our email provider, and only
            as needed to deliver the service. We may disclose information where required by law.
          </p>
        </LegalSection>

        <LegalSection heading="5. Retention and security">
          <p>
            We keep booking, waiver, and checklist records for as long as necessary to operate the
            business and meet legal and insurance obligations, then delete or anonymize them. We use
            reasonable technical and organizational safeguards to protect your information, though no
            method of transmission or storage is completely secure.
          </p>
        </LegalSection>

        <LegalSection heading="6. Your rights">
          <p>
            Subject to applicable law, you may request access to the personal information we hold
            about you, ask us to correct it, or request its deletion. To make a request, contact us
            using the details below.
          </p>
        </LegalSection>

        <LegalSection heading="7. Contact">
          <p>
            For any privacy question or request, call {SITE_PHONE} or use our{" "}
            <a href="/contact">contact page</a>. {SITE_NAME}, {SITE_ADDRESS}.
          </p>
        </LegalSection>
      </Container>
    </>
  );
}
