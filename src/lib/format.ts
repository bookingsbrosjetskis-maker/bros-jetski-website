const cadFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

/** Format integer cents as CAD, e.g. 12500 -> "$125.00". */
export function formatCAD(cents: number): string {
  return cadFormatter.format(cents / 100);
}

/** "2026-07-07" key for a Date, in UTC (booking days are stored as UTC midnight). */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parse a "YYYY-MM-DD" key to a Date at UTC midnight. */
export function fromDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/** The dock's civil timezone. Slot datetimes are stored as UTC that *represents*
 * this local wall-clock time, so "now" comparisons must be made in the same
 * encoding — see dockNowMs / dockTodayKey below. */
export const DOCK_TIMEZONE = "America/Toronto";

function dockParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DOCK_TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(now);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)!.value;
  // Some engines emit "24" for midnight; normalize to "00".
  const hour = get("hour") === "24" ? "00" : get("hour");
  return { y: get("year"), mo: get("month"), d: get("day"), h: hour, mi: get("minute"), s: get("second") };
}

/** Current dock wall-clock time encoded as a UTC instant, matching how slot
 * datetimes are stored. Use this — NOT Date.now() — to compare against slot
 * start/end times (e.g. "is this slot in the past?"). */
export function dockNowMs(now: Date = new Date()): number {
  const p = dockParts(now);
  return Date.parse(`${p.y}-${p.mo}-${p.d}T${p.h}:${p.mi}:${p.s}.000Z`);
}

/** Today's date key ("YYYY-MM-DD") in dock local time. */
export function dockTodayKey(now: Date = new Date()): string {
  const p = dockParts(now);
  return `${p.y}-${p.mo}-${p.d}`;
}

/** Human date like "July 7, 2026" from a UTC-midnight date or date key. */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? fromDateKey(date) : date;
  return d.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "10:00 AM" from an hour number (0-23). */
export function formatHour(hour: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:00 ${hour < 12 ? "AM" : "PM"}`;
}

/** "10:00 AM to 2:00 PM" for a single-day slot given a start hour and length. */
export function formatSlot(startHour: number, hours: number): string {
  return `${formatHour(startHour)} to ${formatHour(startHour + hours)}`;
}

/** Human date + time like "Sat, Aug 1, 9:00 AM" from a UTC-encoded local time. */
function formatDayTime(d: Date): string {
  const date = d.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${date}, ${formatHour(d.getUTCHours())}`;
}

/**
 * Human-readable range for any booking, from its stored start/end datetimes.
 * Same-day slots read "9:00 AM to 5:00 PM"; multi-day (weekend) rentals read
 * "Sat, Aug 1, 9:00 AM to Sun, Aug 2, 9:00 PM". Never prints raw hour counts.
 */
export function formatBookingRange(startTime: Date, endTime: Date): string {
  const sameDay =
    startTime.getUTCFullYear() === endTime.getUTCFullYear() &&
    startTime.getUTCMonth() === endTime.getUTCMonth() &&
    startTime.getUTCDate() === endTime.getUTCDate();
  if (sameDay) {
    return `${formatHour(startTime.getUTCHours())} to ${formatHour(endTime.getUTCHours())}`;
  }
  return `${formatDayTime(startTime)} to ${formatDayTime(endTime)}`;
}
