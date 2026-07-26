# SCOPE.md — intentional simplifications & stubs

Things deliberately stubbed or simplified in this build, and what production hardening would look like.

## Payments
- **Customers pay the full rental price online** (hourly / half-day / full-day / weekend). Stripe charges `booking.totalPrice`.
- **Free-range security deposit is collected in person, not online.** Riders who choose the free-range option owe a refundable $1,000 security deposit per jet ski, taken at the dock before launch and returned after. It is stored on `booking.depositAmount` (0 for designated-area riders) and is never part of the Stripe charge.
- **Mock-payment mode**: when `STRIPE_SECRET_KEY` is empty (or `MOCK_PAYMENTS=true`), checkout is simulated: the "pay" step redirects straight to the success page and the booking confirms. This exists so the full flow is testable with zero setup. With a Stripe test key set, the real Checkout Session flow (webhook + server-side session verification) is used.
- **No refund automation**: cancelling a booking (admin or customer self-cancel via `/my-booking`) only changes its status and emails the customer; the Stripe refund itself is done manually in the Stripe dashboard (the email promises 5 to 10 business days). A production version would call `stripe.refunds.create` per the 12-hour cancellation policy.
- Stripe Checkout session expiry is aligned to the booking hold, but Stripe enforces a 30-minute minimum: a payment completed between minute 15 and 30 is still honored if the slot wasn't re-booked (see `confirmBooking`'s re-check), otherwise flagged as refund-required.

## Email
- With no `RESEND_API_KEY`, confirmation and cancellation emails are printed to the dev-server console (spec'd dev stub). Plain-text only; no HTML template, no reminder emails. Booking confirmation and cancellation are both implemented (`src/lib/email.ts`).

## Media & content
- **Real client photos and videos are wired in** (`/public/photos/*.jpg`, `/public/videos/*.mp4`): the home hero is a looping muted background video, and the gallery mixes the real photos and videos. The admin fleet editor takes an image *path/URL* — there is no file-upload pipeline (production: S3/UploadThing/Vercel Blob), so new photos are added by dropping files in `/public` and referencing their path.
- The contact page embeds a **real (keyless) Google Maps iframe** for Blair Boat Launch, Ottawa.
- Safety/FAQ and contact-info content are editable through the admin **Content** editor (`/admin/content`, backed by `/api/admin/content/[key]` with per-key shape validation). Only those two `SiteContent` keys have an editor UI.

## Legal
- **The liability waiver text in `src/lib/waiver-text.ts` is a working placeholder.** The client's official rental agreement and liability waiver will replace it before launch. The exact text a customer agrees to is snapshotted onto their `Waiver` row, so swapping this text never alters what someone already signed.
- Terms & Conditions and Privacy Policy pages are not built (client had none at handoff).

## Animations (v2)
- Motion is provided by the `motion` (Framer Motion) library plus CSS keyframes in `globals.css`. All of it respects `prefers-reduced-motion` (global CSS reset + `MotionConfig reducedMotion="user"` in `app/template.tsx`). The public site uses a full-dark theme with an electric-cyan accent; the admin stays deliberately low-animation and functional.

## Auth
- **Single seeded admin user**, simple email+password with a signed JWT cookie (12 h). No registration, password reset, rate limiting, or 2FA. Customers intentionally have no accounts (per spec).

## Scheduling model
- Whole-day blocks only (a `BlockedDate` blocks the entire day for a unit or the fleet); no partial-day maintenance windows.
- Slots start on whole hours between 09:00 and 21:00 (configurable in `src/lib/constants.ts`); a single dock-local timezone is assumed. Slot datetimes are stored as UTC values that *represent* local dock time, which keeps availability math trivial and portable but means genuine multi-timezone support would need rework.
- **Weekend (2-day) rentals** are modelled as a single booking running day 1 at 09:00 through day 2 at 21:00 (`durationType="WEEKEND"`, `hours=36`). They reuse the same interval-overlap and blocked-date logic, so a weekend blocks both days and any booking on either day blocks the weekend.
- **Lazy expiry instead of cron**: overdue 15-minute holds are expired by the next availability read/write rather than a scheduled job. A stale hold can briefly appear in the admin list as PENDING past expiry until any availability check runs; it can never block a real booking, since every booking write expires stale holds first.

## Database
- Dev runs SQLite; the schema is Postgres-compatible and the switch is a one-line provider change (see README). Because SQLite lacks native enums, statuses are strings validated in application code (`src/lib/constants.ts`). On Postgres you could tighten these to real enums + a range exclusion constraint as defense-in-depth; the serializable transaction in `src/lib/booking.ts` is the enforced guarantee on both databases.
- `prisma db push` is used instead of versioned migrations (fine for a greenfield dev DB; use `prisma migrate` once in production).

## Misc
- No pagination anywhere (fleet/bookings/reviews lists are small-business scale).
- No analytics, sitemap/SEO beyond basic metadata, i18n (English only), or rate limiting on public POST endpoints (contact form / booking / review APIs). Add rate limiting before real launch.
- Reviews launch empty (new business). Customers submit reviews through the public form on `/reviews`; they appear once an admin approves them under `/admin/reviews`.
- The site is seeded with **one jet ski** (2023 Sea-Doo Spark Trixx). Additional units can be added via `/admin/fleet` and the whole booking/showcase flow scales to multiple units.
