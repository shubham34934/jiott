"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, LogOut, Sparkles } from "lucide-react";
import { Button } from "@/components/Button";
import { useAppSession } from "@/hooks/use-app-session";

export default function SettingsPage() {
  const router = useRouter();
  const { signOut } = useAppSession();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div>
      <div className="flex items-center gap-3 px-4 pt-4 pb-2 border-b border-border">
        <Link href="/profile" className="p-1" aria-label="Back">
          <ArrowLeft size={22} className="text-text-primary" />
        </Link>
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
