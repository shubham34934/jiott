/** Mirrors `/api/matches` query semantics for client-side filtering. */
export type MatchFilterTab =
  | "all"
  | "AWAITING_ACCEPTANCE"
  | "ONGOING"
  | "AWAITING_CONFIRMATION"
  | "COMPLETED"
  | "FRIENDLY";

/** `regular` = exclude bracket matches; `tournament` = only bracket; `all` = both. */
export type MatchSourceTab = "regular" | "tournament" | "all";

/** Singles vs doubles — matches `Match.type` in the database. */
export type MatchFormatTab = "all" | "SINGLES" | "DOUBLES";

export type MatchForFilter = {
  status: string;
  type?: "SINGLES" | "DOUBLES";
  isFriendly?: boolean;
  isTournamentMatch?: boolean;
};

export function matchPassesFilters(
  match: MatchForFilter,
  filter: MatchFilterTab,
  source: MatchSourceTab,
  format: MatchFormatTab
): boolean {
  if (source === "regular" && match.isTournamentMatch) {
    return false;
  }
  if (source === "tournament" && !match.isTournamentMatch) {
    return false;
  }
  if (format === "SINGLES" && match.type !== "SINGLES") {
    return false;
  }
  if (format === "DOUBLES" && match.type !== "DOUBLES") {
    return false;
  }
  if (filter === "ONGOING" && match.status !== "ONGOING") {
    return false;
  }
  if (filter === "COMPLETED" && match.status !== "COMPLETED") {
    return false;
  }
  if (
    filter === "AWAITING_ACCEPTANCE" &&
    match.status !== "AWAITING_ACCEPTANCE"
  ) {
    return false;
  }
  if (
    filter === "AWAITING_CONFIRMATION" &&
    match.status !== "AWAITING_CONFIRMATION"
  ) {
    return false;
  }
  if (filter === "FRIENDLY" && !match.isFriendly) {
    return false;
  }
  return true;
}
