"use client";

import { useCallback, useEffect } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { NewMatchFlow } from "@/components/NewMatchFlow";

/**
 * Full-viewport modal hosting the new-match wizard. Opened by adding
 * `?new=1` to the current URL, closed by clearing that param. No route
 * change, so Turbopack/Vercel don't pay the page-compile cost.
 */
export function NewMatchModal() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const open = searchParams.get("new") === "1";
  const opponentParam = searchParams.get("opponent");

  const close = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    next.delete("opponent");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New match"
      className="fixed inset-0 z-[95] bg-background"
    >
      <NewMatchFlow onClose={close} initialOpponentId={opponentParam} />
    </div>
  );
}
