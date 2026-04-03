"use client";

import { useEffect, useRef } from "react";

export interface InfiniteScrollSentinelProps {
  /** When true, observes and triggers onIntersect when the sentinel enters view. */
  enabled: boolean;
  onIntersect: () => void;
  /** Extra root margin for earlier fetch (e.g. "200px"). */
  rootMargin?: string;
}

/**
 * Triggers `onIntersect` when the sentinel element scrolls into view (infinite scroll).
 */
export function InfiniteScrollSentinel({
  enabled,
  onIntersect,
  rootMargin = "120px",
}: InfiniteScrollSentinelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onIntersectRef = useRef(onIntersect);

  useEffect(() => {
    onIntersectRef.current = onIntersect;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting) {
          onIntersectRef.current();
        }
      },
      { root: null, rootMargin, threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return (
    <div
      ref={ref}
      className="h-px w-full shrink-0"
      aria-hidden
    />
  );
}
