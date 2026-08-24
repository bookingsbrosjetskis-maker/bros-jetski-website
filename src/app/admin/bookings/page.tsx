import Link from "next/link";
import { prisma } from "@/lib/db";
import { expireStaleBookings } from "@/lib/booking";
import { BookingStatus, RidingOption, SLOT_HOLDING_STATUSES } from "@/lib/constants";
import {
  formatBookingRange,
  formatCAD,
  formatDate,
  formatSlot,
  formatHour,
  toDateKey,
} from "@/lib/format";
import { Badge, Card } from "@/components/ui";
import { statusColor } from "@/components/admin/status";
import ApiActionButton from "@/components/admin/ApiActionButton";

export const dynamic = "force-dynamic";

const STATUS_TABS = ["ALL", ...Object.values(BookingStatus)] as const;

type SearchParams = Promise<{ view?: string; status?: string; month?: string }>;

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function BookingActions({ id, status }: { id: string; status: string }) {
  const canComplete = status === BookingStatus.CONFIRMED;
  const canCancel =
    status === BookingStatus.PENDING || status === BookingStatus.CONFIRMED;
  if (!canComplete && !canCancel) {
    return <span className="text-xs text-outline">None</span>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {canComplete && (
        <ApiActionButton
          url={`/api/admin/bookings/${id}`}
          body={{ action: "complete" }}
          confirmText="Mark this booking as completed?"
          variant="secondary"
          small
        >
          Complete
        </ApiActionButton>
      )}
      {canCancel && (
        <ApiActionButton
          url={`/api/admin/bookings/${id}`}
          body={{ action: "cancel" }}
          confirmText="Cancel this booking? Its time slot will be freed immediately."
          variant="danger"
          small
        >
          Cancel
        </ApiActionButton>
      )}
    </div>
  );
}

function tabLabel(s: string) {
  return s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase();
}

/** Human label for a booking's riding option. */
function ridingLabel(option: string) {
  return option === RidingOption.FREE_RANGE ? "Free range" : "Designated";
}

/* ------------------------------------------------------------------ */
/* List view                                                           */
/* ------------------------------------------------------------------ */

