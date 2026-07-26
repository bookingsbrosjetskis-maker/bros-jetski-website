"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/fleet", label: "Fleet" },
  { href: "/admin/blocked-dates", label: "Blocked dates" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/checklists", label: "Checklists" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/reviews", label: "Reviews" },
];

export default function AdminNav({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {LINKS.map((l) => {
        const active =
          l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            className={`relative rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-cyan/10 text-cyan before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-cyan"
                : "text-ink-muted hover:bg-surface-high hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="mt-6 border-t border-outline-variant/60 pt-4">
      <Link
        href="/"
        className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-high hover:text-cyan"
        onClick={() => setOpen(false)}
      >
        View site →
      </Link>
      <p className="truncate px-3 pt-2 text-xs text-outline" title={name}>
        Signed in as {name}
      </p>
      <button
        onClick={logout}
        disabled={loggingOut}
        className="mt-2 w-full rounded-lg border border-outline-variant px-3 py-2 text-left text-sm font-medium text-ink-muted hover:bg-surface-high hover:text-ink disabled:opacity-50"
      >
        {loggingOut ? "Logging out…" : "Log out"}
      </button>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col overflow-y-auto border-r border-outline-variant/50 bg-surface-lowest px-4 py-6 lg:flex">
        <div className="mb-6 px-3">
          <p className="font-display text-lg font-extrabold tracking-tight text-cyan">Bros Jetskis</p>
          <p className="font-label text-xs font-bold uppercase tracking-[0.1em] text-outline">
            Fleet Admin Console
          </p>
        </div>
        {nav}
        <div className="mt-auto">{footer}</div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 border-b border-outline-variant/50 bg-surface-lowest lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="font-display text-base font-extrabold text-cyan">Bros Jetskis Admin</p>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle navigation"
            aria-expanded={open}
            className="rounded-lg p-2 text-ink-muted hover:bg-surface-high hover:text-cyan"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
        {open && <div className="border-t border-outline-variant/50 px-4 pb-4 pt-2">{nav}{footer}</div>}
      </div>
    </>
  );
}
