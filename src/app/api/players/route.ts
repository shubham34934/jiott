import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SORT_FIELDS = ["rating", "matchesPlayed", "matchesWon"] as const;
type SortField = (typeof SORT_FIELDS)[number];

function parseSortBy(raw: string | null): SortField {
  if (raw && SORT_FIELDS.includes(raw as SortField)) {
    return raw as SortField;
  }
  return "rating";
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sortBy = parseSortBy(searchParams.get("sortBy"));
  const q = searchParams.get("q")?.trim() ?? "";

  const rawLimit = parseInt(
    searchParams.get("limit") || String(DEFAULT_LIMIT),
    10
  );
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.isNaN(rawLimit) ? DEFAULT_LIMIT : rawLimit)
  );
  const rawOffset = parseInt(searchParams.get("offset") || "0", 10);
  const offset = Math.max(0, Number.isNaN(rawOffset) ? 0 : rawOffset);

  const orderBy =
    sortBy === "matchesPlayed"
      ? { matchesPlayed: "desc" as const }
      : sortBy === "matchesWon"
        ? { matchesWon: "desc" as const }
        : { rating: "desc" as const };

  const where =
    q.length > 0
      ? {
          user: {
            name: { contains: q, mode: "insensitive" as const },
          },
        }
      : undefined;

  const total = await prisma.player.count({ where });

  const players = await prisma.player.findMany({
    where,
    include: {
      user: { select: { name: true, email: true, image: true } },
    },
    orderBy,
    skip: offset,
    take: limit + 1,
  });

  const hasMore = players.length > limit;
  const items = hasMore ? players.slice(0, limit) : players;

  return NextResponse.json({
    items,
    hasMore,
    nextOffset: offset + items.length,
    total,
  });
}
