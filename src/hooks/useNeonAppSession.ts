"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { QUERY_STALE_TIME_MS } from "@/lib/queryStaleTime";

export type AppSessionUser = {
  id: string;
  playerId: string;
  name: string | null;
  email: string;
  image: string | null;
};

/** Neon Auth session + `/api/me` (Prisma player id for APIs). */
export function useNeonAppSession() {
  const queryClient = useQueryClient();
  const authState = authClient.useSession() as {
    data?: { user?: { id?: string } } | null;
    isPending: boolean;
    isRefetching?: boolean;
  };

  const meQuery = useQuery({
    queryKey: ["me", authState.data?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      return res.json() as Promise<AppSessionUser | null>;
    },
    enabled: !!authState.data?.user,
    staleTime: QUERY_STALE_TIME_MS,
    retry: 4,
    retryDelay: (attempt) => Math.min(1500, 400 * 2 ** attempt),
  });

  const hasAuthUser = !!authState.data?.user;

  const mePayload = meQuery.data;
  const hasMe =
    mePayload != null &&
    typeof mePayload === "object" &&
    "playerId" in mePayload;

  const loading =
    authState.isPending ||
    (!hasAuthUser && !!authState.isRefetching) ||
    (hasAuthUser &&
      !meQuery.isError &&
      !hasMe &&
      (meQuery.isPending || meQuery.isFetching || meQuery.isLoading));

  const authUser = authState.data?.user;
  const user =
    authUser && hasMe && mePayload && typeof mePayload === "object"
      ? {
          id: (mePayload as AppSessionUser).id,
          playerId: (mePayload as AppSessionUser).playerId,
          name: (mePayload as AppSessionUser).name ?? authUser.name,
          email: (mePayload as AppSessionUser).email ?? authUser.email,
          image:
            (mePayload as AppSessionUser).image ?? authUser.image ?? null,
        }
      : null;

  async function signOut() {
    await authClient.signOut();
    await queryClient.invalidateQueries({ queryKey: ["me"] });
  }

  return {
    status: loading ? "loading" : user ? "authenticated" : "unauthenticated",
    data: user ? { user } : null,
    signOut,
  };
}
