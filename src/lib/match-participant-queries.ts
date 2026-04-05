import type { Prisma } from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Match list/detail payloads only need these fields. Using an explicit shape avoids
 * Prisma P2022 when the DB is behind migrations (`MatchParticipant.rankedRatingDelta`,
 * `Player` win-streak columns).
 */
export const matchParticipantWithPlayerForApi = {
  select: {
    id: true,
    matchId: true,
    playerId: true,
    team: true,
    player: {
      select: {
        id: true,
        rating: true,
        userId: true,
        user: { select: { name: true, image: true } },
      },
    },
  },
} satisfies { select: Prisma.MatchParticipantSelect };

export type MatchParticipantForApi = Prisma.MatchParticipantGetPayload<
  typeof matchParticipantWithPlayerForApi
>;

export function isPrismaMissingColumnError(
  e: unknown
): e is PrismaNamespace.PrismaClientKnownRequestError {
  return (
    e instanceof PrismaNamespace.PrismaClientKnownRequestError &&
    e.code === "P2022"
  );
}

export async function mergeRankedRatingDeltasForMatch<
  T extends { id: string; participants: MatchParticipantForApi[] },
>(match: T): Promise<
  T & {
    participants: Array<MatchParticipantForApi & { rankedRatingDelta?: number | null }>;
  }
> {
  try {
    const rows = await prisma.matchParticipant.findMany({
      where: { matchId: match.id },
      select: { playerId: true, rankedRatingDelta: true },
    });
    const map = new Map(rows.map((r) => [r.playerId, r.rankedRatingDelta]));
    return {
      ...match,
      participants: match.participants.map((p) => ({
        ...p,
        rankedRatingDelta: map.get(p.playerId) ?? null,
      })),
    };
  } catch (e) {
    if (isPrismaMissingColumnError(e)) {
      return match as T & {
        participants: Array<
          MatchParticipantForApi & { rankedRatingDelta?: number | null }
        >;
      };
    }
    throw e;
  }
}

export async function mergeRankedRatingDeltasForMatches<
  T extends { id: string; participants: MatchParticipantForApi[] },
>(matches: T[]): Promise<
  Array<
    T & {
      participants: Array<
        MatchParticipantForApi & { rankedRatingDelta?: number | null }
      >;
    }
  >
> {
  if (matches.length === 0) return matches;
  const ids = matches.map((m) => m.id);
  try {
    const rows = await prisma.matchParticipant.findMany({
      where: { matchId: { in: ids } },
      select: { matchId: true, playerId: true, rankedRatingDelta: true },
    });
    const byMatch = new Map<string, Map<string, number | null>>();
    for (const r of rows) {
      let inner = byMatch.get(r.matchId);
      if (!inner) {
        inner = new Map();
        byMatch.set(r.matchId, inner);
      }
      inner.set(r.playerId, r.rankedRatingDelta);
    }
    return matches.map((m) => {
      const inner = byMatch.get(m.id);
      return {
        ...m,
        participants: m.participants.map((p) => ({
          ...p,
          rankedRatingDelta: inner?.get(p.playerId) ?? null,
        })),
      };
    });
  } catch (e) {
    if (isPrismaMissingColumnError(e)) {
      return matches as Array<
        T & {
          participants: Array<
            MatchParticipantForApi & { rankedRatingDelta?: number | null }
          >;
        }
      >;
    }
    throw e;
  }
}
