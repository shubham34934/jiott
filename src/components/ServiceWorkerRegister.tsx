"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Enable the SW in dev by setting NEXT_PUBLIC_ENABLE_SW_DEV=1 in .env
    // (useful for testing push notifications locally).
    const allowInDev = process.env.NEXT_PUBLIC_ENABLE_SW_DEV === "1";
    const shouldRegister =
      process.env.NODE_ENV === "production" || allowInDev;

    if (!shouldRegister) {
      void (async () => {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      })();
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
