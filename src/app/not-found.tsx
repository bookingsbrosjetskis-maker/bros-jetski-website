import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="animated-gradient relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 pt-16 text-center text-ink">
      <div className="animate-pulse-glow pointer-events-none absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-cyan/20 blur-3xl" />
      <p className="animate-fade-up font-label text-xs font-bold uppercase tracking-[0.1em] text-cyan">
        404, off the map
      </p>
      <h1 className="animate-fade-up mt-4 text-4xl font-bold tracking-tight sm:text-5xl [animation-delay:0.1s]">
        You&apos;ve drifted out of the rental zone
      </h1>
      <p className="animate-fade-up mt-4 max-w-md text-ink-muted [animation-delay:0.2s]">
        The page you&apos;re looking for doesn&apos;t exist. Let&apos;s get you
        back to open water.
      </p>
      <div className="animate-fade-up mt-8 flex gap-3 [animation-delay:0.3s]">
        <ButtonLink href="/">Back to home</ButtonLink>
        <ButtonLink href="/book" variant="glass">
          Book a ride
        </ButtonLink>
      </div>
    </div>
  );
}
