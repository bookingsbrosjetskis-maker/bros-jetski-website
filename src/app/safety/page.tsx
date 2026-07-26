import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { SITE_PHONE } from "@/lib/constants";
import { ButtonLink, Container } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Safety & FAQ",
  description:
    "Licensing requirements, what's included, weather policy, and everything else you need to know before you ride.",
};

type FaqItem = { q: string; a: string };
type FaqSection = { heading: string; items: FaqItem[] };
type SafetyFaq = { title: string; intro: string; sections: FaqSection[] };

export default async function SafetyPage() {
  const row = await prisma.siteContent.findUnique({
    where: { key: "safety-faq" },
  });

  let content: SafetyFaq | null = null;
  if (row) {
    try {
      content = JSON.parse(row.json) as SafetyFaq;
    } catch {
      content = null;
    }
  }

  if (!content) {
    return (
      <>
        <PageHero eyebrow="Before you ride" title="Safety & FAQ" />
        <Container className="py-16 text-center">
          <p className="mx-auto max-w-md text-ink-muted">
            This page is being updated. In the meantime, call us at {SITE_PHONE}{" "}
            with any questions. A real person picks up during our hours, 9:00 AM
            to sunset.
          </p>
          <ButtonLink href="/contact" variant="secondary" className="mt-8">
            Contact us
          </ButtonLink>
        </Container>
      </>
    );
  }

  return (
    <>
      <PageHero eyebrow="Before you ride" title={content.title} subtitle={content.intro} />
      <Container className="py-12 sm:py-16">
        <div className="space-y-10">
          {content.sections.map((section) => (
            <Reveal key={section.heading}>
              <section>
                <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-ink">
                  <span className="h-6 w-1.5 rounded-full bg-cyan" />
                  {section.heading}
                </h2>
                <div className="divide-y divide-outline-variant/50 overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-mid shadow-lg shadow-black/40">
                  {section.items.map((item) => (
                    <details key={item.q} className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-high/60 sm:px-6 [&::-webkit-details-marker]:hidden">
                        {item.q}
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-high transition-colors group-open:bg-cyan">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4 stroke-cyan transition-all duration-300 group-open:rotate-180 group-open:stroke-surface-lowest"
                            fill="none"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </span>
                      </summary>
                      <p className="px-5 pb-5 text-sm leading-relaxed text-ink-muted sm:px-6">
                        {item.a}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="animated-gradient relative mt-14 overflow-hidden rounded-2xl p-8 text-center">
            <div className="animate-pulse-glow pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan/20 blur-2xl" />
            <h2 className="relative text-xl font-bold text-ink">Ready when you are</h2>
            <p className="relative mx-auto mt-2 max-w-md text-sm text-ink-muted">
              Requirements sorted? Lock in a time on the Ottawa River. Booking
              takes about two minutes.
            </p>
            <ButtonLink href="/book" className="relative mt-6">
              Book your ride
            </ButtonLink>
          </div>
        </Reveal>
      </Container>
    </>
  );
}
