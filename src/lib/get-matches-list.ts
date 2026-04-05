import { prisma } from "@/lib/prisma";
import {
  matchParticipantWithPlayerForApi,
  mergeRankedRatingDeltasForMatches,
} from "@/lib/match-participant-queries";

/** Tag for `unstable_cache` / `revalidateTag` on `/api/matches` list payloads. */
export const MATCH_LIST_CACHE_TAG = "match-list";

export type MatchesListParams = {
  status: string | null;
  friendly: string | null;
  tournament: string | null;
  /** `SINGLES` | `DOUBLES` when set */
  matchType: string | null;
  limit: number;
  offset: number;
};

export async function getMatchesListData(params: MatchesListParams) {
  const { status, friendly, tournament, matchType, limit, offset } = params;

  const linkedRows = await prisma.tournamentMatch.findMany({
    where: { matchId: { not: null } },
    select: { matchId: true },
  });
  const linkedMatchIds = [
    ...new Set(
      linkedRows
        .map((r) => r.matchId)
        .filter((id): id is string => id != null)
    ),
  ];
  const linkedSet = new Set(linkedMatchIds);

  const where: Record<string, unknown> = {};
  if (status) where.status = status as "ONGOING" | "COMPLETED";
  if (friendly === "true") where.isFriendly = true;
  if (matchType === "SINGLES" || matchType === "DOUBLES") {
    where.type = matchType;
  }

  if (tournament === "exclude" && linkedMatchIds.length > 0) {
    where.id = { notIn: linkedMatchIds };
  } else if (tournament === "only") {
    if (linkedMatchIds.length === 0) {
      return {
        items: [],
        hasMore: false,
        nextOffset: 0,
        total: 0,
      };
    }
    where.id = { in: linkedMatchIds };
  }

  const total = await prisma.match.count({ where });

  const matches = await prisma.match.findMany({
    where,
    include: {
      participants: matchParticipantWithPlayerForApi,
      sets: { orderBy: { setNumber: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    skip: offset,
    take: limit + 1,
  });

  const hasMore = matches.length > limit;
  const pageMatches = hasMore ? matches.slice(0, limit) : matches;
  const pageWithDeltas =
    await mergeRankedRatingDeltasForMatches(pageMatches);

  const matchIds = pageWithDeltas.map((m) => m.id);
  const tournamentLinks =
    matchIds.length > 0
      ? await prisma.tournamentMatch.findMany({
          where: { matchId: { in: matchIds } },
          select: {
            matchId: true,
            tournament: { select: { name: true } },
          },
        })
      : [];

  const tournamentNameByMatchId = new Map<string, string>();
  for (const row of tournamentLinks) {
    if (row.matchId && !tournamentNameByMatchId.has(row.matchId)) {
      tournamentNameByMatchId.set(row.matchId, row.tournament.name);
    }
  }

  const payload = pageWithDeltas.map((m) => ({
    ...m,
    isTournamentMatch: linkedSet.has(m.id),
    tournamentName: tournamentNameByMatchId.get(m.id) ?? null,
  }));

  return {
    items: payload,
    hasMore,
    nextOffset: offset + pageWithDeltas.length,
    total,
  };
}
