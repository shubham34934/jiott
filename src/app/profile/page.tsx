"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareText } from "lucide-react";
import { Button } from "@/components/Button";
import { JioTTAuthMark } from "@/components/JioTTLogo";
import {
  PlayerProfileView,
  PlayerProfileSkeleton,
  type PlayerProfilePayload,
} from "@/components/PlayerProfileView";
import { useAppSession } from "@/hooks/use-app-session";
import { apiGet } from "@/lib/api-client";
import { QUERY_STALE_TIME_MS } from "@/lib/queryStaleTime";

export default function ProfilePage() {
  const { data: session, status } = useAppSession();

  const { data: player } = useQuery<PlayerProfilePayload>({
    queryKey: ["player", session?.user?.playerId],
    queryFn: () =>
      apiGet(`/api/players/${session?.user?.playerId}`).then((r) => r.json()),
    enabled: !!session?.user?.playerId,
    staleTime: QUERY_STALE_TIME_MS,
  });

  if (status === "loading" || (session && !player)) {
    return <PlayerProfileSkeleton />;
  }

  if (!session) {
    return (
      <div className="px-4 pt-8 flex flex-col items-center justify-center min-h-[60vh]">
        <JioTTAuthMark />
        <h2 className="text-xl font-bold mb-2 text-text-primary">Welcome to JioTT</h2>
        <p className="text-sm text-neutral mb-6 text-center">
          Sign in to track your matches and compete on the leaderboard
        </p>
        <div className="flex w-full max-w-xs flex-col gap-4">
          <Link href="/auth/signin" className="w-full">
            <Button fullWidth size="lg">
              Sign in
            </Button>
          </Link>
          <Link href="/auth/register" className="w-full">
            <Button variant="secondary" fullWidth size="lg">
              Create account
            </Button>
          </Link>
          <Link
            href="/feedback"
            className="flex items-center justify-center gap-2 text-sm text-neutral hover:text-primary py-2"
          >
            <MessageSquareText size={18} />
            Send feedback
          </Link>
        </div>
      </div>
    );
  }

  if (!player) return null;

  return <PlayerProfileView player={player} />;
}
