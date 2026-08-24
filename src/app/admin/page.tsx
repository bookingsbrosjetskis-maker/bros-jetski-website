import Link from "next/link";
import { prisma } from "@/lib/db";
import { expireStaleBookings } from "@/lib/booking";
import { BookingStatus, SLOT_HOLDING_STATUSES } from "@/lib/constants";
import { formatCAD, formatDate, formatSlot, fromDateKey, toDateKey } from "@/lib/format";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { statusColor } from "@/components/admin/status";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import BarChart, { type BarChartDatum } from "@/components/admin/BarChart";
import { emailConfigStatus } from "@/lib/email";

export const dynamic = "force-dynamic";

const REVENUE_STATUSES = [BookingStatus.CONFIRMED, BookingStatus.COMPLETED];

function StatCard({
  label,
  value,
  href,
  currency = false,
}: {
  label: string;
  value: number;
  href: string;
  currency?: boolean;
}) {
  return (
    <Link href={href} className="block">
      <Card hover className="glass p-5">
        <p className="font-display text-3xl font-extrabold tracking-tight text-ink">
          <AnimatedNumber value={value} currency={currency} />
        </p>
        <p className="font-label mt-1 text-xs font-bold uppercase tracking-[0.1em] text-cyan">{label}</p>
      </Card>
    </Link>
  );
}

