"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { formatCAD } from "@/lib/format";

/** Counts from 0 to `value` when scrolled into view. Props are serializable
 * (no function props) so this works when rendered by a server component:
 * - `currency` treats `value` as integer CAD cents and formats via formatCAD.
 * - otherwise the integer part is locale-formatted with `decimals` places,
 *   wrapped in optional `prefix`/`suffix`. */
export function AnimatedNumber({
  value,
  duration = 1.4,
  decimals = 0,
  prefix = "",
  suffix = "",
  currency = false,
  className,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  currency?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduced]);

  const text = currency
    ? formatCAD(Math.round(display))
    : `${prefix}${display.toLocaleString("en-CA", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`;

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
