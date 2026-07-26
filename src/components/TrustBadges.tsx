const badges = [
  {
    label: "Safety Briefing Included",
    detail: "Every rental starts with a hands-on safety briefing",
    icon: (
      <path d="M12 3l7 3v5c0 4.5-3 8.4-7 10-4-1.6-7-5.5-7-10V6l7-3z M9.5 12l2 2 3.5-4" />
    ),
  },
  {
    label: "Gear Included",
    detail: "Life jackets and all required equipment, no extra charge",
    icon: (
      <path d="M12 4a8 8 0 100 16 8 8 0 000-16z M12 9a3 3 0 100 6 3 3 0 000-6z M12 4v5 M12 15v5 M4 12h5 M15 12h5" />
    ),
  },
  {
    label: "Beginner Friendly",
    detail: "The Sea-Doo Spark Trixx is lightweight and easy to ride",
    icon: (
      <path d="M4 16c2.5-2 4.5-2 7 0s4.5 2 7 0M6 12l2-5h6l4 5M10 7V5" />
    ),
  },
];

export default function TrustBadges({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-3 ${compact ? "" : "gap-6"}`}>
      {badges.map((b) => (
        <div key={b.label} className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan/10 ring-1 ring-cyan/30">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 stroke-cyan"
              fill="none"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {b.icon}
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{b.label}</p>
            {!compact && <p className="text-xs text-outline">{b.detail}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
