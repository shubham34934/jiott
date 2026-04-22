import { NextResponse } from "next/server";
import {
  getPlayersListCached,
  parsePlayersListSort,
} from "@/lib/get-players-list";
import { JSON_NO_STORE_HEADERS } from "@/lib/http-cache";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 1000;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sortBy = parsePlayersListSort(searchParams.get("sortBy"));
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

  const params = { sortBy, q, limit, offset };
  const body = await getPlayersListCached(params);

  return NextResponse.json(body, { headers: JSON_NO_STORE_HEADERS });
}
