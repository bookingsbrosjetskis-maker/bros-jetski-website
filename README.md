# Bros Jetskis Rental

A production-ready jet ski rental booking website for Ottawa, Ontario (all prices CAD). Customers browse the fleet, pick a time slot on a live availability calendar, sign a digital waiver, and pay in full through Stripe Checkout — fully self-serve, no phone confirmation. Admins manage bookings, the fleet, blocked dates, the gallery, and safety checklists from a protected dashboard.

**Stack:** Next.js 16 (App Router, TypeScript), Tailwind CSS v4, Prisma 6 + SQLite (dev) / Postgres (prod), Stripe Checkout, Resend (or console-stub) email.

## Setup

```bash
npm install
cp .env.example .env        # then edit — at minimum set a random AUTH_SECRET
npx prisma db push          # create the SQLite database
npx prisma db seed          # 1 jet ski, admin user, site content, starter gallery (no reviews yet)
npm run dev                 # http://localhost:3000
```

Requires Node 20+.

## Admin login (seeded)

- URL: <http://localhost:3000/admin>
- Email: `admin@jetski.local` (override with `ADMIN_EMAIL`)
- Password: `admin123` (override with `ADMIN_PASSWORD`)

The seed reads `ADMIN_EMAIL` / `ADMIN_PASSWORD` from the environment. **Set `ADMIN_PASSWORD` before seeding any real deployment** — the seed prints a warning when it falls back to the default. The login page no longer displays any credentials.

## Payments: mock mode vs Stripe test mode

**In local development with no Stripe key, checkout is mocked** (`MOCK_PAYMENTS="true"` in the sample `.env`): the checkout step instantly "pays" and redirects to the confirmation page, so you can exercise the whole flow. The confirmation email is printed to the dev-server console (email stub).

Payments **fail closed in production**: if `NODE_ENV=production` and `STRIPE_SECRET_KEY` is unset, the app throws unless you explicitly set `MOCK_PAYMENTS="true"`. It will not silently confirm bookings for free.

To use real **Stripe test mode**:

1. Grab test keys from <https://dashboard.stripe.com/test/apikeys> and set `STRIPE_SECRET_KEY=sk_test_...` in `.env` (and `MOCK_PAYMENTS="false"`).
2. Book a rental and pay with Stripe's test card: `4242 4242 4242 4242`, any future expiry, any CVC, any postal code. Decline card: `4000 0000 0000 0002`.
3. The success page verifies the Checkout Session server-side, so **webhooks are optional in local dev**. To also test the webhook path:

   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

   and copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`.

## Pages & features

**Public:** Home (dark cinematic hero with a looping muted video and photo poster), Fleet & Rates, Safety & FAQ, Reviews (with a public "leave a review" form that enters the moderation queue), About, Gallery (real photos/videos, admin-managed), Corporate & Events, Gift Cards, Contact, Terms of Service, Privacy Policy, a self-serve booking wizard, and the post-payment Rental Boat Safety Checklist.

**Customer self-service** — `/my-booking`: look up a booking by reference + email, view a status timeline, download an `.ics` calendar file, and self-cancel up to **12 hours** before the rental (which frees the slot and sends a cancellation email).

**Admin** (`/admin`, auth-protected): dashboard with revenue/booking analytics (animated stat tiles + inline SVG charts, no chart library); bookings list + month calendar; fleet CRUD; blocked dates; gallery manager (upload/caption/reorder/delete); safety-checklist submissions; review moderation; contact messages; and a **Content** editor for the Safety/FAQ and contact-info pages.

## Business rules (enforced server-side)

- **No double-booking** — every booking is created inside a serializable Prisma transaction (`src/lib/booking.ts#createPendingBooking`) that re-checks overlaps and blocked dates before inserting; serialization conflicts map to a clean 409. Proven by `tests/` (`npm test`).
- **Single write path** — status transitions go through `createPendingBooking` / `confirmBooking` / `cancelBooking` / `completeBooking` in `src/lib/booking.ts`.
- **Blocked dates** (per unit or fleet-wide) override availability everywhere, and are re-checked at confirmation.
- A booking is **PENDING (slot held) for 15 minutes**; it becomes CONFIRMED only after successful payment. Overdue holds are lazily expired by every availability check — no cron needed.
- The **waiver must be signed before payment** (authorized by matching email), and its exact text is snapshotted per signature.
- **Dock-local time** — slot times are stored as UTC that represents local dock time; past/future checks use a dock-timezone-aware "now" (`src/lib/format.ts#dockNowMs`).

## Tests

```bash
npm test   # vitest — double-booking, overlap, blocked-date, expiry, weekend, pricing, cancellation, timezone
```

## Deploying to production (Vercel + Postgres + real Stripe)

1. **Database** — provision Postgres (Vercel Postgres/Neon/Supabase). In `prisma/schema.prisma` change the datasource provider from `sqlite` to `postgresql` (the schema is Postgres-compatible), set `DATABASE_URL`, then run `npx prisma migrate deploy` (generate migrations with `npx prisma migrate dev` first) and `npx prisma db seed` once.
2. **Vercel** — import the repo, framework preset Next.js. Add environment variables: `DATABASE_URL`, `AUTH_SECRET` (long random string — `openssl rand -base64 32`), `NEXT_PUBLIC_BASE_URL` (your production origin, e.g. `https://brosjetskisrental.ca`), `STRIPE_SECRET_KEY` (live key `sk_live_...`), `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY` + `EMAIL_FROM` (verified sender domain), `MOCK_PAYMENTS=false`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NOTIFY_EMAIL`. For admin gallery uploads on Vercel, set `BLOB_READ_WRITE_TOKEN` (Vercel Blob).
3. **Stripe webhook** — in the Stripe dashboard add an endpoint `https://<your-domain>/api/webhooks/stripe` for the `checkout.session.completed` event; copy its signing secret into `STRIPE_WEBHOOK_SECRET`. In production the webhook is the source of truth for confirmations (the success-page verification remains as a fallback for fast redirects).
4. **Email** — create a Resend account, verify your domain, set `RESEND_API_KEY` and `EMAIL_FROM`; without it, confirmations are only logged to the server console.
5. **Hardening checklist** — set `ADMIN_PASSWORD`, review the waiver text and the Terms/Privacy pages with a lawyer, confirm `dev.db` and `.env` are git-ignored (they are), and update contact info / policies via the seeded `SiteContent` rows.

## Project layout

```text
prisma/            schema + seed
src/lib/           domain kernel: booking transaction & availability, auth (JWT cookie),
                   Stripe (incl. mock mode), email stub, rate limiter, constants, formatting
src/components/    shared UI + booking wizard + checklist + admin components
src/app/           public pages, /book wizard, /checklist, /admin dashboard, /api routes
tests/             vitest suites (booking conflicts, pricing, cancellation, timezone)
```

See `SCOPE.md` for intentional simplifications.