async function ListView({ status }: { status: string }) {
  const where =
    status !== "ALL" && (Object.values(BookingStatus) as string[]).includes(status)
      ? { status }
      : {};
  const bookings = await prisma.booking.findMany({
    where,
    include: {
      jetSki: { select: { name: true } },
      waiver: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <>
      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((s) => (
          <Link
            key={s}
            href={s === "ALL" ? "/admin/bookings" : `/admin/bookings?status=${s}`}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              status === s
                ? "bg-cyan/15 text-cyan ring-1 ring-inset ring-cyan/40"
                : "bg-surface-mid text-ink-muted ring-1 ring-inset ring-outline-variant hover:text-cyan"
            }`}
          >
            {tabLabel(s)}
          </Link>
        ))}
      </div>

      {bookings.length === 0 ? (
        <Card className="p-8 text-center text-sm text-ink-muted">
          No {status === "ALL" ? "" : status.toLowerCase() + " "}bookings found.
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="font-label border-b border-outline-variant bg-surface-low text-xs font-bold uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Jet ski</th>
                  <th className="px-4 py-3">Riding</th>
                  <th className="px-4 py-3">Date &amp; time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Money</th>
                  <th className="px-4 py-3">Waiver</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {bookings.map((b) => (
                  <tr key={b.id} className="align-top transition-colors hover:bg-surface-high">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{b.customerName}</p>
                      <p className="text-xs text-ink-muted">{b.email}</p>
                      <p className="text-xs text-ink-muted">{b.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {b.jetSki.name}
                      <span className="ml-1 font-semibold text-ink">x{b.quantity}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={b.ridingOption === RidingOption.FREE_RANGE ? "amber" : "slate"}>
                        {ridingLabel(b.ridingOption)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      <p>{formatDate(toDateKey(b.startTime))}</p>
                      <p className="text-xs text-ink-muted">
                        {formatBookingRange(b.startTime, b.endTime)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={statusColor(b.status)}>{b.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      <p className="font-medium text-ink">{formatCAD(b.totalPrice)} total</p>
                      <p className="text-xs text-emerald-300">
                        {formatCAD(b.depositPaid)} deposit paid
                      </p>
                      <p className="text-xs font-semibold text-amber-300">
                        collect {formatCAD(b.balanceDue)}
                      </p>
                      {b.securityDeposit > 0 && (
                        <p className="text-xs text-ink-muted">
                          + {formatCAD(b.securityDeposit)} security hold
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {b.waiver ? (
                        <Badge color="green">Signed</Badge>
                      ) : (
                        <span className="text-xs text-outline">Not signed</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <BookingActions id={b.id} status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {bookings.map((b) => (
              <Card key={b.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{b.customerName}</p>
                    <p className="truncate text-xs text-ink-muted">{b.email}</p>
                  </div>
                  <Badge color={statusColor(b.status)}>{b.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-ink-muted">
                  {b.jetSki.name} x{b.quantity} · {ridingLabel(b.ridingOption)}
                </p>
                <p className="text-sm text-ink-muted">
                  {formatDate(toDateKey(b.startTime))}
                </p>
                <p className="text-sm text-ink-muted">
                  {formatBookingRange(b.startTime, b.endTime)}
                </p>
                <p className="mt-1 text-sm text-ink">
                  {formatCAD(b.totalPrice)} total{" "}
                  <span className="text-xs text-emerald-300">
                    ({formatCAD(b.depositPaid)} paid)
                  </span>{" "}
                  <span className="text-xs font-semibold text-amber-300">
                    collect {formatCAD(b.balanceDue)}
                  </span>
                  {b.securityDeposit > 0 && (
                    <span className="text-xs text-ink-muted">
                      {" "}
                      + {formatCAD(b.securityDeposit)} security hold
                    </span>
                  )}
                  {b.waiver && (
                    <Badge color="green" className="ml-2">
                      Waiver signed
                    </Badge>
                  )}
                </p>
                <div className="mt-3">
                  <BookingActions id={b.id} status={b.status} />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Calendar view                                                       */
/* ------------------------------------------------------------------ */

function shiftMonth(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

async function CalendarView({ monthKey }: { monthKey: string }) {
  const [y, m] = monthKey.split("-").map(Number);
  const monthStart = new Date(Date.UTC(y, m - 1, 1));
  const monthEnd = new Date(Date.UTC(y, m, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const leadingBlanks = monthStart.getUTCDay(); // 0 = Sunday

  // expireStaleBookings() already ran, so every remaining PENDING row still
  // holds its slot — a plain status filter is enough here.
  const bookings = await prisma.booking.findMany({
    where: {
      startTime: { gte: monthStart, lt: monthEnd },
      status: { in: [...SLOT_HOLDING_STATUSES] },
    },
    include: { jetSki: { select: { name: true } } },
    orderBy: { startTime: "asc" },
  });

  const byDay = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const key = toDateKey(b.startTime);
    const list = byDay.get(key);
    if (list) list.push(b);
    else byDay.set(key, [b]);
  }

  const monthLabel = monthStart.toLocaleDateString("en-CA", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const todayKey = toDateKey(new Date());

  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const navBtn =
    "rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium text-ink-muted hover:border-cyan hover:text-cyan";

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">{monthLabel}</h2>
        <div className="flex gap-2">
          <Link
            href={`/admin/bookings?view=calendar&month=${shiftMonth(monthKey, -1)}`}
            className={navBtn}
          >
            ← Prev
          </Link>
          <Link href="/admin/bookings?view=calendar" className={navBtn}>
            Today
          </Link>
          <Link
            href={`/admin/bookings?view=calendar&month=${shiftMonth(monthKey, 1)}`}
            className={navBtn}
          >
            Next →
          </Link>
        </div>
      </div>

      {/* Month grid: desktop only (needs 760px width) */}
      <Card className="hidden overflow-x-auto md:block">
        <div className="min-w-[760px]">
          <div className="font-label grid grid-cols-7 border-b border-outline-variant bg-surface-low text-center text-xs font-bold uppercase tracking-wide text-ink-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="px-2 py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (day === null) {
                return <div key={i} className="min-h-24 border-b border-r border-outline-variant/40 bg-surface-low/40" />;
              }
              const key = `${monthKey}-${String(day).padStart(2, "0")}`;
              const dayBookings = byDay.get(key) ?? [];
              const isToday = key === todayKey;
              return (
                <div
                  key={i}
                  className={`min-h-24 border-b border-r border-outline-variant/40 p-1.5 ${
                    isToday ? "bg-cyan/10" : ""
                  }`}
                >
                  <p
                    className={`mb-1 text-xs font-semibold ${
                      isToday ? "text-cyan" : "text-ink-muted"
                    }`}
                  >
                    {day}
                  </p>
                  <div className="space-y-1">
                    {dayBookings.map((b) => (
                      <div
                        key={b.id}
                        title={`${b.jetSki.name} x${b.quantity} · ${b.customerName}, ${formatSlot(
                          b.startTime.getUTCHours(),
                          b.hours
                        )} (${b.status})`}
                        className={`truncate rounded px-1.5 py-0.5 text-[11px] leading-4 ${
                          b.status === BookingStatus.PENDING
                            ? "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-400/30"
                            : "bg-cyan/15 text-cyan-soft ring-1 ring-inset ring-cyan/25"
                        }`}
                      >
                        {b.jetSki.name} x{b.quantity} · {formatHour(b.startTime.getUTCHours())} ·{" "}
                        {b.hours}h
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Mobile agenda: days with bookings, no horizontal scroll */}
      <div className="space-y-3 md:hidden">
        {byDay.size === 0 ? (
          <Card className="p-4">
            <p className="text-sm text-ink-muted">No slot-holding bookings this month.</p>
          </Card>
        ) : (
          [...byDay.entries()].map(([key, dayBookings]) => (
            <Card key={key} className={`p-4 ${key === todayKey ? "ring-1 ring-cyan/40" : ""}`}>
              <p className="font-display text-sm font-bold text-ink">
                {formatDate(key)}
                {key === todayKey && (
                  <span className="font-label ml-2 text-xs font-bold uppercase tracking-wide text-cyan">
                    Today
                  </span>
                )}
              </p>
              <div className="mt-2 space-y-1.5">
                {dayBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-surface-low px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-sm text-ink">
                      {b.jetSki.name} x{b.quantity} · {b.customerName}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs text-ink-muted">
                        {formatSlot(b.startTime.getUTCHours(), b.hours)}
                      </span>
                      <Badge color={statusColor(b.status)}>{b.status}</Badge>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>

      <p className="text-xs text-ink-muted">
        Showing slot-holding bookings (pending, confirmed, completed). Amber entries
        are unpaid pending holds.
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const view = params.view === "calendar" ? "calendar" : "list";
  const status =
    params.status && (STATUS_TABS as readonly string[]).includes(params.status)
      ? params.status
      : "ALL";
  const monthKey =
    params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month)
      ? params.month
      : toDateKey(new Date()).slice(0, 7);

  await expireStaleBookings();

  const toggle = (active: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
      active
        ? "bg-cyan/15 text-cyan ring-1 ring-inset ring-cyan/40"
        : "bg-surface-mid text-ink-muted ring-1 ring-inset ring-outline-variant hover:text-cyan"
    }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Bookings</h1>
        <div className="flex gap-2">
          <Link href="/admin/bookings" className={toggle(view === "list")}>
            List
          </Link>
          <Link
            href="/admin/bookings?view=calendar"
            className={toggle(view === "calendar")}
          >
            Calendar
          </Link>
        </div>
      </div>

      {view === "calendar" ? (
        <CalendarView monthKey={monthKey} />
      ) : (
        <ListView status={status} />
      )}
    </div>
  );
}
