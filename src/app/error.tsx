"use client";

import { Button, ButtonLink } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-4 py-16 pt-24 text-center [@media(max-height:640px)]:min-h-0">
      <p className="font-label text-xs font-bold uppercase tracking-[0.1em] text-cyan">
        Something went wrong
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        We hit some unexpected chop
      </h1>
      <p className="mt-4 max-w-md text-ink-muted">
        An error occurred while loading this page. Try again, or head back to
        shore.
        {error.digest && (
          <span className="mt-2 block text-xs text-outline">Ref: {error.digest}</span>
        )}
      </p>
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <ButtonLink href="/" variant="outline">
          Back to home
        </ButtonLink>
      </div>
    </div>
  );
}
