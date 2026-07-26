"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { SITE_NAME } from "@/lib/constants";
import { ButtonLink } from "@/components/ui";

const navLinks = [
  { href: "/fleet", label: "Fleet & Rates" },
  { href: "/gallery", label: "Gallery" },
  { href: "/safety", label: "Safety & FAQ" },
  { href: "/reviews", label: "Reviews" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label={`${SITE_NAME} home`}>
      <Image
        src="/brand/emblem.png"
        alt=""
        width={40}
        height={40}
        priority
        className={`h-9 w-9 rounded-lg object-cover ring-1 sm:h-10 sm:w-10 ${
          light ? "ring-white/20" : "ring-cyan/25"
        }`}
      />
      <span className="font-display text-lg font-bold tracking-tight text-ink">
        {SITE_NAME}
      </span>
    </Link>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The admin area has its own chrome.
  if (pathname.startsWith("/admin")) return null;

  // Over the navy homepage hero the bar starts transparent with light text,
  // then turns into a glass-white bar once scrolled (or when the menu opens).
  const overHero = pathname === "/" && !scrolled && !open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        overHero
          ? "border-b border-transparent bg-transparent"
          : "border-b border-cyan/10 bg-surface/70 shadow-[0_0_20px_rgba(0,241,254,0.12)] backdrop-blur-xl"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo light={overHero} />
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`font-label group relative text-sm font-medium transition-colors ${
                  active ? "text-cyan" : "text-ink-muted hover:text-ink"
                }`}
              >
                {l.label}
                <span
                  className={`absolute -bottom-1.5 left-0 h-0.5 rounded-full bg-cyan transition-all duration-300 ${
                    active ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </Link>
            );
          })}
          <ButtonLink href="/book" variant={overHero ? "glass" : "primary"} className="ml-2">
            Book Now
          </ButtonLink>
        </nav>
        <button
          className={`rounded-md p-2 md:hidden ${
            overHero ? "text-white hover:bg-white/10" : "text-ink hover:bg-surface-high"
          }`}
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            )}
          </svg>
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="overflow-hidden border-t border-outline-variant bg-surface md:hidden"
          >
            <div className="px-4 pb-4 pt-2">
              {navLinks.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i }}
                >
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="font-label block rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-surface-high hover:text-cyan"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <ButtonLink href="/book" className="mt-2 w-full" onClick={() => setOpen(false)}>
                Book Now
              </ButtonLink>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
