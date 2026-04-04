"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Home,
  List,
  Users,
  Trophy,
  User,
  Medal,
} from "lucide-react";
import {
  dashboardMatchesPrefetch,
  prefetchMatchesListFirstPage,
  prefetchPlayersListFirstPage,
} from "@/lib/query-prefetch";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/matches", label: "Matches", icon: List },
  { href: "/tournaments", label: "Tournaments", icon: Medal },
  { href: "/players", label: "Players", icon: Users },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // Hide on auth pages
  if (pathname.startsWith("/auth")) return null;

  function prefetchTabData(href: string) {
    if (href === "/") {
      void queryClient.prefetchQuery(dashboardMatchesPrefetch);
      return;
    }
    if (href === "/matches") {
      void prefetchMatchesListFirstPage(queryClient);
      return;
    }
    if (href === "/players") {
      void prefetchPlayersListFirstPage(queryClient);
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              onPointerEnter={() => prefetchTabData(tab.href)}
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
        })}
      </div>
    </nav>
  );
}
