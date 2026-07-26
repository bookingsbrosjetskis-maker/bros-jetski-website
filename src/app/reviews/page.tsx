import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Container, StarRating } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import ReviewCard from "@/components/ReviewCard";
import ReviewForm from "@/components/ReviewForm";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reviews",
  description: "What riders say about renting with us.",
};

export default async function ReviewsPage() {
  const reviews = await prisma.review.findMany({
    where: { approved: true },
    orderBy: { createdAt: "desc" },
  });

  const average =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <>
      <PageHero eyebrow="Reviews" title="What riders say">
        {reviews.length > 0 && (
          <div className="mt-6 flex items-center gap-3">
            <StarRating rating={Math.round(average)} />
            <p className="text-sm text-ink-muted">
              <span className="font-semibold text-ink">{average.toFixed(1)} out of 5</span> ·{" "}
              {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            </p>
          </div>
        )}
      </PageHero>

      <Container className="py-12 sm:py-16">
        {reviews.length === 0 ? (
          <p className="rounded-xl border border-outline-variant/60 bg-surface-low p-8 text-center text-ink-muted">
            No reviews yet. Be the first to ride with us and share your
            experience.
          </p>
        ) : (
          <RevealStagger className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <RevealItem key={review.id} className="h-full">
                <ReviewCard review={review} />
              </RevealItem>
            ))}
          </RevealStagger>
        )}

        <Reveal>
          <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-outline-variant/60 bg-surface-mid p-6 shadow-lg shadow-black/40 sm:p-8">
            <h2 className="text-xl font-bold text-ink">Been out with us?</h2>
            <p className="mb-6 mt-1 text-sm text-ink-muted">
              Leave a review. It appears here once our team approves it.
            </p>
            <ReviewForm />
          </div>
        </Reveal>
      </Container>
    </>
  );
}
