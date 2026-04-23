"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  LogOut,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/Button";
import { useAppSession } from "@/hooks/use-app-session";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export default function SettingsPage() {
  const router = useRouter();
  const { signOut } = useAppSession();
  const push = usePushNotifications();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const toggleNotifications = async () => {
    setBusy(true);
    setFlash(null);
    if (push.status === "subscribed") {
      await push.unsubscribe();
    } else {
      await push.subscribe();
    }
    setBusy(false);
  };

  const handleTest = async () => {
    setBusy(true);
    setFlash(null);
    const sent = await push.sendTest();
    setFlash(
      sent > 0
        ? `Sent to ${sent} device${sent === 1 ? "" : "s"}.`
        : "Nothing was sent — check the logs."
    );
    setBusy(false);
  };

  const statusLabel =
    push.status === "loading"
      ? "…"
      : push.status === "unsupported"
        ? "Not supported on this device"
        : push.status === "blocked"
          ? "Blocked in browser settings"
          : push.status === "subscribed"
            ? "On"
            : "Off";

  const disabled =
    busy ||
    push.status === "loading" ||
    push.status === "unsupported" ||
    push.status === "blocked";

  return (
    <div>
      <div className="flex items-center gap-3 px-4 pt-4 pb-2 border-b border-border">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-1"
          aria-label="Back"
        >
          <ArrowLeft size={22} className="text-text-primary" />
        </button>
        <h1 className="text-lg font-bold text-text-primary">Settings</h1>
      </div>

      <div className="px-4 pt-6">
        <div className="space-y-2">
          <Link
            href="/profile/settings/rating"
            className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm ring-1 ring-white/[0.03] hover:border-primary/35 transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Sparkles size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                How ratings work
              </p>
              <p className="text-xs text-neutral">
                Learn how your rating goes up and down
              </p>
            </div>
            <ChevronRight size={18} className="text-neutral shrink-0" />
          </Link>

          <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-sm ring-1 ring-white/[0.03]">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Bell size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">
                  Push notifications
                </p>
                <p className="text-xs text-neutral">{statusLabel}</p>
              </div>
              <button
                type="button"
                onClick={toggleNotifications}
                disabled={disabled}
                aria-pressed={push.status === "subscribed"}
                className={
                  push.status === "subscribed"
                    ? "relative h-6 w-11 rounded-full bg-primary transition-colors disabled:opacity-50"
                    : "relative h-6 w-11 rounded-full bg-border transition-colors disabled:opacity-50"
                }
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    push.status === "subscribed" ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {push.status === "subscribed" && (
              <button
                type="button"
                onClick={handleTest}
                disabled={busy}
                className="mt-3 w-full text-xs font-medium text-primary py-2 rounded-lg border border-dashed border-primary/45 hover:bg-primary/10 disabled:opacity-50"
              >
                Send test notification
              </button>
            )}

            {push.error && (
              <p className="mt-2 text-xs text-danger" role="alert">
                {push.error}
              </p>
            )}
            {flash && (
              <p className="mt-2 text-xs text-neutral" role="status">
                {flash}
              </p>
            )}
            {push.status === "blocked" && (
              <p className="mt-2 text-xs text-neutral">
                To enable, turn notifications back on for this site in your
                browser settings.
              </p>
            )}
            {push.status === "unsupported" && (
              <p className="mt-2 text-xs text-neutral">
                On iPhone, add this app to your Home Screen first, then enable
                notifications here.
              </p>
            )}
          </div>
        </div>

        <div className="mt-10">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            size="lg"
            onClick={handleSignOut}
            className="border-danger/45 text-danger hover:bg-danger/12"
          >
            <LogOut size={18} />
            Log out
          </Button>
        </div>
      </div>
    </div>
  );
}
