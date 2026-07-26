"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import { formatBookingRange, formatCAD, formatDate, toDateKey } from "@/lib/format";
import { RidingOption, SITE_PHONE } from "@/lib/constants";
import { Button, Input, Label } from "@/components/ui";

type LookupResult = {
  booking: {
    id: string;
    status: string;
    startTime: string;
    endTime: string;
    hours: number;
    durationType: string;
    ridingOption: string;
    totalPrice: number;
    depositAmount: number;
    createdAt: string;
    expiresAt: string | null;
  };
  jetSki: { name: string; model: string; imageUrl: string; horsepower: number; seats: number };
  waiverSigned: boolean;
  canCancel: boolean;
  cancelCutoffHours: number;
};

const statusStyles: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Awaiting payment", color: "bg-amber-500/10 text-amber-300 ring-amber-400/30" },
  CONFIRMED: { label: "Confirmed", color: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/30" },
  COMPLETED: { label: "Completed", color: "bg-surface-high text-ink-muted ring-outline-variant" },
  CANCELLED: { label: "Cancelled", color: "bg-red-500/10 text-red-300 ring-red-400/30" },
  EXPIRED: { label: "Expired", color: "bg-surface-high text-outline ring-outline-variant" },
};

// Timeline stages for a healthy booking lifecycle.
const STAGES = ["PENDING", "CONFIRMED", "COMPLETED"] as const;
const stageLabels: Record<(typeof STAGES)[number], string> = {
  PENDING: "Held",
  CONFIRMED: "Confirmed",
  COMPLETED: "Ride complete",
};

