import type { Review } from "@prisma/client";
import { StarRating } from "@/components/ui";

function monthYear(date: Date): string {
  return date.toLocaleDateString("en-CA", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function ReviewCard({
  review,
  className = "",
}: {
  review: Review;
  className?: string;
}) {
  return (
    <div
      className={`flex h-full flex-col gap-3 rounded-2xl border border-outline-variant/60 bg-surface-mid p-5 shadow-lg shadow-black/40 transition-all duration-300 hover:-translate-y-1 hover:border-cyan/40 hover:shadow-lg hover:shadow-cyan/10 sm:p-6 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-cyan/25" aria-hidden>
        <path d="M7 7h4v4c0 2.5-1.5 4-4 4.5V14c1-.3 1.5-1 1.5-2H7V7zm7 0h4v4c0 2.5-1.5 4-4 4.5V14c1-.3 1.5-1 1.5-2H14V7z" />
      </svg>
      <StarRating rating={review.rating} />
      <p className="flex-1 text-sm leading-relaxed text-ink-muted">
        {review.text}
      </p>
      <div className="flex items-baseline justify-between border-t border-outline-variant/50 pt-3">
        <p className="text-sm font-semibold text-ink">{review.authorName}</p>
        <p className="text-xs text-outline">{monthYear(review.createdAt)}</p>
      </div>
    </div>
  );
}
