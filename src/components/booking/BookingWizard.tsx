"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  DURATION_OPTIONS,
  DurationType,
  RidingOption,
  OPEN_HOUR,
  CLOSE_HOUR,
  PENDING_EXPIRY_MINUTES,
  CANCEL_CUTOFF_HOURS,
  BOOKING_DEPOSIT_CENTS,
  bookingDepositFor,
} from "@/lib/constants";
import { formatBookingRange, formatCAD, formatDate, formatHour, dockNowMs } from "@/lib/format";
import { Button, Card, Input, Label } from "@/components/ui";
import MonthCalendar, { todayKey, monthKey, type MonthData, type DaySummary } from "@/components/booking/MonthCalendar";
import WaiverStep, { EMPTY_ACKS, type Acknowledgements } from "@/components/booking/WaiverStep";

export type WizardJetSki = {
  id: string;
  name: string;
  hourlyRate: number;
  halfDayRate: number;
  fullDayRate: number;
  weekendRate: number;
  depositAmount: number;
  /** Identical units in the fleet — the ceiling on jet skis per booking. */
  unitCount: number;
};

/** The $1,000 refundable free-range security deposit, per ski, collected in person. */
const FREE_RANGE_DEPOSIT_LABEL =
  "$1,000 refundable security deposit per jet ski, collected in person.";

type DurationOption = (typeof DURATION_OPTIONS)[number];
type Hold = { bookingId: string; expiresAt: string };

/** Jet skis committed across [hour, hour + 1) on a day. */
function usedAtHour(day: DaySummary, hour: number): number {
  return day.busy
    .filter((b) => b.startHour < hour + 1 && b.endHour > hour)
    .reduce((sum, b) => sum + b.quantity, 0);
}

/** Jet skis still free for every hour of [startHour, startHour + hours) — the
 * client-side mirror of the server's capacity check (server is authoritative). */
function remainingForWindow(
  day: DaySummary | null,
  unitCount: number,
  startHour: number,
  hours: number
): number {
  if (!day || day.blocked) return 0;
  let peak = 0;
  for (let h = startHour; h < startHour + hours; h++) {
    const used = usedAtHour(day, h);
    if (used > peak) peak = used;
  }
  return unitCount - peak;
}

const STEPS = ["Date", "Time", "Details", "Waiver", "Pay"] as const;

const EASE = [0.21, 0.65, 0.36, 1] as const;

/** Direction-aware slide/fade for one-step-at-a-time content. */
const stepVariants = {
  enter: (dir: number) => ({ opacity: 0, x: 24 * dir }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: -24 * dir }),
};

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const cellVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
};

/** Display-only per-ski price mirror of the server's computePrice (server recomputes). */
function priceFor(jetSki: WizardJetSki, opt: DurationOption): number {
  switch (opt.type) {
    case DurationType.HALF_DAY:
      return jetSki.halfDayRate;
    case DurationType.FULL_DAY:
      return jetSki.fullDayRate;
    case DurationType.WEEKEND:
      return jetSki.weekendRate;
    default:
      return jetSki.hourlyRate * opt.hours;
  }
}

/** ms timestamp for the start of `startHour` on `dateKey` in dock time. */
function slotStartMs(dateKey: string, startHour: number): number {
  return Date.parse(`${dateKey}T00:00:00.000Z`) + startHour * 3600_000;
}

/** The date key `n` days after `dateKey` (UTC dock-time convention). */
function addDayKey(dateKey: string, n: number): string {
  const ms = Date.parse(`${dateKey}T00:00:00.000Z`) + n * 24 * 3600_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Weekend rentals run day1 09:00 through day2 21:00. */
const WEEKEND_START_HOUR = 9;
const WEEKEND_END_HOUR = 21;

async function safeError(res: Response, fallback: string): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error || fallback;
  } catch {
    return fallback;
  }
}

