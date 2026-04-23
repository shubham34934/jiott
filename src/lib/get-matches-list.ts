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
  /** Players required on one side. */
  teamPlayerIds: readonly string[];
  /** Players required on the opposing side. */
  opponentPlayerIds: readonly string[];
  /** Lower bound for `createdAt` (inclusive). ISO string. */
  fromIso: string | null;
  /** Upper bound for `createdAt` (inclusive). ISO string. */
  toIso: string | null;
  limit: number;
  offset: number;
};

function participantsOn(
  playerIds: readonly string[],
  team: "A" | "B"
): Array<Record<string, unknown>> {
  return playerIds.map((id) => ({
    participants: { some: { playerId: id, team } },
  }));
}

/**
 * Match-side filter. If only one list is given, matches where those players
 * sit on the same side. If both are given, matches where `team` is on one
 * side AND `opponent` is on the other.
 */
function buildTeamOpponentFilter(
  teamPlayerIds: readonly string[],
  opponentPlayerIds: readonly string[]
): Record<string, unknown> | null {
  const hasTeam = teamPlayerIds.length > 0;
  const hasOpp = opponentPlayerIds.length > 0;
  if (!hasTeam && !hasOpp) return null;

  const sides = [
    { me: "A", other: "B" },
    { me: "B", other: "A" },
  ] as const;
  return {
    OR: sides.map(({ me, other }) => ({
      AND: [
        ...participantsOn(teamPlayerIds, me),
        ...participantsOn(opponentPlayerIds, other),
      ],
    })),
  };
}

export async function getMatchesListData(params: MatchesListParams) {
  const {
    status,
    friendly,
    tournament,
    matchType,
    teamPlayerIds,
    opponentPlayerIds,
    fromIso,
    toIso,
    limit,
    offset,
  } = params;

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

  const teamFilter = buildTeamOpponentFilter(teamPlayerIds, opponentPlayerIds);
  if (teamFilter) Object.assign(where, teamFilter);

  const createdAt: Record<string, Date> = {};
  if (fromIso) {
    const d = new Date(fromIso);
    if (!Number.isNaN(d.getTime())) createdAt.gte = d;
  }
  if (toIso) {
    const d = new Date(toIso);
    if (!Number.isNaN(d.getTime())) createdAt.lte = d;
  }
  if (Object.keys(createdAt).length > 0) {
    where.createdAt = createdAt;
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
