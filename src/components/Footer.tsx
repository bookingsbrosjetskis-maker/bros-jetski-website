"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import TrustBadges from "@/components/TrustBadges";
import SocialLinks from "@/components/SocialLinks";
import { Container } from "@/components/ui";
import {
  SITE_NAME,
  SITE_SLOGAN,
  SITE_PHONE,
  SITE_ADDRESS,
  SITE_HOURS,
} from "@/lib/constants";

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="mt-auto">
      {/* Trust badges visible on every page (spec requirement) */}
      <div className="border-t border-outline-variant/60 bg-surface-lowest">
        <Container className="py-8">
          <TrustBadges />
        </Container>
      </div>
      <div className="animated-gradient relative overflow-hidden text-ink-muted">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan/10 blur-3xl" />
        <Container className="relative grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
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
          </div>
        </Container>
        <div className="relative border-t border-white/10">
          <Container className="flex flex-col items-center gap-4 py-5 sm:flex-row sm:justify-between">
            <p className="order-2 text-center text-xs text-outline sm:order-1">
              © {new Date().getFullYear()} {SITE_NAME}. All prices in CAD.
            </p>
            <SocialLinks className="order-1 sm:order-2" />
            <ul className="order-3 flex items-center gap-4 text-xs text-outline">
              <li><Link href="/terms" className="transition-colors hover:text-cyan-soft">Terms of Service</Link></li>
              <li><Link href="/privacy" className="transition-colors hover:text-cyan-soft">Privacy Policy</Link></li>
            </ul>
          </Container>
        </div>
      </div>
    </footer>
  );
}
