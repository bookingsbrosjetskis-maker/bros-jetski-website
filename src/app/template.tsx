"use client";

import { usePathname } from "next/navigation";
import { MotionConfig, motion } from "motion/react";

/** Subtle fade/rise on route change for the public site.
 * MotionConfig reducedMotion="user" makes every motion component in the tree
 * respect prefers-reduced-motion. Admin is excluded (functional surface). */
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.21, 0.65, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
