import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getApiActor } from "@/lib/get-api-actor";
import {
  getTournamentsListCached,
  TOURNAMENTS_LIST_CACHE_TAG,
} from "@/lib/get-tournaments-list";
import { JSON_NO_STORE_HEADERS } from "@/lib/http-cache";

export async function GET() {
  const tournaments = await getTournamentsListCached();
  return NextResponse.json(tournaments, { headers: JSON_NO_STORE_HEADERS });
}

export async function POST(req: Request) {
  const actor = await getApiActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, matchType, type: tournamentType } = body;

  const type =
    tournamentType === "ROUND_ROBIN" ? "ROUND_ROBIN" : "SINGLE_ELIMINATION";

  const tournament = await prisma.tournament.create({
    data: {
      name,
      matchType,
      type,
      createdBy: actor.prismaUserId,
    },
  });

  revalidateTag(TOURNAMENTS_LIST_CACHE_TAG, "max");

  return NextResponse.json(tournament, { status: 201 });
}
