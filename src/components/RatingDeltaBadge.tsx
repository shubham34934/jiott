"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";

type RatingDeltaBadgeProps = {
  delta: number;
  /** Larger on match detail, compact in lists */
  size?: "sm" | "md";
  className?: string;
};

export function RatingDeltaBadge({
  delta,
  size = "md",
  className = "",
}: RatingDeltaBadgeProps) {
  const iconSize = size === "sm" ? 12 : 14;
  const textClass = size === "sm" ? "text-xs font-semibold" : "text-sm font-semibold";

  if (delta > 0) {
    return (
      <span
        className={`inline-flex items-center gap-0.5 tabular-nums text-success ${textClass} ${className}`}
        title="Ranked rating change"
      >
        <TrendingUp size={iconSize} className="shrink-0" aria-hidden />
        <span>+{delta}</span>
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span
        className={`inline-flex items-center gap-0.5 tabular-nums text-danger ${textClass} ${className}`}
        title="Ranked rating change"
      >
        <TrendingDown size={iconSize} className="shrink-0" aria-hidden />
        <span>{delta}</span>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-0.5 tabular-nums text-neutral ${textClass} ${className}`}
      title="No ranked rating change"
    >
      <Minus size={iconSize} className="shrink-0" aria-hidden />
      <span>0</span>
    </span>
  );
}
