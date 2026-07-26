import { prisma } from "@/lib/db";
import { formatDate, toDateKey } from "@/lib/format";
import { Badge, Card, StarRating } from "@/components/ui";
import ApiActionButton from "@/components/admin/ApiActionButton";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const reviews = await prisma.review.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Reviews</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Only approved reviews appear on the public site.
        </p>
      </div>

      {reviews.length === 0 ? (
        <Card className="p-8 text-center text-sm text-ink-muted">No reviews yet.</Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{r.authorName}</p>
                    <StarRating rating={r.rating} />
                    {r.approved ? (
                      <Badge color="green">Published</Badge>
                    ) : (
                      <Badge color="slate">Hidden</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {formatDate(toDateKey(r.createdAt))}
                  </p>
                  <p className="mt-2 text-sm text-ink-muted">{r.text}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <ApiActionButton
                    url={`/api/admin/reviews/${r.id}`}
                    body={{ approved: !r.approved }}
                    variant={r.approved ? "outline" : "secondary"}
                    small
                  >
                    {r.approved ? "Hide" : "Approve"}
                  </ApiActionButton>
                  <ApiActionButton
                    url={`/api/admin/reviews/${r.id}`}
                    method="DELETE"
                    confirmText="Delete this review permanently?"
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
