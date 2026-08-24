"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { ButtonLink } from "@/components/ui";
import type { JetSki } from "@prisma/client";
import { formatCAD } from "@/lib/format";
import { BOOKING_DEPOSIT_CENTS } from "@/lib/constants";

/** Rate rows for the single Spark Trixx. No dashes in labels. */
const priceRows = [
  { key: "hourlyRate", label: "Per hour" },
  { key: "halfDayRate", label: "Half day · 4h" },
  { key: "fullDayRate", label: "Full day · 8h" },
  { key: "weekendRate", label: "Weekend · 2 days" },
] as const;

/** Intrinsic features of this single 2023 Sea-Doo Spark Trixx model. */
const FEATURES = ["Reverse", "Sport Mode", "Beginner friendly", "Storage"];

const BoltIcon = <path d="M13 2L4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5z" />;
const SeatIcon = (
  <path d="M12 7a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM6 21v-3a4 4 0 014-4h4a4 4 0 014 4v3" />
);

export default function FleetCard({
  jetSki,
  priority = false,
}: {
  jetSki: JetSki;
  /** Only set for an above-the-fold LCP image; off by default. */
  priority?: boolean;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      whileHover={reduced ? undefined : { y: -8 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className="group sheen relative flex h-full flex-col overflow-hidden rounded-3xl border border-outline-variant/60 bg-surface-mid shadow-lg shadow-black/40 transition-colors duration-300 hover:border-cyan/50 hover:shadow-xl hover:shadow-cyan/10"
    >
      {/* Photo with parallax zoom + cinematic gradient overlay */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-low">
        <Image
          src={jetSki.imageUrl}
          alt={`${jetSki.name}, ${jetSki.model}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 640px"
          priority={priority}
          className="object-cover transition-transform duration-[900ms] ease-out will-change-transform group-hover:scale-[1.08]"
        />
        {/* legibility gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface-mid via-surface-mid/20 to-transparent" />
        {/* moving sheen sweep on hover */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent"
          initial={{ x: "-120%", opacity: 0 }}
          whileHover={reduced ? undefined : { x: "460%", opacity: 1 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
        />

        {jetSki.featured && (
          <div className="absolute right-3 top-3 z-10">
            <span className="glow-cyan rounded-full bg-cyan px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-surface-lowest">
              Most popular
            </span>
          </div>
        )}

        {/* HP badge floats over the image */}
        <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-2">
          <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-ink">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-cyan" aria-hidden>
              {BoltIcon}
            </svg>
            {jetSki.horsepower} HP
          </span>
          <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-ink">
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 stroke-cyan-soft"
              fill="none"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {SeatIcon}
            </svg>
            {jetSki.seats} {jetSki.seats === 1 ? "seat" : "seats"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-ink">{jetSki.name}</h3>
          <p className="font-label mt-1 text-xs uppercase tracking-wider text-cyan">
            {jetSki.model}
          </p>
        </div>

        {/* Feature chips */}
        <div className="flex flex-wrap gap-2">
          {FEATURES.map((f) => (
            <span
              key={f}
              className="inline-flex items-center rounded-full bg-surface-high px-2.5 py-1 text-xs font-medium text-ink-muted ring-1 ring-inset ring-outline-variant"
            >
              {f}
            </span>
          ))}
        </div>

        <p className="text-sm leading-relaxed text-ink-muted">{jetSki.description}</p>

        {/* Rate table (four rows incl. weekend) */}
        <dl className="mt-auto divide-y divide-outline-variant/50 rounded-2xl border border-outline-variant/60 bg-surface-low px-4">
          {priceRows.map((row) => (
            <div key={row.key} className="flex items-baseline justify-between py-2.5">
              <dt className="text-sm text-ink-muted">{row.label}</dt>
              <dd className="gradient-text font-display text-sm font-bold">
                {formatCAD(jetSki[row.key])}
              </dd>
            </div>
          ))}
        </dl>

        {/* Deposit + riding options teaser */}
        <p className="text-xs leading-relaxed text-outline">
          Rates per jet ski. Book with a {formatCAD(BOOKING_DEPOSIT_CENTS)} deposit per jet ski,
          balance due at the dock.
        </p>
        <p className="text-xs leading-relaxed text-outline">
          Designated area (no security deposit) or free range ($1,000 refundable security deposit).
        </p>

        <ButtonLink href={`/book/${jetSki.id}`} className="min-h-[48px] w-full">
          Book Now
        </ButtonLink>
      </div>
    </motion.div>
  );
}
