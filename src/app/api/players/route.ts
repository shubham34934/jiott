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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sortBy = parseSortBy(searchParams.get("sortBy"));

  const orderBy =
    sortBy === "matchesPlayed"
      ? { matchesPlayed: "desc" as const }
      : sortBy === "matchesWon"
        ? { matchesWon: "desc" as const }
        : { rating: "desc" as const };

  const players = await prisma.player.findMany({
    include: {
      user: { select: { name: true, email: true, image: true } },
    },
    orderBy,
  });

  return NextResponse.json(players);
}
