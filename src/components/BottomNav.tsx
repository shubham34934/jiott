"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  List,
  Medal,
  Plus,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  prefetchMatchesListFirstPage,
  prefetchPlayersListFirstPage,
} from "@/lib/query-prefetch";
import { useAppSession } from "@/hooks/use-app-session";

type NavTab = { href: string; label: string; icon: LucideIcon };

const leftTabs: NavTab[] = [
  { href: "/matches", label: "Matches", icon: List },
  { href: "/tournaments", label: "Tournaments", icon: Medal },
];

const rightTabs: NavTab[] = [
  { href: "/players", label: "Players", icon: Users },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
];

export function BottomNav() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: session } = useAppSession();

  // Hide on auth pages
  if (pathname.startsWith("/auth")) return null;

  function prefetchTabData(href: string) {
    if (href === "/matches") {
      void prefetchMatchesListFirstPage(queryClient);
      return;
    }
    if (href === "/players") {
      void prefetchPlayersListFirstPage(queryClient);
    }
  }

  const plusHref = session ? "/matches/new" : "/auth/signin?callbackUrl=/matches/new";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_32px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
        {leftTabs.map((tab) => (
          <TabLink
            key={tab.href}
            tab={tab}
            pathname={pathname}
            onHover={() => prefetchTabData(tab.href)}
          />
        ))}

        <Link
          href={plusHref}
          aria-label="Start a new match"
          className="flex items-center justify-center h-14 w-14 -mt-6 rounded-full bg-primary text-white shadow-[0_8px_24px_rgba(94,158,255,0.45)] ring-4 ring-background active:scale-95 transition-transform"
        >
          <Plus size={28} strokeWidth={3} />
        </Link>

        {rightTabs.map((tab) => (
          <TabLink
            key={tab.href}
            tab={tab}
            pathname={pathname}
            onHover={() => prefetchTabData(tab.href)}
          />
        ))}
      </div>
    </nav>
  );
}

function TabLink({
  tab,
  pathname,
  onHover,
}: {
  tab: NavTab;
  pathname: string;
  onHover: () => void;
}) {
  const isActive = pathname.startsWith(tab.href);
  return (
    <Link
      href={tab.href}
      onPointerEnter={onHover}
      className={`flex flex-col items-center justify-center gap-1 min-w-0 flex-1 max-w-[72px] py-2 ${
        isActive ? "text-primary" : "text-neutral"
      }`}
    >
      <tab.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
      <span
        className={`text-[10px] leading-tight text-center ${
          isActive ? "font-semibold" : "font-medium"
        }`}
      >
        {tab.label}
      </span>
    </Link>
  );
}
