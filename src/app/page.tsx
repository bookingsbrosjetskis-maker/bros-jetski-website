import Image from "next/image";
import { prisma } from "@/lib/db";
import { SITE_NAME, SITE_SLOGAN } from "@/lib/constants";
import { ButtonLink, Container, SectionHeading } from "@/components/ui";
import TrustBadges from "@/components/TrustBadges";
import FleetCard from "@/components/FleetCard";
import AutoplayVideo from "@/components/AutoplayVideo";
import ReviewCard from "@/components/ReviewCard";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/Reveal";
import { Marquee } from "@/components/motion/Marquee";
import { WaveDivider } from "@/components/motion/WaveDivider";

export const dynamic = "force-dynamic";

const steps = [
  {
    title: "Pick your date, time, and jet skis",
    text: "Choose an open slot, how long you want to ride, and how many jet skis you need. Bring the whole crew on one booking.",
    icon: <path d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />,
  },
  {
    title: "Sign the waiver online",
    text: "Fill in your details and sign the rental waiver from your phone. No paperwork waiting for you at the launch.",
    icon: <path d="M7 3h10a1 1 0 011 1v16a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM9.5 13.5l2 2 3.5-4M9 7h6" />,
  },
  {
    title: "Pay $50 to book, the rest at the dock",
    text: "A $50 deposit per jet ski holds your slot and comes off your total. Pay the balance by card or cash at Blair Boat Launch, then you are on the Ottawa River.",
    icon: <path d="M3 18c2.5-2 4.5-2 7 0s4.5 2 7 0 3-1.5 4-1M12 4l3 6-3-1-3 1 3-6zM12 9v4" />,
  },
];

const trustPoints = [
  "Sea-Doo Spark Trixx",
  "Beginner friendly",
  "Safety briefing included",
  "Blair Boat Launch, Ottawa",
];

