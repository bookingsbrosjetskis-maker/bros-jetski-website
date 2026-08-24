// Enum-like string constants (SQLite has no native enums).
// Keep these in sync with the comments in prisma/schema.prisma.

export const BookingStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const DurationType = {
  HOURLY: "HOURLY",
  HALF_DAY: "HALF_DAY",
  FULL_DAY: "FULL_DAY",
  WEEKEND: "WEEKEND",
} as const;
export type DurationType = (typeof DurationType)[keyof typeof DurationType];

export const RidingOption = {
  /** Ride within the designated riding area. No security deposit. */
  DESIGNATED: "DESIGNATED",
  /** Ride outside the designated area. $1,000 refundable security deposit
   * per jet ski, collected in person before launch (never charged online). */
  FREE_RANGE: "FREE_RANGE",
} as const;
export type RidingOption = (typeof RidingOption)[keyof typeof RidingOption];

export const BlockReason = {
  MAINTENANCE: "MAINTENANCE",
  WEATHER: "WEATHER",
  OTHER: "OTHER",
} as const;
export type BlockReason = (typeof BlockReason)[keyof typeof BlockReason];

/** Operating hours (local dock time): rentals start no earlier than OPEN_HOUR
 * and must end by CLOSE_HOUR. */
export const OPEN_HOUR = 9;
export const CLOSE_HOUR = 21;

/** A weekend rental runs day 1 at OPEN_HOUR through day 2 at CLOSE_HOUR. */
export const WEEKEND_HOURS = 24 + (CLOSE_HOUR - OPEN_HOUR); // 36

/** Allowed rental durations in hours, by type. */
export const DURATION_OPTIONS: { type: DurationType; hours: number; label: string }[] = [
  { type: DurationType.HOURLY, hours: 1, label: "1 hour" },
  { type: DurationType.HOURLY, hours: 2, label: "2 hours" },
  { type: DurationType.HOURLY, hours: 3, label: "3 hours" },
  { type: DurationType.HALF_DAY, hours: 4, label: "Half day (4 hours)" },
  { type: DurationType.FULL_DAY, hours: 8, label: "Full day (8 hours)" },
  { type: DurationType.WEEKEND, hours: WEEKEND_HOURS, label: "Weekend (2 days)" },
];

/** Minutes an unpaid PENDING booking holds its slot before expiring. */
export const PENDING_EXPIRY_MINUTES = 15;

/** Booking deposit charged online, per jet ski, in cents. It is not an extra
 * fee: it comes off the rental total, and the balance is paid at the dock. */
export const BOOKING_DEPOSIT_CENTS = 5000; // $50.00 CAD per jet ski

/** Hard upper bound on jet skis per booking, independent of fleet size. Real
 * availability is capped by the jet ski's unitCount; this only stops absurd
 * request payloads. */
export const MAX_BOOKING_QUANTITY = 10;

/** Deposit charged online for `quantity` skis. Clamped to the rental total so
 * we can never take more online than the rental is worth. */
export function bookingDepositFor(totalPrice: number, quantity: number): number {
  return Math.min(BOOKING_DEPOSIT_CENTS * quantity, totalPrice);
}

/** Customers may self-cancel up to this many hours before their start time
 * (matches the posted 12-hour cancellation policy). Cancelling at or before
 * this cutoff refunds the booking deposit; inside it — or not showing up —
 * forfeits the deposit. */
export const CANCEL_CUTOFF_HOURS = 12;

/** One-sentence deposit policy, reused across the site so the wording never
 * drifts between the booking flow, emails, and the legal pages. */
export const DEPOSIT_POLICY_SHORT = `Cancel at least ${CANCEL_CUTOFF_HOURS} hours before your start time and your deposit is refunded in full. Late cancellations and no-shows forfeit the deposit. If we cancel — weather or anything on our end — you keep your deposit or get a full refund.`;

/** Booking statuses that occupy a time slot (EXPIRED/CANCELLED never do;
 * PENDING only while expiresAt is in the future — callers add that check). */
export const SLOT_HOLDING_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
];

export const SITE_NAME = "Bros Jetskis Rental";
export const SITE_SLOGAN = "Ride the River. Make Memories";
export const SITE_PHONE = "+1 (343) 324-0433";
export const SITE_ADDRESS = "Blair Boat Launch, Ottawa, ON";
export const SITE_HOURS = "Monday to Sunday, 9:00 AM to sunset (May to September)";
export const SITE_INSTAGRAM = {
  handle: "Bros_jetskis_rental",
  url: "https://www.instagram.com/Bros_jetskis_rental",
};
export const SITE_TIKTOK = {
  handle: "bros_jetskis_rent",
  url: "https://www.tiktok.com/@bros_jetskis_rent",
};
