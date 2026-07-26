import { prisma } from "@/lib/db";
import { formatBookingRange, formatDate, toDateKey } from "@/lib/format";
import { CHECKLIST_DETAIL_FIELDS } from "@/lib/checklist";
import { Badge, Card } from "@/components/ui";
import ApiActionButton from "@/components/admin/ApiActionButton";

export const dynamic = "force-dynamic";

type Responses = { items?: Record<string, boolean>; details?: Record<string, string> };

function parseResponses(json: string): Responses {
  try {
    return JSON.parse(json) as Responses;
  } catch {
    return {};
  }
}

export default async function AdminChecklistsPage() {
  const checklists = await prisma.safetyChecklist.findMany({
    include: { booking: true },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
  });

  const submitted = checklists.filter((c) => c.submittedAt);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
          Safety checklists
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Customers complete the Transport Canada Rental Boat Safety Checklist online after paying.
          Remember to co-sign it at the dock and keep a copy on board.
        </p>
      </div>

      {submitted.length === 0 ? (
        <Card className="p-8 text-center text-sm text-ink-muted">
          No checklists submitted yet. A link is emailed to each customer when their booking is
          confirmed.
        </Card>
      ) : (
        <div className="space-y-3">
          {submitted.map((c) => {
            const responses = parseResponses(c.responsesJson);
            return (
              <Card key={c.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{c.booking.customerName}</p>
                      {c.read ? (
                        <Badge color="green">Reviewed</Badge>
                      ) : (
                        <Badge color="amber">Needs review</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">
                      Ride {formatDate(toDateKey(c.booking.startTime))} ·{" "}
                      {formatBookingRange(c.booking.startTime, c.booking.endTime)}
                    </p>
                    <p className="mt-0.5 text-xs text-outline">
                      Signed “{c.signedName}”
                      {c.submittedAt ? ` · submitted ${formatDate(toDateKey(c.submittedAt))}` : ""}
                    </p>
                    <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                      {CHECKLIST_DETAIL_FIELDS.map((f) => (
                        <div key={f.id} className="flex gap-2">
                          <dt className="text-outline">{f.label}:</dt>
                          <dd className="font-medium text-ink-muted">
                            {responses.details?.[f.id] || "—"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <ApiActionButton
                      url={`/api/admin/checklists/${c.id}`}
                      body={{ read: !c.read }}
                      variant={c.read ? "outline" : "secondary"}
                      small
                    >
                      {c.read ? "Mark unreviewed" : "Mark reviewed"}
                    </ApiActionButton>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