export default async function HomePage() {
  const [ski, recentReviews] = await Promise.all([
    prisma.jetSki.findFirst({ where: { active: true } }),
    prisma.review.findMany({
      where: { approved: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-[88dvh] items-center overflow-hidden bg-surface text-ink [@media(max-height:640px)]:min-h-0">
        {/* Full-bleed background video with photo poster fallback. Respects
            prefers-reduced-motion and offers a play/pause control. */}
        <AutoplayVideo
          src="/videos/hero.mp4"
          poster="/photos/lineup-sunset.jpg"
          label="hero video"
          className="absolute inset-0 h-full w-full object-cover"
          controlClassName="bottom-6 right-6"
        />
        {/* Dark gradient overlay for legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-surface/20" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-surface/85 via-surface/40 to-transparent" />
        {/* cyan glow accents */}
        <div className="animate-pulse-glow pointer-events-none absolute -left-24 bottom-10 h-80 w-80 rounded-full bg-cyan/20 blur-3xl" />

        <Container className="relative z-10 pb-20 pt-32 sm:pb-28 sm:pt-40 [@media(max-height:640px)]:pb-12 [@media(max-height:640px)]:pt-24">
          <div className="max-w-2xl">
            <p className="animate-fade-up font-label mb-4 text-xs font-bold uppercase tracking-[0.1em] text-cyan">
              Blair Boat Launch · Ottawa, Ontario
            </p>
            <h1 className="animate-fade-up text-4xl font-bold leading-[1.03] tracking-tight sm:text-5xl lg:text-7xl [animation-delay:0.1s]">
              Ride the River.{" "}
              <span className="gradient-text">Make Memories.</span>
            </h1>
            <p className="animate-fade-up mt-6 max-w-xl text-lg leading-relaxed text-ink-muted [animation-delay:0.2s]">
              Premium Sea-Doo jet ski rentals on the Ottawa River. Book online in
              minutes, sign the waiver from your phone, and ride the same day.
              Life jackets and all safety gear included with every rental.
            </p>
            <div className="animate-fade-up mt-8 flex flex-col gap-3 sm:flex-row [animation-delay:0.3s]">
              <ButtonLink href="/book" className="px-7 py-3 text-base">
                Book Now
              </ButtonLink>
              <ButtonLink href="/safety" variant="glass" className="px-7 py-3 text-base">
                Safety &amp; requirements
              </ButtonLink>
            </div>
            <div className="animate-fade-up mt-9 flex flex-wrap gap-2.5 [animation-delay:0.4s]">
              {trustPoints.map((chip) => (
                <span
                  key={chip}
                  className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-ink"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 stroke-cyan" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section>
        <Container className="py-16 sm:py-20">
          <Reveal>
            <SectionHeading
              eyebrow="How it works"
              title="On the water in three steps"
              subtitle="From your couch to the Ottawa River with no phone tag and no paperwork at the launch."
            />
          </Reveal>
          <RevealStagger className="relative grid gap-8 sm:grid-cols-3">
            {/* connector line */}
            <div className="pointer-events-none absolute left-[16%] right-[16%] top-[22px] hidden h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent sm:block" />
            {steps.map((step, i) => (
              <RevealItem key={step.title} className="relative flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="glow-cyan relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan text-sm font-bold text-surface-lowest">
                    {i + 1}
                  </span>
                  <svg viewBox="0 0 24 24" className="h-7 w-7 stroke-cyan" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    {step.icon}
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-ink">{step.title}</h3>
                <p className="text-sm leading-relaxed text-ink-muted">{step.text}</p>
              </RevealItem>
            ))}
          </RevealStagger>
        </Container>
      </section>

      {/* ── Single-ski spotlight ─────────────────────────────── */}
      {ski && (
        <section className="bg-surface-low">
          <Container className="py-16 sm:py-20">
            <Reveal>
              <SectionHeading
                eyebrow="Meet the ride"
                title="The 2023 Sea-Doo Spark Trixx"
                subtitle="Lightweight, agile, and easy to ride. Reverse and Sport Mode make it a blast for first-timers and seasoned riders alike."
              />
            </Reveal>
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <Reveal>
                <div className="relative overflow-hidden rounded-2xl border border-outline-variant/60 shadow-2xl shadow-black/50">
                  <Image
                    src="/photos/ride-action.jpg"
                    alt="Two riders on an orange Sea-Doo Spark on the Ottawa River"
                    width={900}
                    height={675}
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
              </Reveal>
              <Reveal>
                <FleetCard jetSki={ski} />
              </Reveal>
            </div>
          </Container>
        </section>
      )}

      {/* ── Reviews marquee (only when reviews exist) ────────── */}
      {recentReviews.length > 0 && (
        <section className="animated-gradient-light overflow-hidden">
          <Container className="py-16 sm:py-20">
            <Reveal>
              <SectionHeading
                eyebrow="Reviews"
                title="Riders love us"
                subtitle="Real words from people who rode with us on the Ottawa River."
              />
            </Reveal>
          </Container>
          <Marquee speed="slow" className="pb-16 sm:pb-20">
            {recentReviews.map((review) => (
              <ReviewCard key={review.id} review={review} className="w-80 shrink-0" />
            ))}
          </Marquee>
          <Container className="pb-16 text-center sm:pb-20">
            <ButtonLink href="/reviews" variant="outline">
              Read all reviews
            </ButtonLink>
          </Container>
        </section>
      )}

      {/* ── Bottom CTA band ──────────────────────────────────── */}
      <section className="animated-gradient relative overflow-hidden">
        <WaveDivider from="surface" flip />
        <div className="animate-pulse-glow pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan/20 blur-3xl" />
        <Container className="relative py-16 text-center sm:py-20">
          <Reveal>
            <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Ready to hit the water?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-ink-muted">
              {SITE_SLOGAN}. Reserve your Sea-Doo with {SITE_NAME} and ride the
              Ottawa River this season.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/book" className="px-8 py-3 text-base">
                Book your jet ski
              </ButtonLink>
              <ButtonLink href="/my-booking" variant="glass" className="px-8 py-3 text-base">
                Manage a booking
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* Trust badges reassurance row */}
      <section className="bg-surface">
        <Container className="py-10">
          <TrustBadges />
        </Container>
      </section>
    </>
  );
}
