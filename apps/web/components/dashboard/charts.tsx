"use client";

import { useId } from "react";
import clsx from "clsx";

/** Rounds a max up to a clean axis top with integer ticks. */
function niceScale(max: number) {
  if (max <= 4) return { top: 4, ticks: [0, 2, 4] };
  const step = Math.ceil(max / 4);
  return { top: step * 4, ticks: [0, step * 2, step * 4] };
}

export interface ColumnDatum {
  key: string;
  value: number;
  /** Tooltip heading and body, e.g. a date and "3 patients · 5 entries". */
  title: string;
  detail: string;
}

/**
 * Single-series column chart. One series, so no legend — the card title names
 * it. The latest column is emphasised and labelled; every column has a hover
 * tooltip, and the numbers are repeated in a screen-reader table.
 */
export function ColumnChart({
  data,
  startLabel,
  endLabel,
  caption,
  heightClass = "h-44",
}: {
  data: ColumnDatum[];
  startLabel: string;
  endLabel: string;
  caption: string;
  heightClass?: string;
}) {
  const max = Math.max(0, ...data.map((d) => d.value));
  const { top, ticks } = niceScale(max);

  return (
    <div>
      <div className={clsx("relative ml-7", heightClass)}>
        {ticks.map((tick) => (
          <div
            key={tick}
            className="absolute inset-x-0 border-t border-gray-100"
            style={{ bottom: `${(tick / top) * 100}%` }}
          >
            <span className="absolute -left-7 -translate-y-1/2 text-[11px] tabular-nums text-body/60">{tick}</span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end" aria-hidden>
          {data.map((d, index) => {
            const isLast = index === data.length - 1;
            return (
              <div key={d.key} className="group relative flex h-full flex-1 items-end justify-center">
                {/* Full-height hit target, wider than the bar. */}
                <div className="absolute inset-0 rounded-md transition-colors group-hover:bg-surface-alt/60" />
                <div
                  className={clsx(
                    "relative w-full max-w-6 rounded-t-sm transition-opacity",
                    isLast ? "bg-primary" : "bg-primary/70 group-hover:bg-primary",
                  )}
                  style={{ height: d.value === 0 ? 2 : `${(d.value / top) * 100}%`, marginInline: 1 }}
                />
                {isLast && d.value > 0 ? (
                  <span
                    className="absolute text-xs font-semibold text-heading"
                    style={{ bottom: `calc(${(d.value / top) * 100}% + 4px)` }}
                  >
                    {d.value}
                  </span>
                ) : null}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-heading px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block">
                  <p className="font-semibold">{d.title}</p>
                  <p>{d.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="ml-7 mt-2 flex justify-between text-[11px] text-body/60" aria-hidden>
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.title}</th>
              <td>{d.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Patients who logged food each day (dietitian dashboard). */
export function ActivityChart({ days }: { days: { date: string; patients: number; entries: number }[] }) {
  return (
    <ColumnChart
      caption="Patients who logged food, by day"
      startLabel={days[0] ? shortDate(days[0].date) : ""}
      endLabel="Today"
      data={days.map((d) => ({
        key: d.date,
        value: d.patients,
        title: shortDate(d.date),
        detail: `${plural(d.patients, "patient", "patients")} · ${plural(d.entries, "entry", "entries")}`,
      }))}
    />
  );
}

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  /** Tailwind background class for the bar. */
  barClass: string;
}

/**
 * Horizontal bars with the category label on the left and the value at the
 * bar tip, so no reading depends on color alone.
 */
export function HorizontalBars({ data, unit }: { data: BarDatum[]; unit: [string, string] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="flex flex-col gap-3">
      {data.map((d) => (
        <li
          key={d.key}
          className="group grid grid-cols-[6.5rem_1fr] items-center gap-3"
          title={`${d.label}: ${d.value} ${d.value === 1 ? unit[0] : unit[1]}`}
        >
          <span className="truncate text-sm text-body">{d.label}</span>
          <div className="flex items-center gap-2">
            <div className="h-5 flex-1 rounded-r-sm bg-transparent">
              <div
                className={clsx("h-full rounded-r-sm transition-opacity group-hover:opacity-85", d.barClass)}
                style={{ width: d.value === 0 ? 2 : `${(d.value / max) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right text-sm font-semibold tabular-nums text-heading">{d.value}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Tiny weight trend line: 2px stroke, end dot with a surface ring. */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const gradientId = useId();
  if (values.length < 2) return null;
  const width = 72;
  const height = 24;
  const pad = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => [
    pad + (i / (values.length - 1)) * (width - pad * 2),
    pad + (1 - (v - min) / range) * (height - pad * 2),
  ]);
  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x!.toFixed(1)},${y!.toFixed(1)}`).join(" ");
  const [lastX, lastY] = points[points.length - 1]!;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${lastX},${height} L${pad},${height} Z`} fill={`url(#${gradientId})`} />
      <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={4} fill="var(--color-primary)" stroke="white" strokeWidth={2} />
    </svg>
  );
}

/** Progress meter; the track is a lighter step of the fill's own hue. */
export function Meter({ percent, tone }: { percent: number; tone: "good" | "warning" | "danger" }) {
  const fill = { good: "bg-primary", warning: "bg-secondary", danger: "bg-red-600" }[tone];
  const track = { good: "bg-surface-alt", warning: "bg-orange-100", danger: "bg-red-100" }[tone];
  return (
    <div className={clsx("h-1.5 w-full overflow-hidden rounded-full", track)}>
      <div className={clsx("h-full rounded-full", fill)} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}
