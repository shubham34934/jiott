import { NextResponse } from "next/server";
import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getApiActor } from "@/lib/get-api-actor";
import {
  getMatchesListData,
  MATCH_LIST_CACHE_TAG,
} from "@/lib/get-matches-list";
import {
  matchParticipantWithPlayerForApi,
  mergeRankedRatingDeltasForMatch,
} from "@/lib/match-participant-queries";
import { JSON_NO_STORE_HEADERS } from "@/lib/http-cache";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const friendly = searchParams.get("friendly");
  const tournament = searchParams.get("tournament");
  const matchType = searchParams.get("type");
  const rawLimit = parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.isNaN(rawLimit) ? DEFAULT_LIMIT : rawLimit)
  );
  const rawOffset = parseInt(searchParams.get("offset") || "0", 10);
  const offset = Math.max(0, Number.isNaN(rawOffset) ? 0 : rawOffset);

  const listParams = {
    status,
    friendly,
    tournament,
    matchType:
      matchType === "SINGLES" || matchType === "DOUBLES" ? matchType : null,
    limit,
    offset,
  };
  const cacheKey = JSON.stringify(listParams);

  const body = await unstable_cache(
    () => getMatchesListData(listParams),
    ["matches-list", cacheKey],
    { revalidate: 30, tags: [MATCH_LIST_CACHE_TAG] }
  )();

  return NextResponse.json(body, { headers: JSON_NO_STORE_HEADERS });
}

export async function POST(req: Request) {
  const actor = await getApiActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, playerIds, totalSets, pointsPerSet, isFriendly } = body;

  if (type === "SINGLES" && playerIds.length !== 2) {
    return NextResponse.json(
      { error: "Singles requires exactly 2 players" },
      { status: 400 }
    );
  }
  if (type === "DOUBLES" && playerIds.length !== 4) {
    return NextResponse.json(
      { error: "Doubles requires exactly 4 players" },
      { status: 400 }
    );
  }

  const uniqueIds = new Set(playerIds);
  if (uniqueIds.size !== playerIds.length) {
    return NextResponse.json(
      { error: "Duplicate players not allowed" },
      { status: 400 }
    );
  }

  const created = await prisma.match.create({
    data: {
      type,
      totalSets: totalSets || 3,
      pointsPerSet: pointsPerSet || 11,
      isFriendly: isFriendly || false,
      createdBy: actor.prismaUserId,
      participants: {
        create: playerIds.map((playerId: string, index: number) => ({
          playerId,
          team: type === "SINGLES"
            ? index === 0 ? "A" : "B"
            : index < 2 ? "A" : "B",
        })),
      },
      sets: {
        create: Array.from({ length: totalSets || 3 }, (_, i) => ({
          setNumber: i + 1,
        })),
      },
    },
    include: {
      participants: matchParticipantWithPlayerForApi,
      sets: { orderBy: { setNumber: "asc" } },
    },
  });

  const match = await mergeRankedRatingDeltasForMatch(created);

  await prisma.eventLog.create({
    data: {
      entityType: "Match",
      entityId: created.id,
      action: "CREATED",
      newValue: { type, playerIds, totalSets, pointsPerSet, isFriendly: isFriendly || false },
      updatedBy: actor.prismaUserId,
      matchId: match.id,
    },
  });

  revalidateTag(MATCH_LIST_CACHE_TAG, "max");

  return NextResponse.json(match, { status: 201 });
}
