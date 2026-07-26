"use client";

// A dependency-free month calendar for picking a rental date.
// All day math uses UTC (date keys are UTC midnights — the app's dock-time
// convention), never local Date constructors.

import { dockTodayKey, formatDate } from "@/lib/format";

export type DaySummary = {
  blocked: boolean;
  fullyBooked: boolean;
  busy: { startHour: number; endHour: number }[];
};

export type MonthData = { days: Record<string, DaySummary> };

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Today's date key in dock local time (so the current day doesn't flip early
 * in the evening when UTC rolls over ahead of the dock). */
export function todayKey(): string {
  return dockTodayKey();
}

export default function MonthCalendar({
  year,
  month, // 1-12
  data,
  loading,
  selectedDate,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onSelect,
}: {
  year: number;
  month: number;
  data: MonthData | null;
  loading: boolean;
  selectedDate: string | null;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (dateKey: string) => void;
}) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const today = todayKey();

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${monthKey(year, month)}-${String(d).padStart(2, "0")}`);
  }

  const navBtn =
    "flex h-11 w-11 items-center justify-center rounded-lg border border-outline-variant text-ink-muted transition-colors hover:border-cyan hover:text-cyan disabled:opacity-30 disabled:pointer-events-none";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={onPrev} disabled={!canPrev} className={navBtn} aria-label="Previous month">
          <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current" aria-hidden>
            <path d="M12.7 15.3a1 1 0 01-1.4 1.4l-6-6a1 1 0 010-1.4l6-6a1 1 0 111.4 1.4L7.4 10l5.3 5.3z" />
          </svg>
        </button>
        <p className="text-base font-semibold text-ink">
          {MONTH_NAMES[month - 1]} {year}
        </p>
        <button type="button" onClick={onNext} disabled={!canNext} className={navBtn} aria-label="Next month">
          <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current" aria-hidden>
            <path d="M7.3 4.7a1 1 0 011.4-1.4l6 6a1 1 0 010 1.4l-6 6a1 1 0 11-1.4-1.4L12.6 10 7.3 4.7z" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <div key={w} className="font-label py-1 text-xs font-bold uppercase tracking-wide text-outline">
            {w}
          </div>
        ))}
        {cells.map((key, i) => {
          if (!key) return <div key={`blank-${i}`} />;
          const summary = data?.days[key];
          const isPast = key < today;
          const isBlocked = summary?.blocked ?? false;
          const isFull = summary?.fullyBooked ?? false;
          const disabled = loading || isPast || isBlocked || isFull;
          const isSelected = key === selectedDate;
          const dayNum = Number(key.slice(-2));

          let cls =
            "relative flex h-11 items-center justify-center rounded-lg text-sm font-medium transition-colors sm:h-12";
          if (isSelected) {
            cls += " bg-cyan text-surface-lowest font-bold shadow-[0_0_15px_rgba(0,241,254,0.4)]";
          } else if (disabled) {
            cls += isPast || loading
              ? " text-outline/60"
              : " text-outline/60 line-through";
          } else {
            cls += " text-ink hover:bg-surface-high hover:text-cyan-soft";
            if (key === today) cls += " ring-1 ring-inset ring-cyan";
          }

          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(key)}
              className={cls}
              aria-pressed={isSelected}
              aria-label={formatDate(key) + (isBlocked ? " (unavailable)" : isFull ? " (fully booked)" : "")}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-outline">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan shadow-[0_0_8px_rgba(0,241,254,0.6)]" /> Selected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full ring-1 ring-inset ring-cyan" /> Today
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-outline/60 line-through">15</span> Unavailable
        </span>
      </div>

      {loading && <p className="mt-3 text-sm text-outline">Checking availability…</p>}
    </div>
  );
}
