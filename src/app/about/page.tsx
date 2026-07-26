import type { Metadata } from "next";
import Image from "next/image";
import { SITE_NAME } from "@/lib/constants";
import { ButtonLink, Container } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Bros Jetskis Rental makes watersports more accessible in Ottawa with premium Sea-Doo rentals, a strong focus on safety, and clean, reliable equipment.",
};

const values = [
  {
    title: "Safety first",
    text: "Every rental starts with a safety briefing and includes life jackets and all required equipment, so beginners and experienced riders can relax and enjoy the water.",
    icon: <path d="M12 3l7 3v5c0 4.5-3 8.4-7 10-4-1.6-7-5.5-7-10V6l7-3z M9.5 12l2 2 3.5-4" />,
  },
  {
    title: "Clean, reliable equipment",
    text: "We keep our Sea-Doo clean and well maintained so it is ready to ride every time you show up at the launch.",
    icon: <path d="M4 16c2.5-2 4.5-2 7 0s4.5 2 7 0M6 12l2-5h6l4 5M10 7V5" />,
  },
  {
    title: "Beginner friendly",
    text: "The Spark Trixx is lightweight and easy to ride, and our team walks you through everything before you head out. First time on a jet ski? You are in good hands.",
    icon: <path d="M12 21s-7-6.6-7-11.5A7 7 0 0119 9.5C19 14.4 12 21 12 21z M12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />,
  },
  {
    title: "Local to Ottawa",
    text: "We ride the Ottawa River from Blair Boat Launch. It is our home water, and we love helping people make the most of a day on it.",
    icon: <path d="M3 18c2.5-2 4.5-2 7 0s4.5 2 7 0 3-1.5 4-1M12 4l3 6-3-1-3 1 3-6zM12 9v4" />,
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Our story"
        title="Watersports made easy in Ottawa"
        subtitle="We started Bros Jetskis Rental to make a day on the water safe, exciting, and hassle-free for everyone."
      />

      <Container className="py-14 sm:py-20">
        {/* Story */}
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <Reveal>
            <div className="space-y-5 text-base leading-relaxed text-ink-muted">
              <p>
                {SITE_NAME} was created to make watersports more accessible in
                Ottawa. We offer premium Sea-Doo jet ski rentals with a safe,
                exciting, and hassle-free experience for beginners and
                experienced riders alike.
              </p>
              <p>
                Every rental includes a safety briefing, life jackets, and all
                the required equipment. Our goal is simple: clean, reliable
                equipment, excellent service, and a strong focus on safety, so
                every customer leaves with memories they will want to relive all
                summer.
              </p>
              <p>
                You will find us at Blair Boat Launch on the Ottawa River, from
                May through September. Come say hello and get out on the water.
              </p>
            </div>
          </Reveal>
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-outline-variant/60 shadow-2xl shadow-black/50">
              <Image
                src="/photos/beach-trio.jpg"
                alt="Sea-Doo jet skis at the water's edge on the Ottawa River"
                width={900}
                height={675}
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </Reveal>
        </div>

        {/* Values */}
        <div className="mt-16">
          <Reveal>
            <div className="text-center">
              <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                What we stand for
              </h2>
              <div className="section-rule mx-auto mt-4" />
            </div>
          </Reveal>
          <RevealStagger className="mt-8 grid gap-6 sm:grid-cols-2">
            {values.map((v) => (
              <RevealItem key={v.title}>
                <div className="flex h-full gap-4 rounded-2xl border border-outline-variant/60 bg-surface-mid p-6 shadow-lg shadow-black/40 transition-all duration-300 hover:-translate-y-1 hover:border-cyan/40 hover:shadow-lg hover:shadow-cyan/10">
                  <span className="glow-cyan flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 stroke-surface-lowest" fill="none" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      {v.icon}
                    </svg>
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink">{v.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">{v.text}</p>
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </Container>

      {/* CTA band */}
      <section className="animated-gradient relative overflow-hidden">
        <div className="animate-pulse-glow pointer-events-none absolute -left-16 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-cyan/15 blur-3xl" />
        <Container className="relative py-16 text-center sm:py-20">
          <Reveal>
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Come ride with us
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-ink-muted">
              Book a Sea-Doo Spark Trixx and make memories on the Ottawa River
              this summer.
            </p>
            <div className="mt-8">
              <ButtonLink href="/book" className="px-8 py-3 text-base">
                Book your ride
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