/** Animated swap for a money value — the old figure slides out, the new in. */
function AnimatedPrice({ cents, className = "" }: { cents: number; className?: string }) {
  return (
    <span className={`relative inline-block overflow-hidden align-bottom ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={cents}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="inline-block"
        >
          {formatCAD(cents)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Live countdown ring for the 15-minute payment hold. Display-only — the
 * expiry itself is enforced server-side and re-checked in handlePay. */
function HoldCountdown({ expiresAt }: { expiresAt: string }) {
  const totalMs = PENDING_EXPIRY_MINUTES * 60_000;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const remaining = Math.max(0, Date.parse(expiresAt) - now);
  const frac = Math.min(1, remaining / totalMs);
  const mins = Math.floor(remaining / 60_000);
  const secs = Math.floor((remaining % 60_000) / 1000);
  const R = 15.5;
  const C = 2 * Math.PI * R;
  const expired = remaining <= 0;

  return (
    <div
      className={`mt-4 flex items-center gap-3.5 rounded-xl border p-3.5 text-sm ${
        expired
          ? "border-amber-400/30 bg-amber-500/10 text-amber-300"
          : "border-cyan/30 bg-cyan/5 text-cyan-soft"
      }`}
      role="status"
    >
      <svg viewBox="0 0 36 36" className="h-11 w-11 shrink-0 -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="hold-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00dbe7" />
            <stop offset="100%" stopColor="#00f1fe" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r={R} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3.5" />
        <circle
          cx="18"
          cy="18"
          r={R}
          fill="none"
          stroke={expired ? "#d97706" : "url(#hold-ring)"}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      {expired ? (
        <p>
          Your {PENDING_EXPIRY_MINUTES}-minute hold has expired. Clicking pay will try to hold
          the slot again.
        </p>
      ) : (
        <p>
          Your slot is held while you pay.{" "}
          <span className="font-bold tabular-nums">
            {mins}:{String(secs).padStart(2, "0")}
          </span>{" "}
          remaining (until{" "}
          {new Date(expiresAt).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}
          ).
        </p>
      )}
    </div>
  );
}

export default function BookingWizard({
  jetSki,
  waiverText,
  cancelled,
}: {
  jetSki: WizardJetSki;
  waiverText: string;
  cancelled: boolean;
}) {
  const storageKey = `bw-hold-${jetSki.id}`;

  // --- wizard state -------------------------------------------------------
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [duration, setDuration] = useState<DurationOption | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [startHour, setStartHour] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ridingOption, setRidingOption] = useState<RidingOption>(RidingOption.DESIGNATED);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [signedName, setSignedName] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [acks, setAcks] = useState<Acknowledgements>(EMPTY_ACKS);
  const [hold, setHold] = useState<Hold | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [slotTakenMsg, setSlotTakenMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Presentation only: which way the step content slides.
  const prevStepRef = useRef(step);
  const stepDir = step >= prevStepRef.current ? 1 : -1;
  useEffect(() => {
    prevStepRef.current = step;
  }, [step]);

  // --- calendar state -----------------------------------------------------
  const nowKey = todayKey();
  const curYear = Number(nowKey.slice(0, 4));
  const curMonth = Number(nowKey.slice(5, 7));
  const nextCursor =
    curMonth === 12 ? { year: curYear + 1, month: 1 } : { year: curYear, month: curMonth + 1 };
  const [cursor, setCursor] = useState({ year: curYear, month: curMonth });
  const [months, setMonths] = useState<Record<string, MonthData>>({});
  const [monthLoading, setMonthLoading] = useState(false);
  const [day, setDay] = useState<DaySummary | null>(null);
  const [dayLoading, setDayLoading] = useState(false);
  // Day-two availability, fetched only for weekend rentals (day2 may fall in an
  // unfetched next month, so we never read it from the month cache).
  const [weekendDay2, setWeekendDay2] = useState<DaySummary | null>(null);
  const [weekendLoading, setWeekendLoading] = useState(false);

  const atCurrentMonth = cursor.year === curYear && cursor.month === curMonth;

  const loadMonth = useCallback(
    async (year: number, month: number, force = false) => {
      const key = monthKey(year, month);
      if (!force && months[key]) return;
      setMonthLoading(true);
      try {
        const res = await fetch(
          `/api/availability?jetSkiId=${encodeURIComponent(jetSki.id)}&month=${key}`
        );
        if (res.ok) {
          const data = (await res.json()) as MonthData;
          setMonths((m) => ({ ...m, [key]: data }));
        }
      } finally {
        setMonthLoading(false);
      }
    },
    [jetSki.id, months]
  );

  useEffect(() => {
    void loadMonth(cursor.year, cursor.month);
  }, [cursor, loadMonth]);

  const fetchDaySummary = useCallback(
    async (dateKey: string): Promise<DaySummary | null> => {
      try {
        const res = await fetch(
          `/api/availability?jetSkiId=${encodeURIComponent(jetSki.id)}&date=${dateKey}`
        );
        if (!res.ok) return null;
        const d = (await res.json()) as { blocked: boolean; busy: DaySummary["busy"] };
        return { blocked: d.blocked, fullyBooked: false, busy: d.busy };
      } catch {
        return null;
      }
    },
    [jetSki.id]
  );

  const refreshDay = useCallback(
    async (dateKey: string) => {
      setDayLoading(true);
      try {
        setDay(await fetchDaySummary(dateKey));
      } finally {
        setDayLoading(false);
      }
    },
    [fetchDaySummary]
  );

  // Weekend rentals need BOTH the start day and the following day free. Fetch
  // day1 and day1+1 together (two ?date= calls) so we never trust a possibly
  // unfetched next-month cache for day2.
  useEffect(() => {
    if (!selectedDate || duration?.type !== DurationType.WEEKEND) {
      setWeekendDay2(null);
      return;
    }
    let cancelled = false;
    setWeekendLoading(true);
    const day2Key = addDayKey(selectedDate, 1);
    Promise.all([fetchDaySummary(selectedDate), fetchDaySummary(day2Key)]).then(
      ([d1, d2]) => {
        if (cancelled) return;
        setDay(d1);
        setWeekendDay2(d2);
        setWeekendLoading(false);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [selectedDate, duration, fetchDaySummary]);

  // --- cancelled-payment return path --------------------------------------
  const [resumeHold, setResumeHold] = useState<Hold | null>(null);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);
  const checkedCancel = useRef(false);
  useEffect(() => {
    if (!cancelled || checkedCancel.current) return;
    checkedCancel.current = true;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const h = JSON.parse(raw) as Hold;
        if (h.bookingId && h.expiresAt && Date.parse(h.expiresAt) > Date.now() + 30_000) {
          setResumeHold(h);
          return;
        }
        sessionStorage.removeItem(storageKey);
      }
    } catch {
      /* ignore bad storage */
    }
    setCancelMsg(
      "Payment was cancelled and your held slot has been released. Pick a date and time to start again."
    );
  }, [cancelled, storageKey]);

  async function resumePayment() {
    if (!resumeHold) return;
    setSubmitting(true);
    setPayError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: resumeHold.bookingId }),
      });
      if (!res.ok) {
        sessionStorage.removeItem(storageKey);
        setResumeHold(null);
        setCancelMsg(await safeError(res, "That hold is no longer valid. Please start again."));
        setSubmitting(false);
        return;
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch {
      setSubmitting(false);
      setCancelMsg("Something went wrong resuming payment. Please start again.");
      setResumeHold(null);
    }
  }

  function discardResume() {
    sessionStorage.removeItem(storageKey);
    setResumeHold(null);
    setCancelMsg(null);
  }

  // --- derived ------------------------------------------------------------
  const perSkiPrice = duration ? priceFor(jetSki, duration) : 0;
  const totalPrice = perSkiPrice * quantity;
  const depositDue = duration ? bookingDepositFor(totalPrice, quantity) : 0;
  const balanceDue = totalPrice - depositDue;
  const isWeekend = duration?.type === DurationType.WEEKEND;
  const isFreeRange = ridingOption === RidingOption.FREE_RANGE;
  const skiWord = quantity === 1 ? "jet ski" : "jet skis";

  // Every candidate start hour is rendered; busy/past ones come back DISABLED so
  // the grid greys them out instead of hiding them.
  type StartCandidate = {
    hour: number;
    disabled: boolean;
    reason: "booked" | "past" | "short" | null;
    /** Jet skis still free across this window (for the "only N left" hint). */
    remaining: number;
  };

  const startCandidates = useMemo(() => {
    if (!selectedDate || !duration || isWeekend || !day) return [] as StartCandidate[];
    const list: StartCandidate[] = [];
    for (let h = OPEN_HOUR; h + duration.hours <= CLOSE_HOUR; h++) {
      const remaining = remainingForWindow(day, jetSki.unitCount, h, duration.hours);
      // Compare against dock-local now (slot times are UTC-encoded dock time).
      const past = slotStartMs(selectedDate, h) <= dockNowMs();
      // "booked" = nothing left at all; "short" = some left, but fewer than asked.
      const reason = remaining <= 0 ? "booked" : past ? "past" : remaining < quantity ? "short" : null;
      list.push({ hour: h, disabled: reason !== null, reason, remaining });
    }
    return list;
  }, [selectedDate, duration, day, isWeekend, quantity, jetSki.unitCount]);

  const noStartsAvailable =
    startCandidates.length === 0 || startCandidates.every((c) => c.disabled);


  // Weekend availability: day1 free across 09:00-21:00, day2 free across the
  // same window, and the start is still in the future.
  const weekendInfo = useMemo(() => {
    if (!isWeekend || !selectedDate) return null;
    const day2Key = addDayKey(selectedDate, 1);
    const freeOn = (s: DaySummary | null) =>
      s
        ? remainingForWindow(
            s,
            jetSki.unitCount,
            WEEKEND_START_HOUR,
            WEEKEND_END_HOUR - WEEKEND_START_HOUR
          )
        : 0;
    const day1Free = freeOn(day);
    const day2Free = freeOn(weekendDay2);
    const remaining = Math.min(day1Free, day2Free);
    const day1Ok = day1Free >= quantity;
    const day2Ok = day2Free >= quantity;
    const future = slotStartMs(selectedDate, WEEKEND_START_HOUR) > dockNowMs();
    return {
      day2Key,
      day1Ok,
      day2Ok,
      remaining,
      future,
      bookable: day1Ok && day2Ok && future,
    };
  }, [isWeekend, selectedDate, day, weekendDay2, quantity, jetSki.unitCount]);

  // Real start/end datetimes for weekend-safe display (getUTC* on both ends).
  const bookingRange = useMemo(() => {
    if (!selectedDate || startHour === null || !duration) return null;
    const startMs = slotStartMs(selectedDate, startHour);
    return formatBookingRange(new Date(startMs), new Date(startMs + duration.hours * 3600_000));
  }, [selectedDate, startHour, duration]);

  const canContinueStep2 =
    !!duration &&
    (isWeekend ? !!weekendInfo?.bookable : startHour !== null);

  const detailsValid =
    name.trim().length > 0 &&
    /^\S+@\S+\.\S+$/.test(email.trim()) &&
    phone.replace(/\D/g, "").length >= 10;

  const allAcked = acks.legal && acks.id && acks.liability && acks.deposit && acks.terms;
  const waiverValid =
    allAcked &&
    signedName.trim().length > 0 &&
    dob.trim().length > 0 &&
    address.trim().length > 0 &&
    emergencyName.trim().length > 0 &&
    emergencyPhone.replace(/\D/g, "").length >= 10;

  // --- actions ------------------------------------------------------------
  /** Changing the group size can outgrow the start time already picked, so
   * re-check it here rather than reacting to it in an effect. */
  function chooseQuantity(q: number) {
    setQuantity(q);
    if (startHour !== null && !isWeekend && duration) {
      if (remainingForWindow(day, jetSki.unitCount, startHour, duration.hours) < q) {
        setStartHour(null);
      }
    }
  }

  function selectDate(dateKey: string) {
    setSelectedDate(dateKey);
    setStartHour(null);
    setSlotTakenMsg(null);
    void refreshDay(dateKey);
    setStep(2);
  }

  function continueFromDetails() {
    if (!detailsValid) {
      setDetailsError("Please enter your name, a valid email, and a phone number with at least 10 digits.");
      return;
    }
    setDetailsError(null);
    setStep(4);
  }

  async function handlePay() {
    if (!selectedDate || !duration || startHour === null) return;
    setSubmitting(true);
    setPayError(null);
    try {
      // 1. Create (or reuse) the 15-minute PENDING hold.
      let bookingId =
        hold && Date.parse(hold.expiresAt) > Date.now() + 10_000 ? hold.bookingId : null;
      if (!bookingId) {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jetSkiId: jetSki.id,
            dateKey: selectedDate,
            startHour,
            durationType: duration.type,
            hours: duration.hours,
            quantity,
            ridingOption,
            customerName: name,
            email,
            phone,
          }),
        });
        if (res.status === 409) {
          const msg = await safeError(res, "That slot was just taken.");
          setHold(null);
          setStartHour(null);
          setSlotTakenMsg(`${msg} Please pick another time.`);
          await refreshDay(selectedDate);
          void loadMonth(Number(selectedDate.slice(0, 4)), Number(selectedDate.slice(5, 7)), true);
          setStep(2);
          setSubmitting(false);
          return;
        }
        if (!res.ok) throw new Error(await safeError(res, "Could not create your booking."));
        const data = (await res.json()) as Hold & {
          quantity: number;
          totalPrice: number;
          depositPaid: number;
          balanceDue: number;
        };
        bookingId = data.bookingId;
        const h: Hold = { bookingId: data.bookingId, expiresAt: data.expiresAt };
        setHold(h);
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(h));
        } catch {
          /* storage unavailable — resume-after-cancel just won't be offered */
        }
      }

      // 2. Record the signed waiver (required before payment).
      const w = await fetch("/api/waiver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          signedName,
          agreed: allAcked,
          email: email.trim(),
          dateOfBirth: dob,
          address,
          emergencyContactName: emergencyName,
          emergencyContactPhone: emergencyPhone,
        }),
      });
      if (!w.ok) throw new Error(await safeError(w, "Could not record your waiver signature."));

      // 3. Start checkout and redirect.
      const c = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      if (c.status === 410 || c.status === 409) {
        setHold(null);
        sessionStorage.removeItem(storageKey);
        throw new Error(await safeError(c, "Your 15-minute hold expired. Please try again."));
      }
      if (!c.ok) throw new Error(await safeError(c, "Could not start the payment session."));
      const { url } = (await c.json()) as { url: string };
      window.location.href = url; // keep the button disabled while redirecting
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  // --- render helpers -----------------------------------------------------
  const backBtn = (to: number) => (
    <Button type="button" variant="outline" onClick={() => setStep(to)} disabled={submitting}>
      Back
    </Button>
  );

  return (
    <Card className="p-5 sm:p-7">
      {/* Progress indicator — gradient fill bar + step dots */}
      <nav aria-label="Booking steps" className="mb-7">
        <div className="relative grid grid-cols-5">
          {/* track between first and last dot centers */}
          <div className="absolute left-[10%] right-[10%] top-[6px] h-1 rounded-full bg-surface-high" aria-hidden />
          <motion.div
            className="absolute left-[10%] top-[6px] h-1 max-w-[80%] rounded-full bg-gradient-to-r from-cyan-dim to-cyan shadow-[0_0_10px_rgba(0,241,254,0.5)]"
            initial={false}
            animate={{ width: `${((step - 1) / (STEPS.length - 1)) * 80}%` }}
            transition={{ duration: 0.45, ease: EASE }}
            aria-hidden
          />
          {STEPS.map((label, i) => {
            const n = i + 1;
            const state = n < step ? "done" : n === step ? "current" : "todo";
            return (
              <div key={label} className="relative flex flex-col items-center gap-1.5">
                {state === "current" ? (
                  <motion.span
                    key={`dot-${step}`}
                    initial={{ scale: 0.4 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="h-4 w-4 rounded-full bg-cyan shadow-[0_0_12px_rgba(0,241,254,0.7)] ring-4 ring-cyan/20"
                  />
                ) : (
                  <span
                    className={`h-4 w-4 rounded-full transition-colors duration-300 ${
                      state === "done"
                        ? "bg-cyan shadow-[0_0_8px_rgba(0,241,254,0.5)]"
                        : "border-2 border-outline-variant bg-surface"
                    }`}
                  />
                )}
                <span
                  className={`font-label text-[10px] font-bold uppercase tracking-wide sm:text-[11px] ${
                    state === "current"
                      ? "text-cyan"
                      : state === "done"
                        ? "text-ink-muted"
                        : "text-outline"
                  }`}
                  aria-current={state === "current" ? "step" : undefined}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Cancelled-payment banners */}
      {resumeHold && (
        <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-amber-200">Payment cancelled. Your slot is still held.</p>
          <p className="mt-1 text-sm text-amber-300">
            Your booking is reserved until{" "}
            {new Date(resumeHold.expiresAt).toLocaleTimeString("en-CA", {
              hour: "numeric",
              minute: "2-digit",
            })}
            . You can finish paying now, or start over.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={resumePayment} disabled={submitting}>
              {submitting ? "Redirecting…" : "Resume payment"}
            </Button>
            <Button type="button" variant="outline" onClick={discardResume} disabled={submitting}>
              Start over
            </Button>
          </div>
        </div>
      )}
      {cancelMsg && !resumeHold && (
        <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-300">
          {cancelMsg}
        </div>
      )}

      {/* One step at a time, slide/fade between them */}
      <AnimatePresence mode="wait" custom={stepDir} initial={false}>
        <motion.div
          key={step}
          custom={stepDir}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3, ease: EASE }}
        >
          {/* Step 1 — Date */}
          {step === 1 && (
            <div>
              <h2 className="mb-4 text-lg font-bold text-ink">Choose a date</h2>
              <MonthCalendar
                year={cursor.year}
                month={cursor.month}
                data={months[monthKey(cursor.year, cursor.month)] ?? null}
                loading={monthLoading && !months[monthKey(cursor.year, cursor.month)]}
                selectedDate={selectedDate}
                canPrev={!atCurrentMonth}
                canNext={atCurrentMonth}
                onPrev={() => setCursor({ year: curYear, month: curMonth })}
                onNext={() => setCursor(nextCursor)}
                onSelect={selectDate}
              />
            </div>
          )}

          {/* Step 2 — Duration + start time */}
          {step === 2 && selectedDate && (
            <div>
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold text-ink">Pick your time</h2>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm font-medium text-cyan transition-colors hover:text-cyan-soft"
                >
                  {formatDate(selectedDate)} · change
                </button>
              </div>

              {slotTakenMsg && (
                <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3.5 text-sm text-red-300">
                  {slotTakenMsg}
                </div>
              )}

              {/* Group bookings: one reservation can hold several jet skis for
                  the same slot, capped by what the fleet has free. */}
              {jetSki.unitCount > 1 && (
                <div className="mb-6">
                  <p className="mb-2 font-label text-xs font-bold uppercase tracking-wide text-outline">
                    How many jet skis?
                  </p>
                  <div
                    className="flex flex-wrap gap-2"
                    role="radiogroup"
                    aria-label="Number of jet skis"
                  >
                    {Array.from({ length: jetSki.unitCount }, (_, i) => i + 1).map((q) => {
                      const selected = quantity === q;
                      return (
                        <motion.button
                          key={q}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => chooseQuantity(q)}
                          role="radio"
                          aria-checked={selected}
                          aria-label={`${q} ${q === 1 ? "jet ski" : "jet skis"}`}
                          className={`h-12 w-12 rounded-xl border text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                            selected
                              ? "border-cyan bg-cyan text-surface-lowest glow-cyan"
                              : "border-outline text-ink hover:border-cyan hover:text-cyan-soft"
                          }`}
                        >
                          {q}
                        </motion.button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-outline">
                    Riding with friends? Reserve up to {jetSki.unitCount} jet skis on one booking —
                    same date, same time slot. Rates and the {formatCAD(BOOKING_DEPOSIT_CENTS)}{" "}
                    deposit are per jet ski.
                  </p>
                </div>
              )}

              <p className="mb-2 font-label text-xs font-bold uppercase tracking-wide text-outline">How long do you want to ride?</p>

              {/* Speedometer visual — reflects the selected duration index (purely decorative) */}
              <div className="mb-4 px-1">
                <div className="speedometer-track">
                  {(() => {
                    const selIndex = DURATION_OPTIONS.findIndex(
                      (o) => duration?.type === o.type && duration?.hours === o.hours
                    );
                    const pct =
                      DURATION_OPTIONS.length > 1 && selIndex >= 0
                        ? (selIndex / (DURATION_OPTIONS.length - 1)) * 100
                        : selIndex >= 0
                          ? 100
                          : 0;
                    return (
                      <>
                        <div className="speedometer-fill" style={{ width: `${pct}%` }} aria-hidden />
                        <div className="speedometer-thumb" style={{ left: `${pct}%` }} aria-hidden />
                      </>
                    );
                  })()}
                </div>
              </div>

              <motion.div
                variants={gridVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 gap-2 sm:grid-cols-3"
                role="radiogroup"
                aria-label="Rental duration"
              >
                {DURATION_OPTIONS.map((opt) => {
                  const selected = duration?.type === opt.type && duration?.hours === opt.hours;
                  return (
                    <motion.button
                      key={`${opt.type}-${opt.hours}`}
                      variants={cellVariants}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={() => {
                        setDuration(opt);
                        setStartHour(opt.type === DurationType.WEEKEND ? WEEKEND_START_HOUR : null);
                      }}
                      className={`rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                        selected
                          ? "border-l-4 border-l-cyan border-y-cyan/40 border-r-cyan/40 bg-surface-high glow-cyan"
                          : "border-outline bg-surface-high hover:border-cyan"
                      }`}
                      role="radio"
                      aria-checked={selected}
                    >
                      <span className="block text-sm font-semibold text-ink">{opt.label}</span>
                      <span
                        className={`mt-0.5 block text-sm font-semibold ${
                          selected ? "gradient-text" : "text-cyan"
                        }`}
                      >
                        {formatCAD(priceFor(jetSki, opt) * quantity)}
                      </span>
                      {quantity > 1 && (
                        <span className="mt-0.5 block text-[11px] text-outline">
                          {formatCAD(priceFor(jetSki, opt))} x {quantity}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>

              {/* Weekend rentals: fixed two-day window, no start-hour grid. */}
              {duration && isWeekend && (
                <div className="mt-6">
                  <p className="mb-2 font-label text-xs font-bold uppercase tracking-wide text-outline">Your weekend</p>
                  {weekendLoading ? (
                    <p className="py-4 text-sm text-outline">Checking availability…</p>
                  ) : weekendInfo?.bookable ? (
                    <div className="rounded-xl border border-cyan/30 bg-surface-high p-4 text-sm text-ink glow-cyan">
                      <p className="font-semibold">
                        Starts {formatHour(WEEKEND_START_HOUR)} on {formatDate(selectedDate)}, ends{" "}
                        {formatHour(WEEKEND_END_HOUR)} on {formatDate(weekendInfo.day2Key)}.
                      </p>
                      <p className="mt-1 text-ink-muted">Two full days on the water.</p>
                    </div>
                  ) : (
                    <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-300">
                      {!weekendInfo?.future
                        ? "That start date has already passed. Please pick a future date."
                        : `${
                            weekendInfo.remaining > 0
                              ? `Only ${weekendInfo.remaining} jet ski${
                                  weekendInfo.remaining === 1 ? " is" : "s are"
                                } free across that whole weekend`
                              : "No jet skis are free across that whole weekend"
                          }. Weekend rentals need both ${formatDate(selectedDate)} and ${formatDate(
                            weekendInfo.day2Key
                          )}. Try fewer jet skis or another start date.`}
                    </p>
                  )}
                </div>
              )}

              {/* Hourly / half / full day: grid of start hours, busy ones greyed. */}
              {duration && !isWeekend && (
                <div className="mt-6">
                  <p className="mb-2 font-label text-xs font-bold uppercase tracking-wide text-outline">Start time</p>
                  {dayLoading ? (
                    <p className="py-4 text-sm text-outline">Checking availability…</p>
                  ) : noStartsAvailable ? (
                    <p className="rounded-xl border border-outline-variant bg-surface-low p-4 text-sm text-ink-muted">
                      No {duration.label.toLowerCase()} start times on this day fit {quantity}{" "}
                      {skiWord}. Try fewer jet skis, a shorter duration, or another date.
                    </p>
                  ) : (
                    <motion.div
                      key={`slots-${duration.type}-${duration.hours}`}
                      variants={gridVariants}
                      initial="hidden"
                      animate="show"
                      className="grid grid-cols-3 gap-2 sm:grid-cols-4"
                      role="radiogroup"
                      aria-label="Start time"
                    >
                      {startCandidates.map((c) =>
                        c.disabled ? (
                          <motion.div
                            key={c.hour}
                            variants={cellVariants}
                            className="flex flex-col items-center justify-center rounded-xl border border-outline-variant/40 bg-surface-low py-2.5 text-outline/60"
                            aria-disabled="true"
                            aria-label={`${formatHour(c.hour)} ${
                              c.reason === "past"
                                ? "(past)"
                                : c.reason === "short"
                                  ? `(only ${c.remaining} left)`
                                  : "(booked)"
                            }`}
                          >
                            <span className="text-sm font-semibold line-through">{formatHour(c.hour)}</span>
                            <span className="mt-0.5 font-label text-[9px] font-bold uppercase tracking-wide">
                              {c.reason === "past"
                                ? "Past"
                                : c.reason === "short"
                                  ? `${c.remaining} left`
                                  : "Booked"}
                            </span>
                          </motion.div>
                        ) : (
                          <motion.button
                            key={c.hour}
                            variants={cellVariants}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => setStartHour(c.hour)}
                            className={`rounded-xl border py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                              startHour === c.hour
                                ? "border-cyan bg-cyan text-surface-lowest glow-cyan"
                                : "border-outline text-ink hover:border-cyan hover:text-cyan-soft"
                            }`}
                            role="radio"
                            aria-checked={startHour === c.hour}
                          >
                            {formatHour(c.hour)}
                          </motion.button>
                        )
                      )}
                    </motion.div>
                  )}
                </div>
              )}

              {duration && (
                <div className="mt-6 space-y-2 rounded-xl border border-cyan/20 bg-surface-high p-4 text-sm">
                  <div className="flex justify-between text-ink-muted">
                    <span>
                      Rental total{quantity > 1 ? ` (${quantity} ${skiWord})` : ""}
                    </span>
                    <span className="font-semibold text-ink">{formatCAD(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between border-t border-outline-variant/50 pt-2 text-ink-muted">
                    <span>Deposit due today</span>
                    <AnimatedPrice cents={depositDue} className="gradient-text font-bold" />
                  </div>
                  <div className="flex justify-between text-ink-muted">
                    <span>Balance at the dock</span>
                    <span className="font-semibold text-ink">{formatCAD(balanceDue)}</span>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-between gap-3">
                {backBtn(1)}
                <Button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!canContinueStep2}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 — Details */}
          {step === 3 && (
            <div>
              <h2 className="mb-4 text-lg font-bold text-ink">Your details</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="bw-name">Full name</Label>
                  <Input
                    id="bw-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jordan Rivers"
                    autoComplete="name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="bw-email">Email</Label>
                  <Input
                    id="bw-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    inputMode="email"
                    required
                  />
                  <p className="mt-1 text-xs text-outline">Your confirmation will be sent here.</p>
                </div>
                <div>
                  <Label htmlFor="bw-phone">Phone</Label>
                  <Input
                    id="bw-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(343) 000-0000"
                    autoComplete="tel"
                    inputMode="tel"
                    required
                  />
                </div>

                <div>
                  <Label>Riding option</Label>
                  <div className="mt-1 grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Riding option">
                    {(
                      [
                        {
                          value: RidingOption.DESIGNATED,
                          title: "Designated riding area",
                          subtitle: "No security deposit. Ride within our marked area.",
                        },
                        {
                          value: RidingOption.FREE_RANGE,
                          title: "Free range",
                          subtitle:
                            "$1,000 refundable security deposit per jet ski, collected in person before launch.",
                        },
                      ] as const
                    ).map((opt) => {
                      const selected = ridingOption === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRidingOption(opt.value)}
                          role="radio"
                          aria-checked={selected}
                          className={`rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                            selected
                              ? "border-cyan bg-cyan/5 glow-cyan"
                              : "border-outline bg-surface-high hover:border-cyan"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                                selected ? "border-cyan" : "border-outline"
                              }`}
                            >
                              {selected && <span className="h-2 w-2 rounded-full bg-cyan" />}
                            </span>
                            <span className="text-sm font-semibold text-ink">{opt.title}</span>
                          </span>
                          <span className="mt-1.5 block text-xs leading-relaxed text-ink-muted">
                            {opt.subtitle}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              {detailsError && <p className="mt-3 text-sm text-red-300">{detailsError}</p>}
              <div className="mt-6 flex justify-between gap-3">
                {backBtn(2)}
                <Button type="button" onClick={continueFromDetails}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 4 — Waiver */}
          {step === 4 && (
            <div>
              <h2 className="mb-1 text-lg font-bold text-ink">Liability waiver</h2>
              <p className="mb-4 text-sm text-ink-muted">
                Please read the full agreement, then sign by typing your name.
              </p>
              <WaiverStep
                waiverText={waiverText}
                dob={dob}
                address={address}
                emergencyName={emergencyName}
                emergencyPhone={emergencyPhone}
                signedName={signedName}
                acks={acks}
                onDob={setDob}
                onAddress={setAddress}
                onEmergencyName={setEmergencyName}
                onEmergencyPhone={setEmergencyPhone}
                onSignedName={setSignedName}
                onAck={(key, v) => setAcks((prev) => ({ ...prev, [key]: v }))}
              />
              <div className="mt-6 flex justify-between gap-3">
                {backBtn(3)}
                <Button
                  type="button"
                  onClick={() => setStep(5)}
                  disabled={!waiverValid}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 5 — Review & pay */}
          {step === 5 && selectedDate && duration && startHour !== null && (
            <div>
              <h2 className="mb-4 text-lg font-bold text-ink">Review &amp; pay</h2>
              <motion.dl
                variants={gridVariants}
                initial="hidden"
                animate="show"
                className="space-y-2.5 rounded-xl border border-outline-variant bg-surface-low p-4 text-sm sm:p-5"
              >
                {[
                  ["Jet ski", `${jetSki.name} × ${quantity}`],
                  ["Date", formatDate(selectedDate)],
                  ["Time", bookingRange ?? ""],
                  ["Duration", duration.label],
                  [
                    "Riding",
                    isFreeRange ? "Free range" : "Designated riding area",
                  ],
                  ["Rider", `${name.trim()} · ${email.trim()}`],
                  ["Waiver", `Signed by ${signedName.trim()}`],
                  ["Rental total", formatCAD(totalPrice)],
                ].map(([k, v]) => (
                  <motion.div key={k} variants={cellVariants} className="flex justify-between gap-4">
                    <dt className="text-outline">{k}</dt>
                    <dd className="text-right font-medium text-ink">{v}</dd>
                  </motion.div>
                ))}
                <motion.div variants={cellVariants} className="space-y-2.5 border-t border-outline-variant/50 pt-2.5">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-outline">
                      Deposit due today
                      {quantity > 1 && (
                        <span className="block text-xs text-outline/80">
                          {formatCAD(BOOKING_DEPOSIT_CENTS)} × {quantity} {skiWord}
                        </span>
                      )}
                    </dt>
                    <dd className="rounded-full bg-cyan px-2.5 py-0.5 text-xs font-bold text-surface-lowest glow-cyan">
                      {formatCAD(depositDue)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-outline">Balance at the dock</dt>
                    <dd className="font-semibold text-ink">{formatCAD(balanceDue)}</dd>
                  </div>
                  {isFreeRange && (
                    <p className="text-xs leading-relaxed text-ink-muted">
                      Plus a {FREE_RANGE_DEPOSIT_LABEL}
                    </p>
                  )}
                </motion.div>
              </motion.dl>

              {/* The deposit terms the customer is agreeing to, stated plainly
                  right where they pay. */}
              <div className="mt-4 rounded-xl border border-outline-variant bg-surface-low p-4 text-xs leading-relaxed text-ink-muted">
                <p className="text-sm font-semibold text-ink">How payment works</p>
                <ul className="mt-2 space-y-1.5">
                  <li>
                    You pay a {formatCAD(BOOKING_DEPOSIT_CENTS)} deposit per jet ski today
                    ({formatCAD(depositDue)}). It is not an extra fee — it comes off your rental
                    total.
                  </li>
                  <li>
                    The remaining {formatCAD(balanceDue)} is due when you arrive, before you ride.
                    We take card (tap, chip, or phone) and cash.
                  </li>
                  <li>
                    Cancel at least {CANCEL_CUTOFF_HOURS} hours before your start time and your
                    deposit is refunded in full.{" "}
                    <span className="font-semibold text-amber-300">
                      Late cancellations and no-shows forfeit the deposit.
                    </span>
                  </li>
                  <li>
                    If we cancel — bad weather or anything on our end — you keep your deposit or get
                    a full refund.
                  </li>
                </ul>
              </div>

              {hold ? (
                <HoldCountdown expiresAt={hold.expiresAt} />
              ) : (
                <p className="mt-4 text-xs text-outline">
                  Clicking pay holds your {skiWord} for {PENDING_EXPIRY_MINUTES} minutes while you
                  complete payment securely.
                </p>
              )}

              {payError && (
                <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3.5 text-sm text-red-300">
                  {payError}
                </div>
              )}

              <div className="mt-6 flex justify-between gap-3">
                {backBtn(4)}
                <Button type="button" onClick={handlePay} disabled={submitting} className="min-w-44">
                  {submitting ? "Processing…" : `Pay ${formatCAD(depositDue)} deposit`}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Card>
  );
}
