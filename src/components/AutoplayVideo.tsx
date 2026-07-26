"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * A muted, looping background video that respects `prefers-reduced-motion`
 * (WCAG 2.2.2). Autoplay is driven from JS rather than the `autoPlay`
 * attribute, so reduced-motion users see only the poster and the motion never
 * starts. A visible play/pause control lets anyone stop or start it.
 */
export default function AutoplayVideo({
  src,
  poster,
  className = "",
  controlClassName = "",
  label = "background video",
  lazy = false,
}: {
  src: string;
  poster?: string;
  className?: string;
  /** Positioning/appearance for the play-pause button (it ships base styles). */
  controlClassName?: string;
  /** Used in the button's accessible name, e.g. "Play hero video". */
  label?: string;
  /** Only load and play while scrolled into view (for grids of many videos). */
  lazy?: boolean;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [inView, setInView] = useState(!lazy);

  useEffect(() => {
    if (!lazy) return;
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? false),
      { threshold: 0.25 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, [lazy]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (reduce || !inView) {
      v.pause();
      setPlaying(false);
    } else {
      // Muted autoplay is permitted by browsers; ignore a rejected promise.
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  }, [reduce, inView]);

  function toggle() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  return (
    <>
      <video
        ref={ref}
        muted
        loop
        playsInline
        poster={poster}
        preload={lazy || reduce ? "none" : "metadata"}
        aria-label={label}
        className={className}
      >
        <source src={src} type="video/mp4" />
      </video>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause ${label}` : `Play ${label}`}
        className={
          "absolute z-20 grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 " +
          controlClassName
        }
      >
        {playing ? (
          <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
    </>
  );
}
