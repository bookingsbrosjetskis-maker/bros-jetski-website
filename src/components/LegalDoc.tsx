import type { ReactNode } from "react";

/** Consistent, readable typography for the Terms / Privacy long-form pages. */
export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold text-ink">{heading}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-ink-muted [&_a]:text-cyan [&_a:hover]:underline [&_li]:ml-1 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
