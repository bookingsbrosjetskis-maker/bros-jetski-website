import type { Metadata } from "next";
import Image from "next/image";
import { ButtonLink, Container, SectionHeading } from "@/components/ui";
import CorporateForm from "@/components/CorporateForm";

export const metadata: Metadata = {
  title: "Corporate Events & Team Building",
  description:
    "Team days on the Ottawa River at Blair Boat Launch. Group Sea-Doo rentals, safety briefings, and a hassle-free day on the water. Request our event details.",
};

const services = [
  {
    title: "Custom Itineraries",
    text: "Group days on the Ottawa River designed around your team's goals. We handle the logistics so you can just enjoy the ride.",
    icon: (
      <path d="M8 2v4M16 2v4M3 10h18M5 6h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
    ),
    bullets: ["Blair Boat Launch access", "Guided riding options"],
  },
  {
    title: "On-Water Fun",
    text: "Get the whole team out on the water with premium Sea-Doo rentals. Beginner friendly and a blast for experienced riders too.",
    icon: (
      <path d="M4 16c2.5-2 4.5-2 7 0s4.5 2 7 0M6 12l2-5h6l4 5M10 7V5" />
    ),
    bullets: ["Premium Sea-Doo rentals", "Full safety gear included"],
    popular: true,
  },
  {
    title: "Team Challenges",
    text: "Friendly on-water challenges built to foster collaboration, communication, and a little healthy competition.",
    icon: (
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    ),
    bullets: ["On-water challenges", "Safety briefings for all"],
  },
];

const highlights = [
  {
    title: "Flexible Duration",
    text: "Tailor the day to your group, from an hourly session to a full day on the Ottawa River.",
    icon: <path d="M12 6v6l4 2M12 22a10 10 0 100-20 10 10 0 000 20z" />,
  },
  {
    title: "Safety First",
    text: "Every rider gets a safety briefing, a fitted life jacket, and all required equipment before heading out.",
    icon: <path d="M12 3l7 3v5c0 4.5-3 8.4-7 10-4-1.6-7-5.5-7-10V6l7-3z M9.5 12l2 2 3.5-4" />,
  },
];

export default function CorporatePage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-[80dvh] items-center overflow-hidden bg-surface text-ink [@media(max-height:640px)]:min-h-0">
        <Image
          src="/photos/lineup-sunset.jpg"
          alt="A lineup of Sea-Doo jet skis at sunset on the Ottawa River"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-70"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-surface/85 via-surface/40 to-transparent" />
        <div className="animate-pulse-glow pointer-events-none absolute -left-24 bottom-10 h-80 w-80 rounded-full bg-cyan/20 blur-3xl" />

        <Container className="relative z-10 pb-20 pt-32 sm:pb-28 sm:pt-40 [@media(max-height:640px)]:pb-12 [@media(max-height:640px)]:pt-24">
          <div className="max-w-2xl">
            <p className="font-label mb-5 inline-flex items-center gap-2 rounded-full border border-cyan/25 bg-cyan/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-cyan">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                <path d="M12 2l2.9 6.2 6.8.6-5.1 4.5 1.5 6.7L12 16.9 5.9 20.5l1.5-6.7L2.3 8.8l6.8-.6L12 2z" />
              </svg>
              Group Bookings on the Ottawa River
            </p>
            <h1 className="text-3xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Get Your Team{" "}
              <span className="gradient-text">On the Water</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
              Plan a memorable team day on the Ottawa River. From on-water
              challenges to a relaxed afternoon of riding, we make it a safe and
              hassle-free experience for groups of every skill level.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="#request" className="px-8">
                Request a Quote
              </ButtonLink>
              <ButtonLink href="#services" variant="glass" className="px-8">
                View Itineraries
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Services ─────────────────────────────────────────── */}
      <section id="services" className="bg-surface py-20 sm:py-24">
        <Container>
          <SectionHeading eyebrow="What we handle" title="A Team Day Made Simple" />

          <div className="grid gap-6 md:grid-cols-3">
            {services.map((s) => (
              <div
                key={s.title}
                className="glass group relative flex flex-col rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:border-cyan/40"
              >
                {s.popular && (
                  <span className="font-label absolute right-5 top-5 rounded-full bg-cyan px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-surface-lowest">
                    Popular
                  </span>
                )}
                <span className="mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-cyan/10 transition-colors group-hover:bg-cyan/20">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-7 w-7 stroke-cyan"
                    fill="none"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    {s.icon}
                  </svg>
                </span>
                <h3 className="font-display text-xl font-bold text-ink">
                  {s.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-muted">
                  {s.text}
                </p>
                <ul className="mt-6 space-y-3">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2.5">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4 shrink-0 stroke-cyan"
                        fill="none"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M12 3a9 9 0 100 18 9 9 0 000-18zM8.5 12.5l2.5 2.5 4.5-5.5" />
                      </svg>
                      <span className="font-label text-xs font-bold uppercase tracking-[0.08em] text-ink">
                        {b}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Split feature ────────────────────────────────────── */}
      <section className="bg-surface-low py-20 sm:py-24">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="relative">
              <div className="pointer-events-none absolute -left-3 -top-3 h-20 w-20 border-l-2 border-t-2 border-cyan/50" />
              <div className="pointer-events-none absolute -bottom-3 -right-3 h-20 w-20 border-b-2 border-r-2 border-cyan/50" />
              <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-black/50">
                <Image
                  src="/photos/ride-action.jpg"
                  alt="Riders carving across the Ottawa River on a Sea-Doo Spark"
                  width={800}
                  height={600}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>
            </div>

            <div>
              <p className="font-label text-xs font-bold uppercase tracking-[0.1em] text-cyan">
                Built for groups
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                A Great Day for the Whole Team
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-ink-muted">
                Our group days are about getting everyone out on the water and
                having fun together. Beginners and experienced riders alike get a
                safe, exciting, and hassle-free experience on the Ottawa River.
              </p>
              <div className="mt-8 space-y-4">
                {highlights.map((h) => (
                  <div
                    key={h.title}
                    className="flex gap-4 rounded-xl border border-outline-variant/60 bg-surface-high p-4"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan/10">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-6 w-6 stroke-cyan"
                        fill="none"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        {h.icon}
                      </svg>
                    </span>
                    <div>
                      <h4 className="font-display font-bold text-ink">
                        {h.title}
                      </h4>
                      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                        {h.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Request form ─────────────────────────────────────── */}
      <section id="request" className="relative overflow-hidden bg-surface py-20 sm:py-24">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-cyan/5 blur-[120px]" />
        <Container className="relative z-10">
          <div className="glass mx-auto max-w-3xl rounded-3xl p-6 text-center sm:p-12">
            <p className="font-label text-xs font-bold uppercase tracking-[0.1em] text-cyan">
              Ready to book?
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Request Event Details
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-ink-muted">
              Tell us about your group and preferred dates, and our team will get
              back to you with availability and pricing for your day on the
              water.
            </p>
            <div className="mt-10">
              <CorporateForm />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
