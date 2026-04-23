"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { AppSidebar } from "@/components/AppSidebar";
import {
  NotificationsPanel,
  useNotifications,
} from "@/components/NotificationsSheet";
import { useAppSession } from "@/hooks/use-app-session";

const TOP_LEVEL_ROUTES = new Set<string>([
  "/matches",
  "/tournaments",
  "/players",
  "/leaderboard",
  "/profile",
]);

function titleFor(pathname: string): string {
  if (pathname === "/matches") return "Matches";
  if (pathname === "/tournaments") return "Tournaments";
  if (pathname === "/players") return "Players";
  if (pathname === "/leaderboard") return "Leaderboard";
  if (pathname === "/profile") return "Profile";
  return "JIotableTennis";
}

function shouldShow(pathname: string): boolean {
  if (pathname.startsWith("/auth")) return false;
  return TOP_LEVEL_ROUTES.has(pathname);
}

export function AppHeader() {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { data: session } = useAppSession();
  const { data: notifs } = useNotifications();
  const unreadCount = notifs?.unreadCount ?? 0;

  if (!shouldShow(pathname)) return null;

  const title = titleFor(pathname);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-surface/90 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="max-w-lg mx-auto h-14 flex items-center justify-between gap-2 px-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              aria-haspopup="dialog"
              aria-expanded={sidebarOpen}
              className="p-2 -ml-1 text-text-primary rounded-lg hover:bg-surface-raised/80"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-base font-bold text-text-primary truncate">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setNotificationsOpen(true)}
              aria-label={
                unreadCount > 0
                  ? `Open notifications (${unreadCount} unread)`
                  : "Open notifications"
              }
              aria-haspopup="dialog"
              className="relative p-2 text-text-primary rounded-lg hover:bg-surface-raised/80"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span
                  aria-hidden
                  className="absolute top-1 right-1 flex items-center justify-center h-[16px] min-w-[16px] px-[3px] rounded-full bg-danger text-white text-[9px] font-bold leading-none tabular-nums ring-2 ring-surface"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {session ? (
              <Link
                href="/profile"
                aria-label="Open profile"
                className="ml-1 rounded-full"
              >
                <Avatar
                  name={session.user.name || ""}
                  image={session.user.image}
                  size="sm"
                />
              </Link>
            ) : (
              <Link
                href="/auth/signin"
                className="ml-1 text-xs font-semibold text-primary px-2.5 py-1.5 rounded-full border border-primary/35"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <div
        aria-hidden="true"
        className="h-14"
        style={{ marginTop: "env(safe-area-inset-top)" }}
      />

      <AppSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <NotificationsPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </>
  );
}
