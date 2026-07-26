import { Container } from "@/components/ui";

export default function FleetLoading() {
  return (
    <>
      <div className="animated-gradient h-56 w-full sm:h-64" />
      <Container className="py-12 sm:py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-mid shadow-lg shadow-black/40"
            >
              <div className="aspect-[8/5] w-full animate-pulse bg-surface-high" />
              <div className="space-y-3 p-6">
                <div className="h-5 w-2/3 animate-pulse rounded bg-surface-high" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-surface-high" />
                <div className="h-20 w-full animate-pulse rounded bg-surface-high" />
                <div className="h-10 w-full animate-pulse rounded bg-surface-high" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}
