"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/Button";
import {
  PlayerProfileView,
  PlayerProfileSkeleton,
  type PlayerProfilePayload,
} from "@/components/PlayerProfileView";
import { useAppSession } from "@/hooks/use-app-session";
import { apiGet } from "@/lib/api-client";
import { QUERY_STALE_TIME_MS } from "@/lib/queryStaleTime";

export default function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useAppSession();
  const viewerPlayerId = session?.user?.playerId ?? null;

  const { data: player, isLoading } = useQuery<PlayerProfilePayload>({
    queryKey: ["player", id],
    queryFn: () => apiGet(`/api/players/${id}`).then((r) => r.json()),
    staleTime: QUERY_STALE_TIME_MS,
  });

  const header = (
    <div className="flex items-center gap-3 px-4 pt-4 pb-2 border-b border-border">
      <Link href="/players" className="p-1" aria-label="Back">
        <ArrowLeft size={22} className="text-text-primary" />
      </Link>
      <h1 className="text-lg font-bold text-text-primary">Player Profile</h1>
    </div>
  );

  if (isLoading) {
    return (
      <div>
        {header}
        <PlayerProfileSkeleton />
      </div>
    );
  }

  if (!player) {
    return (
      <div>
        {header}
        <p className="px-4 pt-8 text-center text-neutral text-sm">
          Player not found
        </p>
      </div>
    );
  }

  return (
    <div>
      {header}
      <PlayerProfileView
        player={player}
        viewerPlayerId={viewerPlayerId}
        actionSlot={
          <div className="px-4 mt-4">
            <Link href={`/matches/new?opponent=${id}`}>
              <Button fullWidth size="lg">
                Challenge Player
              </Button>
            </Link>
          </div>
        }
      />
    </div>
  );
}
