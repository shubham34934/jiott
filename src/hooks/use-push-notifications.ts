"use client";

import { useCallback, useEffect, useState } from "react";

export type PushStatus =
  | "unsupported"
  | "blocked"
  | "unsubscribed"
  | "subscribed"
  | "loading";

function urlBase64ToArrayBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupported()) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("blocked");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      setStatus(existing ? "subscribed" : "unsubscribed");
    } catch {
      setStatus("unsubscribed");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    setError(null);
    if (!isSupported()) {
      setStatus("unsupported");
      return false;
    }
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setError("Push not configured (missing VAPID key).");
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "unsubscribed");
        return false;
      }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToArrayBuffer(publicKey),
        }));
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Subscribe failed");
      }
      setStatus("subscribed");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Subscribe failed");
      return false;
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setError(null);
    if (!isSupported()) return false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        const endpoint = existing.endpoint;
        await existing.unsubscribe();
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ endpoint }),
        });
      }
      setStatus("unsubscribed");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unsubscribe failed");
      return false;
    }
  }, []);

  const sendTest = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/push/test", {
        method: "POST",
        credentials: "include",
      });
      const payload = (await res.json().catch(() => null)) as {
        error?: string;
        sent?: number;
      } | null;
      if (!res.ok) {
        throw new Error(payload?.error ?? "Test send failed");
      }
      return payload?.sent ?? 0;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test send failed");
      return 0;
    }
  }, []);

  return { status, error, subscribe, unsubscribe, sendTest, refresh };
}
