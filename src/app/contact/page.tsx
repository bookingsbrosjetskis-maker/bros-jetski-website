import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import {
  SITE_ADDRESS,
  SITE_HOURS,
  SITE_NAME,
  SITE_PHONE,
  SITE_INSTAGRAM,
  SITE_TIKTOK,
} from "@/lib/constants";
import { Card, Container } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import ContactForm from "@/components/ContactForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact",
  description: "Find us at Blair Boat Launch in Ottawa, call, or send us a message.",
};

type ContactInfo = {
  name: string;
  address: string;
  phone: string;
  instagram?: string;
  tiktok?: string;
  hours: { days: string; hours: string }[];
};

export default async function ContactPage() {
  const row = await prisma.siteContent.findUnique({
    where: { key: "contact-info" },
  });

  let info: ContactInfo | null = null;
  if (row) {
    try {
      info = JSON.parse(row.json) as ContactInfo;
    } catch {
      info = null;
    }
  }

  // Fall back to site constants if the SiteContent row is missing.
  const name = info?.name ?? SITE_NAME;
  const address = info?.address ?? SITE_ADDRESS;
  const phone = info?.phone ?? SITE_PHONE;
  const instagram = info?.instagram ?? SITE_INSTAGRAM.handle;
  const tiktok = info?.tiktok ?? SITE_TIKTOK.handle;
  const hours = info?.hours ?? [{ days: "Monday to Sunday", hours: SITE_HOURS }];

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Talk to a real person"
        subtitle="Questions about requirements, group bookings, or the weather forecast? Call during our hours or send a message and we will reply within a day."
      />
      <Container className="py-12 sm:py-16">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Info column */}
        <Reveal className="space-y-6">
          {/* Real embedded map */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-low sm:aspect-[16/10]">
            <iframe
              src="https://www.google.com/maps?q=Blair+Boat+Launch,+Ottawa,+Ontario&output=embed"
              title={`Map to ${name} at ${address}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 h-full w-full border-0"
            />
          </div>
          <Card className="divide-y divide-outline-variant/50">
            <div className="flex items-start gap-4 p-5">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan/10 ring-1 ring-cyan/30">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 stroke-cyan"
                  fill="none"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 21s-7-6.6-7-11.5A7 7 0 0119 9.5C19 14.4 12 21 12 21z M12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{name}</p>
                <p className="mt-0.5 text-sm text-ink-muted">{address}</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-5">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan/10 ring-1 ring-cyan/30">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 stroke-cyan"
                  fill="none"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 4h4l2 5-2.5 1.5a12 12 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Phone</p>
                <a
                  href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                  className="mt-0.5 block text-sm text-cyan-soft hover:underline"
                >
                  {phone}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4 p-5">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan/10 ring-1 ring-cyan/30">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5 stroke-cyan"
                  fill="none"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Follow us</p>
                <a
                  href={SITE_INSTAGRAM.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block text-sm text-cyan-soft hover:underline"
                >
                  Instagram @{instagram}
                </a>
                <a
                  href={SITE_TIKTOK.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block text-sm text-cyan-soft hover:underline"
                >
                  TikTok @{tiktok}
                </a>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink">
              Hours
            </h2>
            <table className="mt-3 w-full text-sm">
              <tbody className="divide-y divide-outline-variant/50">
                {hours.map((h) => (
                  <tr key={h.days}>
                    <td className="py-2 pr-4 text-ink-muted">{h.days}</td>
                    <td className="py-2 text-right font-medium text-ink">
                      {h.hours}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </Reveal>

        {/* Form column */}
        <Reveal>
          <Card className="h-fit p-6 sm:p-8">
            <h2 className="text-lg font-bold text-ink">
              Send us a message
            </h2>
            <p className="mb-6 mt-1 text-sm text-ink-muted">
              We answer every message within one business day.
            </p>
            <ContactForm />
          </Card>
        </Reveal>
      </div>
      </Container>
    </>
  );
}
