"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  List,
  Medal,
  Settings,
  Sparkles,
  Trophy,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useAppSession } from "@/hooks/use-app-session";

type NavItem = { href: string; label: string; icon: LucideIcon };

const primaryItems: NavItem[] = [
  { href: "/matches", label: "Matches", icon: List },
  { href: "/tournaments", label: "Tournaments", icon: Medal },
  { href: "/players", label: "Players", icon: Users },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
];

const secondaryItems: NavItem[] = [
  { href: "/profile/settings", label: "Settings", icon: Settings },
  { href: "/profile/settings/rating", label: "How ratings work", icon: Sparkles },
];

export interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AppSidebar({ open, onClose }: AppSidebarProps) {
  const { data: session } = useAppSession();
  const pathname = usePathname();

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

  return (
    <div
      className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        className={`absolute top-0 bottom-0 left-0 w-[82%] max-w-xs bg-surface border-r border-border flex flex-col shadow-2xl shadow-black/40 ring-1 ring-white/[0.04] transform transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative bg-gradient-to-br from-secondary to-primary text-white p-5 pb-6 pt-[max(1rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10"
          >
            <X size={18} />
          </button>
          {session ? (
            <div className="flex flex-col items-start gap-3">
              <Avatar
                name={session.user.name || ""}
                image={session.user.image}
                size="xl"
              />
              <div className="min-w-0">
                <h3 className="text-lg font-bold truncate">
                  {session.user.name || "Player"}
                </h3>
                <p className="text-xs opacity-85 truncate">
                  {session.user.email}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-bold">Welcome</h3>
              <p className="text-xs opacity-85">Sign in to track your matches</p>
              <div className="mt-4 flex gap-2">
                <Link
                  href="/auth/signin"
                  onClick={onClose}
                  className="text-xs font-semibold bg-white text-primary rounded-full px-3 py-1.5"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/register"
                  onClick={onClose}
                  className="text-xs font-semibold bg-white/20 text-white rounded-full px-3 py-1.5"
                >
                  Register
                </Link>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {primaryItems.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={pathname === item.href}
              onClose={onClose}
            />
          ))}
          <div className="my-2 border-t border-border" />
          {secondaryItems.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={pathname === item.href}
              onClose={onClose}
            />
          ))}
        </nav>
      </aside>
    </div>
  );
}

function SidebarLink({
  item,
  active,
  onClose,
}: {
  item: NavItem;
  active: boolean;
  onClose: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClose}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-primary/12 text-primary"
          : "text-text-primary hover:bg-surface-raised/80"
      }`}
    >
      <Icon size={18} className={active ? "text-primary" : "text-neutral"} />
      <span>{item.label}</span>
    </Link>
  );
}
