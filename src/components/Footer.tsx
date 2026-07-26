"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import TrustBadges from "@/components/TrustBadges";
import {
  SITE_NAME,
  SITE_SLOGAN,
  SITE_PHONE,
  SITE_ADDRESS,
  SITE_HOURS,
  SITE_INSTAGRAM,
  SITE_TIKTOK,
} from "@/lib/constants";

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="mt-auto">
      {/* Trust badges visible on every page (spec requirement) */}
      <div className="border-t border-outline-variant/60 bg-surface-lowest">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <TrustBadges />
        </div>
      </div>
      <div className="animated-gradient relative overflow-hidden text-ink-muted">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan/10 blur-3xl" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div>
            <Image
              src="/brand/logo.jpg"
              alt={`${SITE_NAME} logo`}
              width={200}
              height={133}
              className="h-auto w-44 rounded-xl ring-1 ring-white/10"
            />
            <p className="font-label mt-4 text-xs font-bold uppercase tracking-[0.1em] text-cyan">
              {SITE_SLOGAN}
            </p>
            <p className="mt-3 text-sm text-outline">
              Premium Sea-Doo jet ski rentals at Blair Boat Launch on the Ottawa
              River. Book online, sign the waiver, and ride.
            </p>
          </div>
          <div>
            <p className="font-label text-xs font-bold uppercase tracking-[0.1em] text-cyan">Explore</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/fleet" className="transition-colors hover:text-cyan-soft">Fleet &amp; Rates</Link></li>
              <li><Link href="/gallery" className="transition-colors hover:text-cyan-soft">Gallery</Link></li>
              <li><Link href="/safety" className="transition-colors hover:text-cyan-soft">Safety &amp; FAQ</Link></li>
              <li><Link href="/reviews" className="transition-colors hover:text-cyan-soft">Reviews</Link></li>
              <li><Link href="/about" className="transition-colors hover:text-cyan-soft">About Us</Link></li>
              <li><Link href="/contact" className="transition-colors hover:text-cyan-soft">Contact</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-label text-xs font-bold uppercase tracking-[0.1em] text-cyan">Bookings</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link href="/book" className="transition-colors hover:text-cyan-soft">Book a jet ski</Link></li>
              <li><Link href="/my-booking" className="transition-colors hover:text-cyan-soft">Manage my booking</Link></li>
              <li><Link href="/corporate" className="transition-colors hover:text-cyan-soft">Corporate &amp; Events</Link></li>
              <li><Link href="/gift-cards" className="transition-colors hover:text-cyan-soft">Gift Cards</Link></li>
              <li><Link href="/safety" className="transition-colors hover:text-cyan-soft">Cancellation policy</Link></li>
            </ul>
            <p className="mt-4 text-xs text-outline">
              Rentals require a PCOC or completed rental safety checklist.
            </p>
          </div>
          <div>
            <p className="font-label text-xs font-bold uppercase tracking-[0.1em] text-cyan">Visit us</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>{SITE_ADDRESS}</li>
              <li>
                <a href={`tel:${SITE_PHONE.replace(/[^\d+]/g, "")}`} className="transition-colors hover:text-cyan-soft">
                  {SITE_PHONE}
                </a>
              </li>
              <li className="pt-2 text-outline">{SITE_HOURS}</li>
            </ul>
            <div className="mt-4 flex gap-3">
              <a
                href={SITE_INSTAGRAM.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Instagram @${SITE_INSTAGRAM.handle}`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan/10 ring-1 ring-cyan/30 transition-colors hover:bg-cyan/20"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 stroke-cyan" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" className="stroke-cyan" />
                </svg>
              </a>
              <a
                href={SITE_TIKTOK.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`TikTok @${SITE_TIKTOK.handle}`}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan/10 ring-1 ring-cyan/30 transition-colors hover:bg-cyan/20"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-cyan" aria-hidden>
                  <path d="M16.5 3c.3 2.1 1.5 3.6 3.5 3.9v2.5c-1.3.1-2.5-.3-3.5-.9v5.9c0 3.3-2.4 5.6-5.5 5.6a5.4 5.4 0 01-5.5-5.5c0-3.1 2.6-5.6 5.9-5.4v2.7a3 3 0 00-.8-.1 2.8 2.8 0 100 5.6c1.6 0 2.8-1.2 2.8-2.9V3h2.6z" />
                </svg>
              </a>
            </div>
            <ul className="mt-3 space-y-1 text-xs text-outline">
              <li>
                <a href={SITE_INSTAGRAM.url} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-cyan-soft">
                  @{SITE_INSTAGRAM.handle}
                </a>
              </li>
              <li>
                <a href={SITE_TIKTOK.url} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-cyan-soft">
                  @{SITE_TIKTOK.handle}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="relative flex flex-col items-center gap-2 border-t border-white/10 py-4 sm:flex-row sm:justify-between sm:px-6">
          <p className="text-center text-xs text-outline">
            © {new Date().getFullYear()} {SITE_NAME}. All prices in CAD.
          </p>
          <ul className="flex items-center gap-4 text-xs text-outline">
            <li><Link href="/terms" className="transition-colors hover:text-cyan-soft">Terms of Service</Link></li>
            <li><Link href="/privacy" className="transition-colors hover:text-cyan-soft">Privacy Policy</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
