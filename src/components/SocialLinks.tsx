import { SITE_INSTAGRAM, SITE_TIKTOK } from "@/lib/constants";

export type SocialName = "instagram" | "tiktok";

/** Every social network the business is on. URLs and handles live in
 * constants.ts — this only adds presentation. Adding a network is one entry
 * here plus one constant there. */
export const SOCIALS: {
  name: SocialName;
  label: string;
  handle: string;
  url: string;
  /** Brand tint applied on hover only, so the resting footer stays on-palette. */
  hoverClass: string;
}[] = [
  {
    name: "instagram",
    label: "Instagram",
    handle: SITE_INSTAGRAM.handle,
    url: SITE_INSTAGRAM.url,
    hoverClass: "hover:bg-[#e1306c]/10 hover:text-[#f0629b] hover:ring-[#e1306c]/40",
  },
  {
    name: "tiktok",
    label: "TikTok",
    handle: SITE_TIKTOK.handle,
    url: SITE_TIKTOK.url,
    hoverClass: "hover:bg-[#fe2c55]/10 hover:text-[#ff6580] hover:ring-[#fe2c55]/40",
  },
];

/** Brand glyph on its own, so callers can drop it into their own layout.
 * Colour comes from `currentColor`; a `stroke-` or `fill-` utility class passed
 * via className wins over it (CSS beats presentation attributes). */
export function SocialGlyph({
  name,
  className = "h-5 w-5",
}: {
  name: SocialName;
  className?: string;
}) {
  if (name === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M16.6 5.82A4.28 4.28 0 0115.54 3h-3.09v12.4a2.59 2.59 0 01-2.59 2.5 2.59 2.59 0 01-2.59-2.59 2.59 2.59 0 013.1-2.54v-3.1a5.66 5.66 0 00-5.2 9.35 5.66 5.66 0 009.78-3.86v-6.3a7.35 7.35 0 004.29 1.37V6.15a4.28 4.28 0 01-2.64-.33z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Icon-only social links. The aria-label is the accessible name — there is no
 * visible text alongside these. */
export default function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex items-center gap-3 ${className}`}>
      {SOCIALS.map((s) => (
        <li key={s.name}>
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${s.label} @${s.handle}`}
            className={`flex h-11 w-11 items-center justify-center rounded-full bg-cyan/10 text-cyan ring-1 ring-cyan/30 transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${s.hoverClass}`}
          >
            <SocialGlyph name={s.name} className="h-5 w-5" />
          </a>
        </li>
      ))}
    </ul>
  );
}