export default async function AdminDashboard() {
  await expireStaleBookings();
  const now = new Date();
  const todayStart = fromDateKey(toDateKey(now));
  const todayEnd = new Date(todayStart.getTime() + 24 * 3600_000);
  const weekEnd = new Date(todayStart.getTime() + 8 * 24 * 3600_000);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const chartStart = new Date(todayStart.getTime() - 29 * 24 * 3600_000); // last 30 days incl today
  const weeksStart = new Date(todayStart.getTime() - 55 * 24 * 3600_000); // last 8 weeks

  const [
    monthBookings,
    pendingHolds,
    unreadMessages,
    upcoming,
    monthRevenueRows,
    dayRows,
    weekRevenueRows,
    fleet,
  ] = await Promise.all([
    prisma.booking.count({
      where: { startTime: { gte: monthStart, lt: monthEnd }, status: { in: [...SLOT_HOLDING_STATUSES] } },
    }),
    prisma.booking.count({ where: { status: BookingStatus.PENDING, expiresAt: { gt: now } } }),
    prisma.contactMessage.count({ where: { read: false } }),
    prisma.booking.findMany({
      where: { status: BookingStatus.CONFIRMED, startTime: { gte: todayStart, lt: weekEnd } },
      include: { jetSki: { select: { name: true } } },
      orderBy: { startTime: "asc" },
    }),
    prisma.booking.findMany({
      where: { status: { in: REVENUE_STATUSES }, startTime: { gte: monthStart, lt: monthEnd } },
      select: { totalPrice: true, balanceDue: true },
    }),
    prisma.booking.findMany({
      where: { status: { in: [...SLOT_HOLDING_STATUSES] }, startTime: { gte: chartStart, lt: todayEnd } },
      select: { startTime: true },
    }),
    prisma.booking.findMany({
      where: { status: { in: REVENUE_STATUSES }, startTime: { gte: weeksStart, lt: todayEnd } },
      select: { startTime: true, totalPrice: true },
    }),
    prisma.jetSki.findMany({
      where: { active: true },
      select: { id: true, name: true },
    }),
  ]);

  const monthRevenue = monthRevenueRows.reduce((sum, r) => sum + r.totalPrice, 0);
  // Only the deposit is taken online, so the rest is still to be collected at
  // the dock. Worth its own tile — it is real money the owner has to chase.
  const monthToCollect = monthRevenueRows.reduce((sum, r) => sum + r.balanceDue, 0);

  // Bookings-per-day, last 30 days.
  const dayCounts = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(chartStart.getTime() + i * 24 * 3600_000);
    dayCounts.set(toDateKey(d), 0);
  }
  for (const r of dayRows) {
    const k = toDateKey(r.startTime);
    dayCounts.set(k, (dayCounts.get(k) ?? 0) + 1);
  }
  const dayData: BarChartDatum[] = [...dayCounts.entries()].map(([k, v]) => ({
    label: k.slice(5).replace("-", "/"),
    value: v,
  }));

  // Revenue-per-week, last 8 weeks.
  const weekData: BarChartDatum[] = [];
  for (let w = 7; w >= 0; w--) {
    const wStart = new Date(todayStart.getTime() - w * 7 * 24 * 3600_000 - 6 * 24 * 3600_000);
    const wEnd = new Date(wStart.getTime() + 7 * 24 * 3600_000);
    const total = weekRevenueRows
      .filter((r) => r.startTime >= wStart && r.startTime < wEnd)
      .reduce((sum, r) => sum + r.totalPrice, 0);
    weekData.push({ label: `${toDateKey(wStart).slice(5).replace("-", "/")}`, value: total });
  }

  // Fleet performance (all-time confirmed+completed).
  const perf = await Promise.all(
    fleet.map(async (f) => {
      const rows = await prisma.booking.findMany({
        where: { jetSkiId: f.id, status: { in: REVENUE_STATUSES } },
        select: { totalPrice: true },
      });
      return {
        name: f.name,
        count: rows.length,
        revenue: rows.reduce((sum, r) => sum + r.totalPrice, 0),
      };
    })
  );
  perf.sort((a, b) => b.revenue - a.revenue);
  const maxRevenue = Math.max(1, ...perf.map((p) => p.revenue));

  const todayKey = toDateKey(todayStart);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-muted">{formatDate(todayKey)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Booked value (month)"
          value={monthRevenue}
          href="/admin/bookings?status=CONFIRMED"
          currency
        />
        <StatCard
          label="To collect at dock"
          value={monthToCollect}
          href="/admin/bookings?status=CONFIRMED"
          currency
        />
        <StatCard label="Bookings this month" value={monthBookings} href="/admin/bookings" />
        <StatCard label="Pending holds" value={pendingHolds} href="/admin/bookings?status=PENDING" />
        <StatCard label="Unread messages" value={unreadMessages} href="/admin/messages" />
      </div>

      <EmailStatusPanel />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display mb-4 text-sm font-bold text-ink">Bookings per day · last 30 days</h2>
          <BarChart title="Bookings per day, last 30 days" data={dayData} />
        </Card>
        <Card className="p-6">
          <h2 className="font-display mb-4 text-sm font-bold text-ink">Booked value per week · last 8 weeks</h2>
          <BarChart
            title="Booked rental value per week, last 8 weeks"
            data={weekData}
            formatValue={(v) => formatCAD(v)}
          />
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-display mb-4 text-sm font-bold text-ink">Fleet performance · all-time</h2>
        {perf.length === 0 ? (
          <p className="text-sm text-ink-muted">No active jet skis.</p>
        ) : (
          <ul className="space-y-3">
            {perf.map((p) => (
              <li key={p.name}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium text-ink">{p.name}</span>
                  <span className="text-ink-muted">
                    {p.count} {p.count === 1 ? "booking" : "bookings"} · {formatCAD(p.revenue)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-high">
                  <div
                    className="h-full rounded-full bg-cyan glow-cyan"
                    style={{ width: `${Math.max(3, (p.revenue / maxRevenue) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">Confirmed today &amp; next 7 days</h2>
          <Link href="/admin/bookings" className="text-sm font-medium text-cyan hover:text-cyan-soft">
            All bookings →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-sm text-ink-muted">No confirmed bookings in this window.</p>
        ) : (
          <ul className="divide-y divide-outline-variant/50">
            {upcoming.map((b) => {
              const dateKey = toDateKey(b.startTime);
              return (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {dateKey === todayKey ? "Today" : formatDate(dateKey)} ·{" "}
                      {formatSlot(b.startTime.getUTCHours(), b.hours)}
                    </p>
                    <p className="truncate text-sm text-ink-muted">
                      {b.jetSki.name} · {b.customerName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-ink">{formatCAD(b.totalPrice)}</span>
                    <Badge color={statusColor(b.status)}>{b.status}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/admin/bookings?view=calendar" variant="secondary">Booking calendar</ButtonLink>
        <ButtonLink href="/admin/content" variant="secondary">Edit site content</ButtonLink>
        <ButtonLink href="/admin/fleet/new" variant="secondary">Add jet ski</ButtonLink>
        <ButtonLink href="/admin/blocked-dates" variant="secondary">Block a date</ButtonLink>
      </div>
    </div>
  );
}

/**
 * Whether notification email is actually working, and what is left to set.
 * Every alert on this site is email, so silent misconfiguration means missed
 * bookings and enquiries -- this makes that visible instead of invisible.
 */
function EmailStatusPanel() {
  const status = emailConfigStatus();
  const ok = status.warnings.length === 0;

  return (
    <Card className={`p-6 ${ok ? "" : "ring-1 ring-amber-400/30"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-bold text-ink">Email notifications</h2>
        <Badge color={ok ? "green" : "amber"}>{ok ? "Live" : "Needs setup"}</Badge>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-ink-muted">Sending</dt>
          <dd className="text-ink">{status.live ? "Yes, via Resend" : "No — written to the server log only"}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-ink-muted">From address</dt>
          <dd className="break-all text-right text-ink">{status.from}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-ink-muted">Owner alerts go to</dt>
          <dd className="break-all text-right text-ink">{status.adminInbox || "nobody"}</dd>
        </div>
      </dl>

      {ok ? (
        <p className="mt-4 text-xs leading-relaxed text-ink-muted">
          Booking confirmations, cancellations, safety checklists, enquiries, and review alerts are
          all being delivered.
        </p>
      ) : (
        <ul className="mt-4 space-y-2 text-xs leading-relaxed text-amber-200">
          {status.warnings.map((w) => (
            <li key={w} className="flex gap-2">
              <span aria-hidden>•</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
