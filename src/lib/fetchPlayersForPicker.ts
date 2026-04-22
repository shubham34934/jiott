import { apiGet } from "@/lib/api-client";

/** Loads all players for dropdowns (paginates until `hasMore` is false). */
export async function fetchPlayersForPicker(
  sortBy: "rating" | "matchesPlayed" | "matchesWon" = "rating"
): Promise<unknown[]> {
  const limit = 1000;
  let offset = 0;
  const items: unknown[] = [];
  for (;;) {
    const r = await apiGet(
      `/api/players?limit=${limit}&offset=${offset}&sortBy=${sortBy}`
    );
    const d = (await r.json()) as {
      items: unknown[];
      hasMore: boolean;
      nextOffset: number;
    };
    items.push(...d.items);
    if (!d.hasMore) break;
    offset = d.nextOffset;
    if (items.length > 20_000) break;
  }
  return items;
}
