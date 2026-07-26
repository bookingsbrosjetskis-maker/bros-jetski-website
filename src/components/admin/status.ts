// Shared display maps for admin pages.
import { BlockReason, BookingStatus } from "@/lib/constants";

export type BadgeColor = "blue" | "green" | "amber" | "red" | "slate";

export const bookingStatusColor: Record<BookingStatus, BadgeColor> = {
  [BookingStatus.PENDING]: "amber",
  [BookingStatus.CONFIRMED]: "green",
  [BookingStatus.COMPLETED]: "blue",
  [BookingStatus.CANCELLED]: "red",
  [BookingStatus.EXPIRED]: "slate",
};

export const blockReasonColor: Record<BlockReason, BadgeColor> = {
  [BlockReason.MAINTENANCE]: "amber",
  [BlockReason.WEATHER]: "blue",
  [BlockReason.OTHER]: "slate",
};

export function statusColor(status: string): BadgeColor {
  return bookingStatusColor[status as BookingStatus] ?? "slate";
}

export function reasonColor(reason: string): BadgeColor {
  return blockReasonColor[reason as BlockReason] ?? "slate";
}
