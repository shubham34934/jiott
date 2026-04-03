"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const THRESHOLD = 72;
const MAX_PULL = 120;
/** How far the app stays shifted down while reloading */
const REFRESH_SHIFT = 56;

function pageScrollTop(): number {
  return window.scrollY || document.documentElement.scrollTop;
}

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const active = useRef(false);
  const pullRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setEnabled(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const runRefresh = useCallback(async () => {
    try {
      await queryClient.invalidateQueries();
      await router.refresh();
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, router]);

  useEffect(() => {
    if (!enabled) return;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (pageScrollTop() > 0) return;
      startY.current = e.touches[0].clientY;
      active.current = true;
      setIsDragging(true);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active.current || refreshing) return;
      if (pageScrollTop() > 0) {
        active.current = false;
        setIsDragging(false);
        pullRef.current = 0;
        setPull(0);
        return;
      }
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        e.preventDefault();
        const v = Math.min(dy, MAX_PULL);
        pullRef.current = v;
        setPull(v);
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    };

    const end = () => {
      if (!active.current) return;
      active.current = false;
      setIsDragging(false);
      const p = pullRef.current;
      pullRef.current = 0;
      if (p >= THRESHOLD) {
        setRefreshing(true);
        setPull(0);
        void runRefresh();
      } else {
        setPull(0);
      }
    };

    const onTouchCancel = () => {
      active.current = false;
      setIsDragging(false);
      pullRef.current = 0;
      setPull(0);
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", end, { passive: true });
    document.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [enabled, refreshing, runRefresh]);

  const shiftY = refreshing ? REFRESH_SHIFT : Math.min(pull, MAX_PULL);
  const showStrip = enabled && (pull > 0 || refreshing);
  const transition = isDragging
    ? "none"
    : "transform 0.28s cubic-bezier(0.33, 1, 0.68, 1)";

  let statusText = "Pull down to refresh";
  if (refreshing) {
    statusText = "Reloading…";
  } else if (pull >= THRESHOLD) {
    statusText = "Release to refresh";
  }

  return (
    <div className="relative md:contents">
      {/* Top strip — only mobile */}
      {showStrip && (
        <div
          className="md:hidden fixed left-0 right-0 z-[45] flex flex-col items-center justify-end pointer-events-none px-4"
          style={{
            top: 0,
            paddingTop: "max(0.35rem, env(safe-area-inset-top))",
            height: `${REFRESH_SHIFT + 8}px`,
            opacity: refreshing ? 1 : Math.min(1, pull / THRESHOLD + 0.15),
          }}
          aria-live="polite"
          aria-busy={refreshing}
        >
          <div className="flex flex-col items-center gap-1 text-center">
            <Loader2
              size={22}
              className={`text-primary ${
                refreshing || pull >= THRESHOLD * 0.7 ? "animate-spin" : ""
              }`}
              aria-hidden
            />
            <span className="text-[11px] font-semibold text-neutral tracking-wide uppercase">
              {statusText}
            </span>
          </div>
        </div>
      )}

      <div
        className="bg-background min-h-dvh md:min-h-0 md:!transform-none md:!transition-none"
        style={{
          transform:
            enabled && (pull > 0 || refreshing)
              ? `translateY(${shiftY}px)`
              : undefined,
          transition,
        }}
      >
        {children}
      </div>
    </div>
  );
}
