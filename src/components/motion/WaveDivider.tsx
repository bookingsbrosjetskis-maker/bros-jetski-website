/** Layered drifting waves for section boundaries.
 * `flip` points the waves upward (use above a dark section);
 * `from` sets the wave fill — match it to the section you're leaving. */
export function WaveDivider({
  flip = false,
  from = "navy",
  className = "",
}: {
  flip?: boolean;
  from?: "navy" | "white" | "brand" | "surface";
  className?: string;
}) {
  const fill =
    from === "navy"
      ? "#06162b"
      : from === "brand"
        ? "#194fb2"
        : from === "surface"
          ? "#111318"
          : "#ffffff";
  return (
    <div
      className={`pointer-events-none relative h-14 w-full overflow-hidden sm:h-20 ${
        flip ? "rotate-180" : ""
      } ${className}`}
      aria-hidden
    >
      {/* Each layer is 200% wide and translates -50% for a seamless loop */}
      <div className="animate-wave-drift-slow absolute bottom-0 h-full w-[200%] opacity-40">
        <svg viewBox="0 0 2880 96" preserveAspectRatio="none" className="h-full w-full">
          <path
            d="M0 56 C 360 16, 720 16, 1080 56 S 1440 96, 1800 72 S 2520 24, 2880 56 V 96 H 0 Z"
            fill={fill}
          />
        </svg>
      </div>
      <div className="animate-wave-drift absolute bottom-0 h-full w-[200%]">
        <svg viewBox="0 0 2880 96" preserveAspectRatio="none" className="h-full w-full">
          <path
            d="M0 72 C 240 40, 480 40, 720 72 S 1200 104, 1440 72 S 1920 40, 2160 72 S 2640 104, 2880 72 V 96 H 0 Z"
            fill={fill}
          />
        </svg>
      </div>
    </div>
  );
}
