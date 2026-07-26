import { prisma } from "@/lib/db";
import { formatDate, fromDateKey, toDateKey } from "@/lib/format";
import { Badge, Card } from "@/components/ui";
import { reasonColor } from "@/components/admin/status";
import BlockForm from "@/components/admin/BlockForm";
import ApiActionButton from "@/components/admin/ApiActionButton";

export const dynamic = "force-dynamic";

export default async function BlockedDatesPage() {
  const today = fromDateKey(toDateKey(new Date()));
  const [blocks, skis] = await Promise.all([
    prisma.blockedDate.findMany({
      where: { date: { gte: today } },
      include: { jetSki: { select: { name: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.jetSki.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
        Blocked dates
      </h1>

      <Card className="p-6">
        <h2 className="font-display mb-4 text-lg font-bold text-ink">Add a block</h2>
        <BlockForm skis={skis} />
      </Card>

      <Card className="p-6">
        <h2 className="font-display mb-4 text-lg font-bold text-ink">
          Upcoming blocks
        </h2>
        {blocks.length === 0 ? (
          <p className="text-sm text-ink-muted">No upcoming blocked dates.</p>
        ) : (
          <ul className="divide-y divide-outline-variant/50">
            {blocks.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">
                    {formatDate(b.date)}{" · "}
                    {b.jetSki ? b.jetSki.name : "All units"}
                  </p>
                  {b.note && (
                    <p className="truncate text-sm text-ink-muted">{b.note}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge color={reasonColor(b.reason)}>{b.reason}</Badge>
                  <ApiActionButton
                    url={`/api/admin/blocks/${b.id}`}
                    method="DELETE"
                    confirmText="Remove this block? The date becomes bookable again."
                    variant="danger"
                    small
                  >
                    Delete
                  </ApiActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
