"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

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
  const authState = authClient.useSession();

  const meQuery = useQuery({
    queryKey: ["me", authState.data?.user?.id],
    queryFn: async () => {
      const res = await fetch("/api/me");
      return res.json() as Promise<AppSessionUser | null>;
    },
    enabled: !!authState.data?.user,
  });

  const loading =
    authState.isPending ||
    (!!authState.data?.user &&
      (meQuery.isPending || meQuery.isFetching) &&
      meQuery.data === undefined);

  const user =
    authState.data?.user && meQuery.data
      ? {
          id: meQuery.data.id,
          playerId: meQuery.data.playerId,
          name: meQuery.data.name ?? authState.data.user.name,
          email: meQuery.data.email ?? authState.data.user.email,
          image: meQuery.data.image ?? authState.data.user.image ?? null,
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
