"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { signOut as nextSignOut, useSession } from "next-auth/react";
import { apiGet } from "@/lib/api-client";
import { QUERY_STALE_TIME_MS } from "@/lib/queryStaleTime";

export type AppSessionUser = {
  id: string;
  playerId: string;
  name: string | null;
  email: string;
  image: string | null;
};

/**
 * NextAuth session → AppSessionUser. `playerId` is normally embedded in the JWT
 * so no DB/API hit is needed. For legacy JWTs without it we fall back to /api/me.
 */
export function useAppSession() {
  const queryClient = useQueryClient();
  const { data: authData, status: authStatus, update } = useSession();

  const sessionUser = authData?.user;
  const hasAuthId = !!sessionUser?.id;
  const jwtPlayerId = sessionUser?.playerId ?? null;

  // Only runs for legacy users whose JWT doesn't carry playerId yet.
  const meQuery = useQuery({
    queryKey: ["me", sessionUser?.id],
    queryFn: async () => {
      const res = await apiGet("/api/me", { credentials: "include" });
      return res.json() as Promise<AppSessionUser | null>;
    },
    enabled: hasAuthId && !jwtPlayerId,
    staleTime: QUERY_STALE_TIME_MS,
    retry: 2,
    retryDelay: (attempt) => Math.min(1500, 400 * 2 ** attempt),
  });

  const effectivePlayerId = jwtPlayerId ?? meQuery.data?.playerId ?? null;

  const loading =
    authStatus === "loading" ||
    (hasAuthId && !effectivePlayerId && meQuery.isPending);

  const user =
    sessionUser && effectivePlayerId
      ? {
          id: sessionUser.id as string,
          playerId: effectivePlayerId,
          name: sessionUser.name ?? null,
          email: sessionUser.email ?? "",
          image: sessionUser.image ?? null,
        }
      : null;

  async function signOut() {
    await nextSignOut({ redirect: false });
    await update();
    await queryClient.invalidateQueries({ queryKey: ["me"] });
  }

  return {
    status: loading ? "loading" : user ? "authenticated" : "unauthenticated",
    data: user ? { user } : null,
    signOut,
  };
}
