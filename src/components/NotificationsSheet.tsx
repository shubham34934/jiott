"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  CheckCircle2,
  Hourglass,
  RotateCcw,
  Swords,
  Trophy,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { apiGet } from "@/lib/api-client";
import { formatDisplayDate } from "@/lib/formatDisplayDate";
import { QUERY_STALE_TIME_MS } from "@/lib/queryStaleTime";

export type NotificationItem = {
  id: string;
  type: string | null;
  body: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
};

type IconPreset = { Icon: LucideIcon; tintClass: string };

const DEFAULT_ICON: IconPreset = {
  Icon: Bell,
  tintClass: "bg-surface text-neutral",
};

function iconForType(type: string | null): IconPreset {
  switch (type) {
    case "challenge":
      return { Icon: Swords, tintClass: "bg-primary/15 text-primary" };
    case "challenge_accepted":
      return {
        Icon: CheckCircle2,
        tintClass: "bg-success/15 text-success",
      };
    case "challenge_declined":
      return { Icon: XCircle, tintClass: "bg-danger/15 text-danger" };
    case "completion_proposed":
      return {
        Icon: Hourglass,
        tintClass: "bg-warning/15 text-warning",
      };
    case "completion_confirmed":
      return { Icon: Trophy, tintClass: "bg-gold/15 text-gold" };
    case "completion_reopened":
      return {
        Icon: RotateCcw,
        tintClass: "bg-warning/15 text-warning",
      };
    default:
      return DEFAULT_ICON;
  }
}

export type NotificationsResponse = {
  items: NotificationItem[];
  unreadCount: number;
};

export function useNotifications() {
  return useQuery<NotificationsResponse>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const r = await apiGet("/api/notifications?limit=50");
      return r.json();
    },
    staleTime: QUERY_STALE_TIME_MS,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Full-screen modal that looks like a page (back arrow, sticky header, list),
 * but preserves the underlying route. Closed via the back arrow or Escape.
 */
export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useNotifications();
  const items = data?.items ?? [];
  const hasUnread = items.some((n) => !n.readAt);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const markRead = useMutation({
    mutationFn: async (args: { id?: string; all?: boolean }) => {
      const r = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      return r.json();
    },
    onMutate: async (args) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous =
        queryClient.getQueryData<NotificationsResponse>(["notifications"]);
      queryClient.setQueryData<NotificationsResponse>(
        ["notifications"],
        (old) => {
          if (!old) return old;
          const now = new Date().toISOString();
          const targetId = args.id;
          const all = args.all === true;
          const nextItems = old.items.map((n) =>
            all || n.id === targetId
              ? { ...n, readAt: n.readAt ?? now }
              : n
          );
          const unreadCount = nextItems.filter((n) => !n.readAt).length;
          return { items: nextItems, unreadCount };
        }
      );
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["notifications"], ctx.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleOpenNotification = (n: NotificationItem) => {
    if (!n.readAt) markRead.mutate({ id: n.id });
    if (n.url) {
      onClose();
      router.push(n.url);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
      className="fixed inset-0 z-[90] bg-background flex flex-col overflow-hidden"
    >
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 border-b border-border bg-surface/95 backdrop-blur-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notifications"
          className="p-1"
        >
          <ArrowLeft size={22} className="text-text-primary" />
        </button>
        <h1 className="flex-1 text-lg font-bold text-text-primary truncate">
          Notifications
        </h1>
        {hasUnread && (
          <button
            type="button"
            onClick={() => markRead.mutate({ all: true })}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary px-2 py-1 rounded-lg hover:bg-primary/10"
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        )}
      </div>

      <div
        className="flex-1 overflow-y-auto max-w-lg w-full mx-auto"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {isLoading && (
          <p className="px-5 py-10 text-center text-sm text-neutral">
            Loading…
          </p>
        )}

        {!isLoading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 px-5 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface border border-border">
              <Bell size={22} className="text-neutral" />
            </div>
            <p className="text-sm font-medium text-text-primary">
              You&apos;re all caught up
            </p>
            <p className="text-xs text-neutral max-w-xs">
              We&apos;ll notify you here when someone challenges you, completes
              a match, or your result needs confirming.
            </p>
          </div>
        )}

        {!isLoading &&
          items.map((n) => {
            const unread = !n.readAt;
            const { Icon, tintClass } = iconForType(n.type);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleOpenNotification(n)}
                className={`w-full text-left px-4 py-3 border-b border-border flex items-start gap-3 transition-colors ${
                  unread
                    ? "bg-primary/[0.06] hover:bg-primary/10"
                    : "hover:bg-surface/80"
                }`}
              >
                <span
                  aria-hidden
                  className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-full ${tintClass}`}
                >
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary">{n.body}</p>
                  <p className="text-[11px] text-neutral mt-0.5">
                    {formatDisplayDate(n.createdAt)}
                  </p>
                </div>
                {unread && (
                  <span
                    aria-hidden
                    className="mt-1.5 shrink-0 h-2 w-2 rounded-full bg-primary"
                  />
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
}
