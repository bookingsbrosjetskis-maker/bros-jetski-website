import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatCAD } from "@/lib/format";
import { Badge, ButtonLink, Card } from "@/components/ui";
import ApiActionButton from "@/components/admin/ApiActionButton";

export const dynamic = "force-dynamic";

export default async function FleetPage() {
  const skis = await prisma.jetSki.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { bookings: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Fleet</h1>
        <ButtonLink href="/admin/fleet/new">Add jet ski</ButtonLink>
      </div>

      {skis.length === 0 ? (
        <Card className="p-8 text-center text-sm text-ink-muted">
          No jet skis yet. Add your first unit.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {skis.map((s) => (
            <Card key={s.id} hover className={`p-5 ${s.active ? "" : "opacity-75"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-display truncate text-base font-bold text-ink">
                    {s.name}
                  </h2>
                  <p className="text-sm text-ink-muted">
                    {s.model} · {s.horsepower} HP · {s.seats}{" "}
                    {s.seats === 1 ? "seat" : "seats"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {s.featured && <Badge color="blue">Featured</Badge>}
                  {s.active ? (
                    <Badge color="green">Active</Badge>
                  ) : (
                    <Badge color="slate">Inactive</Badge>
                  )}
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-muted">Hourly</dt>
                  <dd className="font-medium text-ink">{formatCAD(s.hourlyRate)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-muted">Half day</dt>
                  <dd className="font-medium text-ink">{formatCAD(s.halfDayRate)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-muted">Full day</dt>
                  <dd className="font-medium text-ink">{formatCAD(s.fullDayRate)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-muted">Weekend</dt>
                  <dd className="font-medium text-ink">{formatCAD(s.weekendRate)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-muted">Deposit</dt>
                  <dd className="font-medium text-ink">
                    {formatCAD(s.depositAmount)}
                  </dd>
                </div>
              </dl>

              <p className="mt-3 text-xs text-ink-muted">
                {s._count.bookings} booking{s._count.bookings === 1 ? "" : "s"} ·{" "}
                <span className="break-all">{s.imageUrl}</span>
              </p>

              <div className="mt-4 flex gap-2">
                <Link
                  href={`/admin/fleet/${s.id}`}
                  className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-semibold text-ink-muted hover:border-cyan hover:text-cyan"
                >
                  Edit
                </Link>
                <ApiActionButton
                  url={`/api/admin/fleet/${s.id}`}
                  method="DELETE"
                  confirmText={`Delete "${s.name}"? If it has booking history it will be deactivated instead of deleted.`}
                  variant="danger"
                  small
                >
                  Delete
                </ApiActionButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
