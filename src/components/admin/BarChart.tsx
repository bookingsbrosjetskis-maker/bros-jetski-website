// Server-rendered inline-SVG bar chart for the admin dashboard. No chart
// library, no client JS: hover detail comes from native <title> tooltips.

export type BarChartDatum = { label: string; value: number };

/** Smallest "nice" number (1/2/2.5/5 × 10^k) that is >= v. */
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  for (const f of [1, 2, 2.5, 5, 10]) {
    if (f * mag >= v) return f * mag;
  }
  return 10 * mag;
}

/** Rounded-top bar path: square at the baseline, 4px radius at the data end. */
function barPath(x: number, yTop: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  const yBottom = yTop + h;
  return [
    `M${x},${yBottom}`,
    `L${x},${yTop + r}`,
    `Q${x},${yTop} ${x + r},${yTop}`,
    `L${x + w - r},${yTop}`,
    `Q${x + w},${yTop} ${x + w},${yTop + r}`,
    `L${x + w},${yBottom}`,
    "Z",
  ].join(" ");
}

export default function BarChart({
  title,
  data,
  height = 220,
  formatValue,
  labelEvery,
}: {
  /** Accessible chart title (rendered as the SVG <title>). */
  title: string;
  data: BarChartDatum[];
  height?: number;
  /** Formats gridline ticks and per-bar hover values (default: locale number). */
  formatValue?: (v: number) => string;
  /** Show every Nth x label (default: auto — thins out past 10 points). */
  labelEvery?: number;
}) {
  const fmt = formatValue ?? ((v: number) => v.toLocaleString("en-CA"));
  const gradientId = `bar-grad-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const titleId = `${gradientId}-title`;

  const max = Math.max(0, ...data.map((d) => d.value));
  if (data.length === 0 || max === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-surface-low text-sm text-ink-muted"
        style={{ height }}
      >
        No data yet for this period.
      </div>
    );
  }

  // 4 gridlines at clean steps; the top gridline is the y-axis max.
  const step = niceCeil(max / 4);
  const niceMax = step * 4;
  const ticks = [1, 2, 3, 4].map((i) => i * step);

  const width = 640;
  const padTop = 8;
  const padRight = 8;
  const padBottom = 22;
  const tickChars = Math.max(...ticks.map((t) => fmt(t).length));
  const padLeft = Math.min(92, Math.max(34, tickChars * 6.2 + 12));

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const baseline = padTop + plotH;
  const band = plotW / data.length;
  const barW = Math.max(2, Math.min(24, band * 0.72));

  const every = labelEvery ?? (data.length > 10 ? Math.ceil(data.length / 8) : 1);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby={titleId}
      className="h-auto w-full"
    >
      <title id={titleId}>{title}</title>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#006a70" /> {/* cyan-deep */}
          <stop offset="100%" stopColor="#00f1fe" /> {/* cyan */}
        </linearGradient>
      </defs>

      {/* Gridlines + tick labels (recessive hairlines) */}
      {ticks.map((t) => {
        const y = baseline - (t / niceMax) * plotH;
        return (
          <g key={t}>
            <line x1={padLeft} x2={width - padRight} y1={y} y2={y} stroke="#414754" strokeWidth={1} />
            <text
              x={padLeft - 6}
              y={y + 3}
              textAnchor="end"
              fontSize={10}
              fill="#8b90a0"
            >
              {fmt(t)}
            </text>
          </g>
        );
      })}
      {/* Baseline */}
      <line x1={padLeft} x2={width - padRight} y1={baseline} y2={baseline} stroke="#414754" strokeWidth={1} />

      {/* Bars — each band is a hover target with a native tooltip */}
      {data.map((d, i) => {
        const h = (d.value / niceMax) * plotH;
        const x = padLeft + i * band + (band - barW) / 2;
        return (
          <g key={i}>
            <title>{`${d.label}: ${fmt(d.value)}`}</title>
            {/* full-band invisible hit area so the tooltip triggers easily */}
            <rect x={padLeft + i * band} y={padTop} width={band} height={plotH} fill="transparent" />
            {d.value > 0 && (
              <path d={barPath(x, baseline - h, barW, h)} fill={`url(#${gradientId})`} />
            )}
          </g>
        );
      })}

      {/* X labels, thinned out for dense series */}
      {data.map((d, i) =>
        i % every === 0 ? (
          <text
            key={i}
            x={padLeft + i * band + band / 2}
            y={height - 7}
            textAnchor="middle"
            fontSize={10}
            fill="#8b90a0"
          >
            {d.label}
          </text>
        ) : null
      )}
    </svg>
  );
}
