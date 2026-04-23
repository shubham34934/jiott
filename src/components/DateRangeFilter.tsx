"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";

export type DatePreset = "today" | "yesterday" | "7d" | "30d" | "custom";

export interface DateRange {
  /** Inclusive lower bound. */
  from: Date;
  /** Inclusive upper bound. */
  to: Date;
}

const PRESETS: { key: Exclude<DatePreset, "custom">; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
];

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function presetRange(
  preset: Exclude<DatePreset, "custom">,
  now: Date = new Date()
): DateRange {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  if (preset === "today") return { from: todayStart, to: todayEnd };
  if (preset === "yesterday") {
    const y = new Date(todayStart);
    y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y) };
  }
  const start = new Date(todayStart);
  start.setDate(start.getDate() - (preset === "7d" ? 6 : 29));
  return { from: start, to: todayEnd };
}

/** Format a Date for `<input type="date">` in the local timezone. */
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a `<input type="date">` value as a local-time Date. */
export function fromDateInputValue(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export interface DateRangeFilterProps {
  preset: DatePreset;
  customFrom: string;
  customTo: string;
  onPresetSelect: (p: Exclude<DatePreset, "custom">) => void;
  onCustomChange: (from: string, to: string) => void;
}

export function DateRangeFilter({
  preset,
  customFrom,
  customTo,
  onPresetSelect,
  onCustomChange,
}: DateRangeFilterProps) {
  const isCustom = preset === "custom";
  const [customPanelOpen, setCustomPanelOpen] = useState(isCustom);

  // When the parent switches to a non-custom preset, collapse the panel.
  useEffect(() => {
    if (!isCustom) setCustomPanelOpen(false);
  }, [isCustom]);

  const handleCustomClick = () => {
    if (isCustom) {
      setCustomPanelOpen((v) => !v);
    } else {
      onCustomChange(customFrom, customTo);
      setCustomPanelOpen(true);
    }
  };

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 rounded-full border border-border bg-surface p-1 shadow-sm ring-1 ring-white/[0.03]">
        <Calendar
          size={14}
          className="shrink-0 ml-2 text-neutral"
          aria-hidden
        />
        <div className="flex-1 flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PRESETS.map((p) => {
            const active = preset === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => onPresetSelect(p.key)}
                aria-pressed={active}
                className={
                  active
                    ? "px-3 h-7 rounded-full text-xs font-semibold bg-primary text-white whitespace-nowrap"
                    : "px-3 h-7 rounded-full text-xs font-medium text-neutral whitespace-nowrap"
                }
              >
                {p.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={handleCustomClick}
            aria-pressed={isCustom}
            aria-expanded={isCustom && customPanelOpen}
            className={
              isCustom
                ? "px-3 h-7 rounded-full text-xs font-semibold bg-primary text-white whitespace-nowrap"
                : "px-3 h-7 rounded-full text-xs font-medium text-neutral whitespace-nowrap"
            }
          >
            Custom
          </button>
        </div>
      </div>

      {isCustom && customPanelOpen && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="date"
            value={customFrom}
            max={customTo}
            onChange={(e) => onCustomChange(e.target.value, customTo)}
            className="flex-1 h-9 rounded-lg border border-border bg-surface px-3 text-xs text-text-primary focus:outline-none focus:border-primary"
            aria-label="From date"
          />
          <span className="text-xs text-neutral">to</span>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            onChange={(e) => onCustomChange(customFrom, e.target.value)}
            className="flex-1 h-9 rounded-lg border border-border bg-surface px-3 text-xs text-text-primary focus:outline-none focus:border-primary"
            aria-label="To date"
          />
        </div>
      )}
    </div>
  );
}
