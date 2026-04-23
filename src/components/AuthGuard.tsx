"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAppSession } from "@/hooks/use-app-session";

/** Paths that render without a signed-in user. */
const PUBLIC_PATH_PREFIXES = ["/auth", "/privacy", "/terms"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useAppSession();
  const isPublic = isPublicPath(pathname);

  useEffect(() => {
    if (isPublic) return;
    if (status !== "unauthenticated") return;
    const target =
      pathname && pathname !== "/"
        ? `/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`
        : "/auth/signin";
    router.replace(target);
  }, [status, isPublic, pathname, router]);

  if (isPublic) return <>{children}</>;
  if (status === "authenticated") return <>{children}</>;

  // Loading or redirecting → render a neutral full-screen spinner, no app chrome.
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background z-[70]">
      <Loader2
        size={28}
        className="animate-spin text-primary"
        aria-hidden
      />
    </div>
  );
}
