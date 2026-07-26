"use client";

import type { ReactNode } from "react";

/** Infinite horizontal loop (content is rendered twice and drifts left via the
 * `wave-drift` keyframe, which translates -50%). Pauses on hover. Respects
 * prefers-reduced-motion via the global CSS override. */
export function Marquee({
  children,
  speed = "normal",
  className = "",
}: {
  children: ReactNode;
  speed?: "normal" | "slow";
  className?: string;
}) {
  return (
    <div className={`group overflow-hidden ${className}`}>
      <div
        className={`flex w-max gap-6 ${
          speed === "slow" ? "animate-wave-drift-slow" : "animate-wave-drift"
        } group-hover:[animation-play-state:paused]`}
        style={{ animationDirection: "normal" }}
      >
        <div className="flex shrink-0 gap-6">{children}</div>
        <div className="flex shrink-0 gap-6" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