function StatusTimeline({ status }: { status: string }) {
  if (status === "CANCELLED" || status === "EXPIRED") {
    const s = statusStyles[status];
    return (
      <div className="flex items-center gap-2 rounded-xl bg-surface-high px-4 py-3 text-sm font-medium text-ink-muted">
        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${status === "CANCELLED" ? "bg-red-400" : "bg-outline"}`} />
        This booking is {s.label.toLowerCase()}.
      </div>
    );
  }
  const currentIndex = STAGES.indexOf(status as (typeof STAGES)[number]);
  return (
    <div className="flex items-center">
      {STAGES.map((stage, i) => {
        const done = i <= currentIndex;
        return (
          <div key={stage} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  done
                    ? "bg-cyan text-surface-lowest shadow-[0_0_12px_rgba(0,241,254,0.5)]"
                    : "bg-surface-high text-outline"
                }`}
              >
                {done ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-surface-lowest" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l4 4L19 6" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className={`mt-1.5 text-[11px] font-medium ${done ? "text-ink-muted" : "text-outline"}`}>
                {stageLabels[stage]}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <span className={`mx-1 mb-5 h-0.5 flex-1 rounded-full ${i < currentIndex ? "bg-cyan shadow-[0_0_8px_rgba(0,241,254,0.4)]" : "bg-surface-high"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function MyBookingLookup() {
  const [bookingId, setBookingId] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);

  // cancel flow
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelled, setCancelled] = useState(false);

  async function handleLookup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResult(null);
    setCancelled(false);
    setConfirmingCancel(false);
    if (!bookingId.trim() || !email.trim()) {
      setError("Please enter your booking reference and email.");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/my-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: bookingId.trim(), email: email.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "No booking found with that reference and email.");
        return;
      }
      setResult(data as LookupResult);
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setStatus("idle");
    }
  }

  async function handleCancel() {
    if (!result) return;
    setCancelling(true);
    setCancelError("");
    try {
      const res = await fetch("/api/my-booking/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: result.booking.id, email: email.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setCancelError(data?.error ?? "This booking could not be cancelled.");
        return;
      }
      setCancelled(true);
      setResult({ ...result, booking: { ...result.booking, status: "CANCELLED" }, canCancel: false });
    } catch {
      setCancelError("We couldn't reach the server. Please try again.");
    } finally {
      setCancelling(false);
      setConfirmingCancel(false);
    }
  }

  const b = result?.booking;
  const start = b ? new Date(b.startTime) : null;
  const s = b ? statusStyles[b.status] ?? statusStyles.PENDING : null;

  return (
    <div className="space-y-8">
      <form onSubmit={handleLookup} className="rounded-2xl border border-outline-variant/60 bg-surface-mid p-6 shadow-lg shadow-black/40 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="mb-ref">Booking reference</Label>
            <Input
              id="mb-ref"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              placeholder="e.g. cmrb3vdtm0001u2ogu8ksa2hu"
            />
            <p className="mt-1 text-xs text-outline">Found in your confirmation email.</p>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="mb-email">Email</Label>
            <Input
              id="mb-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
        </div>
        {error && (
          <p className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={status === "loading"} className="mt-6 w-full sm:w-auto">
          {status === "loading" ? "Looking up…" : "Find my booking"}
        </Button>
      </form>

      <AnimatePresence>
        {result && b && start && s && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass overflow-hidden rounded-2xl"
          >
            <div className="flex items-center gap-4 border-b border-outline-variant/50 bg-surface-low/60 p-5 sm:p-6">
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-high ring-1 ring-inset ring-cyan/20">
                <Image src={result.jetSki.imageUrl} alt={result.jetSki.name} fill className="object-cover" sizes="96px" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-bold text-ink">{result.jetSki.name}</h2>
                <p className="text-xs text-outline">{result.jetSki.model}</p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${s.color}`}>
                {s.label}
              </span>
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              <StatusTimeline status={b.status} />

              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-outline">Date</dt>
                  <dd className="font-medium text-ink">{formatDate(toDateKey(start))}</dd>
                </div>
                <div>
                  <dt className="text-outline">Time</dt>
                  <dd className="font-medium text-ink">
                    {formatBookingRange(new Date(b.startTime), new Date(b.endTime))}
                  </dd>
                </div>
                <div>
                  <dt className="text-outline">Riding</dt>
                  <dd className="font-medium text-ink">
                    {b.ridingOption === RidingOption.FREE_RANGE ? "Free range" : "Designated riding area"}
                  </dd>
                </div>
                <div>
                  <dt className="text-outline">Paid in full</dt>
                  <dd className="font-medium text-ink">{formatCAD(b.totalPrice)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-outline">Reference</dt>
                  <dd className="break-all font-mono text-xs text-ink-muted">{b.id}</dd>
                </div>
              </dl>

              <div className="flex items-center gap-2 text-sm">
                {result.waiverSigned ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-300">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                    Waiver signed
                  </span>
                ) : (
                  <span className="text-outline">Waiver not yet signed</span>
                )}
              </div>

              {/* Cancellation */}
              {cancelled ? (
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                  Your booking has been cancelled. Your payment will be refunded to your original
                  payment method within 5 to 10 business days.
                </div>
              ) : result.canCancel ? (
                <div className="border-t border-outline-variant/50 pt-5">
                  {!confirmingCancel ? (
                    <button
                      onClick={() => setConfirmingCancel(true)}
                      className="text-sm font-semibold text-red-300 transition-colors hover:text-red-200"
                    >
                      Cancel this booking
                    </button>
                  ) : (
                    <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-4">
                      <p className="text-sm font-medium text-ink">
                        Cancel this booking? Your payment will be refunded within 5 to 10 business days.
                      </p>
                      {cancelError && <p className="mt-2 text-sm text-red-300">{cancelError}</p>}
                      <div className="mt-4 flex gap-3">
                        <Button variant="danger" onClick={handleCancel} disabled={cancelling}>
                          {cancelling ? "Cancelling…" : "Yes, cancel it"}
                        </Button>
                        <Button variant="outline" onClick={() => setConfirmingCancel(false)} disabled={cancelling}>
                          Keep booking
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (b.status === "CONFIRMED" || b.status === "PENDING") ? (
                <div className="rounded-xl bg-surface-high p-4 text-sm text-ink-muted">
                  Online cancellation closes {result.cancelCutoffHours} hours before your rental.
                  Need to make a change? Call us at{" "}
                  <a href={`tel:${SITE_PHONE.replace(/[^\d+]/g, "")}`} className="font-semibold text-cyan hover:underline">
                    {SITE_PHONE}
                  </a>{" "}
                  and we&apos;ll do our best to help.
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
