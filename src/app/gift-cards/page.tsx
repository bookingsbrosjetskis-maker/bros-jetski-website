import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/ui";
import GiftCardForm from "@/components/GiftCardForm";

export const metadata: Metadata = {
  title: "Gift Cards",
  description:
    "Give the thrill of the Ottawa River. Sea-Doo jet ski rental gift cards, perfect for birthdays, weddings, and any occasion. Choose a value and send the adventure.",
};

const perks = [
  {
    title: "Ride on their schedule",
    text: "Our gift credits let them pick a date that works, any time during our May to September season.",
    icon: <path d="M12 6v6l4 2M12 22a10 10 0 100-20 10 10 0 000 20z" />,
  },
  {
    title: "Use it on any rental",
    text: "Apply the credit toward any Sea-Doo Spark Trixx rental with Bros Jetskis Rental.",
    icon: <path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />,
  },
  {
    title: "Delivered your way",
    text: "We arrange a digital or printed card, personalised with your message.",
    icon: <path d="M4 4h16v16H4zM4 4l8 7 8-7" />,
  },
];

export default function GiftCardsPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-surface text-ink">
        <Image
          src="/photos/lineup-sunset.jpg"
          alt="Sea-Doo jet skis lined up at sunset on the Ottawa River"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-70"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-surface/40 via-surface/60 to-surface" />
        <div className="animate-pulse-glow pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-cyan/15 blur-3xl" />

        <Container className="relative z-10 pb-16 pt-32 text-center sm:pb-20 sm:pt-40">
          <p className="font-label text-xs font-bold uppercase tracking-[0.2em] text-cyan">
            Unforgettable Adventures
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Gift the Thrill of{" "}
            <span className="gradient-text">the Open Water</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted">
            Premium Sea-Doo rentals on the Ottawa River. A gift card is perfect
            for birthdays, weddings, and anyone who loves a day on the water.
          </p>
        </Container>
      </section>

      {/* ── Perks ────────────────────────────────────────────── */}
      <section className="bg-surface py-16 sm:py-20">
        <Container>
          <div className="grid gap-6 sm:grid-cols-3">
            {perks.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-outline-variant/60 bg-surface-mid p-6"
              >
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan/10">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6 stroke-cyan"
                    fill="none"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    {p.icon}
                  </svg>
                </span>
                <h3 className="font-display font-bold text-ink">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                  {p.text}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── E-Gift cards + inquiry ───────────────────────────── */}
      <section className="relative overflow-hidden bg-surface-low py-20 sm:py-24">
        <div className="pointer-events-none absolute left-1/2 top-0 -z-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-cyan/5 blur-[120px]" />
        <Container className="relative z-10">
          <div className="mb-12 text-center">
            <p className="font-label text-xs font-bold uppercase tracking-[0.1em] text-cyan">
              E-Gift Cards
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-4xl">
              Choose a Value, Send the Adventure
            </h2>
            <div className="section-rule mx-auto mt-5" />
            <p className="mx-auto mt-5 max-w-xl text-base text-ink-muted">
              Pick a tier below to pre-fill your inquiry. Perfect for birthdays,
              weddings, and corporate rewards.
            </p>
          </div>

          <GiftCardForm />
        </Container>
      </section>
    </>
  );
}
