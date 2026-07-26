import type { ReactNode } from "react";
import { WaveDivider } from "@/components/motion/WaveDivider";

/** Navy gradient banner for the top of every non-homepage page. The site
 * header is fixed and transparent-friendly, so this includes the top
 * clearance (pt-28) — pages using PageHero need no extra top padding.
 * Pages NOT using PageHero must wrap their content in `pt-24`. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
  compact = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="animated-gradient relative overflow-hidden text-ink">
      {/* glow blobs */}
      <div className="animate-pulse-glow pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-cyan/15 blur-3xl" />
      <div className="animate-pulse-glow pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-cyan/10 blur-3xl [animation-delay:2s]" />
      <div
        className={`relative mx-auto w-full max-w-6xl px-4 sm:px-6 ${
          compact ? "pb-10 pt-28" : "pb-16 pt-32"
        }`}
      >
        {eyebrow && (
          <p className="font-label mb-3 text-xs font-bold uppercase tracking-[0.1em] text-cyan">
            {eyebrow}
          </p>
        )}
        <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-4 max-w-2xl text-base text-ink-muted sm:text-lg">{subtitle}</p>
        )}
        {children}
      </div>
      <WaveDivider from="surface" className="relative" />
    </section>
  );
}
