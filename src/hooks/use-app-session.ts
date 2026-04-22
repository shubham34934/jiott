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

/** NextAuth session + `/api/me` (Prisma player id for APIs). */
export function useAppSession() {
  const queryClient = useQueryClient();
  const { data: authData, status: authStatus, update } = useSession();

  const meQuery = useQuery({
    queryKey: ["me", authData?.user?.id],
    queryFn: async () => {
      const res = await apiGet("/api/me", { credentials: "include" });
      return res.json() as Promise<AppSessionUser | null>;
    },
    enabled: !!authData?.user?.id,
    staleTime: QUERY_STALE_TIME_MS,
    retry: 4,
    retryDelay: (attempt) => Math.min(1500, 400 * 2 ** attempt),
  });

  const hasAuthUser = !!authData?.user?.id;

  const mePayload = meQuery.data;
  const hasMe =
    mePayload != null &&
    typeof mePayload === "object" &&
    "playerId" in mePayload;

  const loading =
    authStatus === "loading" ||
    (hasAuthUser &&
      !meQuery.isError &&
      !hasMe &&
      (meQuery.isPending || meQuery.isFetching || meQuery.isLoading));

  const authUser = authData?.user;
  const user =
    authUser && hasMe && mePayload && typeof mePayload === "object"
      ? {
          id: (mePayload as AppSessionUser).id,
          playerId: (mePayload as AppSessionUser).playerId,
          name: (mePayload as AppSessionUser).name ?? authUser.name,
          email: (mePayload as AppSessionUser).email ?? authUser.email ?? "",
          image:
            (mePayload as AppSessionUser).image ?? authUser.image ?? null,
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
