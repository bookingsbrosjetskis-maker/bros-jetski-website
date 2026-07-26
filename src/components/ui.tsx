import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const buttonStyles = {
  primary:
    "sheen bg-cyan text-surface-lowest font-bold glow-cyan hover:glow-cyan-strong hover:-translate-y-0.5",
  secondary:
    "bg-surface-high text-ink hover:bg-surface-bright border border-outline-variant hover:-translate-y-0.5",
  outline:
    "border border-outline text-ink-muted hover:border-cyan hover:text-cyan hover:-translate-y-0.5",
  glass:
    "glass text-ink hover:bg-white/5 hover:border-cyan/30 hover:-translate-y-0.5",
  danger: "bg-red-600 text-white hover:bg-red-500",
} as const;

const buttonBase =
  "font-label inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

type ButtonVariant = keyof typeof buttonStyles;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`${buttonBase} ${buttonStyles[variant]} ${className}`}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return (
    <Link
      className={`${buttonBase} ${buttonStyles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({
  className = "",
  hover = false,
  ...props
}: ComponentProps<"div"> & { hover?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-outline-variant/60 bg-surface-mid shadow-lg shadow-black/40 ${
        hover
          ? "transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan/40 hover:shadow-xl hover:shadow-cyan/10"
          : ""
      } ${className}`}
      {...props}
    />
  );
}

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input
      className={`w-full rounded-lg border border-outline bg-surface-high px-3.5 py-2.5 text-sm text-ink placeholder:text-outline focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={`w-full rounded-lg border border-outline bg-surface-high px-3.5 py-2.5 text-sm text-ink placeholder:text-outline focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return (
    <select
      className={`w-full rounded-lg border border-outline bg-surface-high px-3.5 py-2.5 text-sm text-ink focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan ${className}`}
      {...props}
    />
  );
}

export function Label({ className = "", ...props }: ComponentProps<"label">) {
  return (
    <label
      className={`font-label mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-muted ${className}`}
      {...props}
    />
  );
}

export function Badge({
  color = "blue",
  className = "",
  ...props
}: ComponentProps<"span"> & { color?: "blue" | "green" | "amber" | "red" | "slate" }) {
  const colors = {
    blue: "bg-cyan/10 text-cyan-soft ring-cyan/30",
    green: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/30",
    amber: "bg-amber-500/10 text-amber-300 ring-amber-400/30",
    red: "bg-red-500/10 text-red-300 ring-red-400/30",
    slate: "bg-surface-high text-ink-muted ring-outline-variant",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${colors[color]} ${className}`}
      {...props}
    />
  );
}

export function Container({
  className = "",
  ...props
}: ComponentProps<"div">) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`} {...props} />
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
}) {
  return (
    <div className="mb-8 max-w-2xl">
      {eyebrow && (
        <p className="font-label mb-2 text-xs font-bold uppercase tracking-[0.1em] text-cyan">
          {eyebrow}
        </p>
      )}
      <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        {title}
      </h2>
      {subtitle && <p className="mt-3 text-base text-ink-muted">{subtitle}</p>}
    </div>
  );
}

export function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`h-4 w-4 ${i <= rating ? "fill-amber-400" : "fill-surface-bright"}`}
          aria-hidden
        >
          <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </div>
  );
}
