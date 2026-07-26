import { prisma } from "@/lib/db";
import { Badge, Card } from "@/components/ui";
import ApiActionButton from "@/components/admin/ApiActionButton";

export const dynamic = "force-dynamic";

function formatTimestamp(d: Date): string {
  return d.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
}

export default async function MessagesPage() {
  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Messages</h1>

      {messages.length === 0 ? (
        <Card className="p-8 text-center text-sm text-ink-muted">
          No contact messages yet.
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <Card key={m.id} className={`p-5 ${m.read ? "" : "border-cyan/50"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`text-ink ${
                        m.read ? "font-medium" : "font-bold"
                      }`}
                    >
                      {m.name}
                    </p>
                    {!m.read && <Badge color="blue">New</Badge>}
                  </div>
                  <p className="text-xs text-ink-muted">
                    <a
                      href={`mailto:${m.email}`}
                      className="text-cyan hover:text-cyan-soft"
                    >
                      {m.email}
                    </a>{" "}
                    · {formatTimestamp(m.createdAt)}
                  </p>
                  <p
                    className={`mt-2 whitespace-pre-line text-sm ${
                      m.read ? "text-ink-muted" : "font-medium text-ink"
                    }`}
                  >
                    {m.message}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {!m.read && (
                    <ApiActionButton
                      url={`/api/admin/messages/${m.id}`}
                      body={{ read: true }}
                      variant="secondary"
                      small
                    >
                      Mark read
                    </ApiActionButton>
                  )}
                  <ApiActionButton
                    url={`/api/admin/messages/${m.id}`}
                    method="DELETE"
                    confirmText="Delete this message permanently?"
                    variant="danger"
                    small
                  >
                    Delete
                  </ApiActionButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
