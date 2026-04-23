"use client";

import { useMemo } from "react";
import { formatDisplayDate } from "@/lib/formatDisplayDate";

export type RatingHistoryPoint = {
  matchId: string;
  createdAt: string | Date;
  rating: number;
};

export interface RatingHistoryChartProps {
  points: RatingHistoryPoint[];
  /** SVG viewBox height; width is responsive. */
  height?: number;
}

const WIDTH = 400;
const PAD_LEFT = 44;
const PAD_RIGHT = 14;
const PAD_TOP = 14;
const PAD_BOTTOM = 28;

export function RatingHistoryChart({
  points,
  height = 180,
}: RatingHistoryChartProps) {
  const parsed = useMemo(
    () =>
      points
        .map((p) => ({
          matchId: p.matchId,
          t: new Date(p.createdAt).getTime(),
          rating: p.rating,
        }))
        .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.rating))
        .sort((a, b) => a.t - b.t),
    [points]
  );

  if (parsed.length < 2) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-neutral shadow-sm ring-1 ring-white/[0.03]">
        {parsed.length === 0
          ? "No ranked matches yet — play a few to see your rating over time."
          : "Only one ranked match so far — the chart will appear after the next one."}
      </div>
    );
  }

  const ratings = parsed.map((p) => p.rating);
  const minR = Math.min(...ratings);
  const maxR = Math.max(...ratings);
  const pad = Math.max(5, Math.round((maxR - minR) * 0.15));
  const yMin = minR - pad;
  const yMax = maxR + pad;
  const yRange = yMax - yMin || 1;

  const tMin = parsed[0].t;
  const tMax = parsed[parsed.length - 1].t;
  const tRange = tMax - tMin || 1;

  const xOf = (t: number) =>
    PAD_LEFT + ((t - tMin) / tRange) * (WIDTH - PAD_LEFT - PAD_RIGHT);
  const yOf = (r: number) =>
    PAD_TOP + (1 - (r - yMin) / yRange) * (height - PAD_TOP - PAD_BOTTOM);

  const linePath = parsed
    .map((p, i) => `${i === 0 ? "M" : "L"}${xOf(p.t).toFixed(1)},${yOf(p.rating).toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L${xOf(tMax).toFixed(1)},${(height - PAD_BOTTOM).toFixed(1)} L${xOf(tMin).toFixed(1)},${(height - PAD_BOTTOM).toFixed(1)} Z`;

  const first = parsed[0];
  const last = parsed[parsed.length - 1];
  const delta = last.rating - first.rating;
  const deltaColor =
    delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-neutral";

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm ring-1 ring-white/[0.03]">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral">
          Rating history
        </p>
        <p className={`text-xs font-semibold ${deltaColor}`}>
          {delta > 0 ? "+" : ""}
          {delta} over {parsed.length} match{parsed.length === 1 ? "" : "es"}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label="Rating over time"
      >
        <defs>
          <linearGradient id="rh-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(94,158,255)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(94,158,255)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[yMin, (yMin + yMax) / 2, yMax].map((val) => (
          <g key={val}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yOf(val)}
              y2={yOf(val)}
              stroke="currentColor"
              className="text-border"
              strokeDasharray="3 3"
            />
            <text
              x={PAD_LEFT - 6}
              y={yOf(val) + 4}
              textAnchor="end"
              fontSize="12"
              className="fill-neutral"
            >
              {Math.round(val)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#rh-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke="rgb(94,158,255)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <circle
          cx={xOf(last.t)}
          cy={yOf(last.rating)}
          r={4}
          fill="rgb(94,158,255)"
          stroke="white"
          strokeWidth="1.5"
        />

        <text
          x={PAD_LEFT}
          y={height - 8}
          fontSize="12"
          className="fill-neutral"
        >
          {formatDisplayDate(new Date(first.t).toISOString())}
        </text>
        <text
          x={WIDTH - PAD_RIGHT}
          y={height - 8}
          fontSize="12"
          textAnchor="end"
          className="fill-neutral"
        >
          {formatDisplayDate(new Date(last.t).toISOString())}
        </text>
      </svg>
    </div>
  );
}
