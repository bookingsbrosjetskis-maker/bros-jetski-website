-- One-time backfill for the group-booking + deposit release (August 2026).
--
-- Run this ONCE, right after `npm run db:push` applies the new columns:
--   quantity, depositPaid, balanceDue on "Booking"; unitCount on "JetSki".
-- The `depositAmount` column is unchanged — Prisma now calls it
-- `securityDeposit` (see the @map in schema.prisma), so no data moves.
--
-- Running it twice is harmless: every statement is idempotent.

-- 1. Fleet size. Adjust the number if you buy or retire a jet ski (or just
--    edit it in Admin > Fleet > Units in fleet).
UPDATE "JetSki" SET "unitCount" = 3 WHERE "unitCount" < 3;

-- 2. Bookings taken before this release were charged the FULL rental price
--    online, so their deposit is the whole amount and nothing is owed at the
--    dock. Without this they would show a balance the customer already paid.
UPDATE "Booking"
SET "depositPaid" = "totalPrice",
    "balanceDue"  = 0
WHERE "status" IN ('CONFIRMED', 'COMPLETED')
  AND "depositPaid" = 0;

-- 3. Unpaid holds and dead bookings never took money; leave depositPaid at 0
--    and just record what would have been owed.
UPDATE "Booking"
SET "balanceDue" = "totalPrice"
WHERE "status" IN ('PENDING', 'EXPIRED', 'CANCELLED')
  AND "depositPaid" = 0
  AND "balanceDue" = 0;
