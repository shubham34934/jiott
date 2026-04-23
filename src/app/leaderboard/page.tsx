import Link from "next/link";
import { getLeaderboardPlayersCached } from "@/lib/get-leaderboard";

/** Avoid DB access during `next build`; data is still cached per request via `unstable_cache`. */
export const dynamic = "force-dynamic";

const podiumIcons = ["🥇", "🥈", "🥉"];
const podiumBorderColors = ["border-gold", "border-silver", "border-bronze"];
const podiumSurfaceClasses = [
  "bg-gold/12 ring-1 ring-gold/25",
  "bg-silver/10 ring-1 ring-silver/20",
  "bg-bronze/12 ring-1 ring-bronze/25",
];

export default async function LeaderboardPage() {
  const players = await getLeaderboardPlayersCached();

  const topThree = players.slice(0, 3);

  return (
    <div className="px-4 pt-4">
      <div className="mb-5">
        <p className="text-sm font-semibold text-text-primary">
          Who&apos;s ruling the table?
        </p>
        <p className="text-xs text-neutral mt-0.5">
          {players.length}{" "}
          {players.length === 1 ? "player" : "players"} ranked by Elo rating.
          Win to climb, lose to fall.
        </p>
      </div>

      {topThree.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {topThree.map((p, i) => {
            const winRate =
              p.matchesPlayed > 0
                ? Math.round((p.matchesWon / p.matchesPlayed) * 100)
                : 0;

            return (
              <Link key={p.id} href={`/players/${p.id}`}>
                <div
                  className={`rounded-xl border-2 p-3 text-center transition-transform hover:scale-[1.02] ${podiumSurfaceClasses[i]} ${podiumBorderColors[i]}`}
                >
                  <span className="text-2xl">{podiumIcons[i]}</span>
                  <p className="font-semibold text-sm mt-2 truncate text-text-primary">
                    {p.user.name}
                  </p>
                  <p className="text-lg font-bold text-primary mt-1">
                    {p.rating}
                  </p>
                  <p className="text-xs text-neutral">{winRate}% win</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {players.map((p, i) => {
          const winRate =
            p.matchesPlayed > 0
              ? Math.round((p.matchesWon / p.matchesPlayed) * 100)
              : 0;

          return (
            <Link
              key={p.id}
              href={`/players/${p.id}`}
              className="block w-full"
            >
              <div className="bg-surface rounded-xl border border-border p-4 flex items-center gap-4 shadow-sm ring-1 ring-white/[0.03]">
                <span className="text-lg font-bold text-neutral-light w-8 text-center tabular-nums">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate text-text-primary">
                    {p.user.name}
                  </p>
                  <p className="text-xs text-neutral">
                    {p.matchesPlayed} matches &middot; {winRate}% win
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary tabular-nums">
                    {p.rating}
                  </p>
                  <p className="text-xs text-neutral">rating</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {players.length === 0 && (
        <p className="text-sm text-neutral text-center py-12">
          No players on the leaderboard yet.
        </p>
      )}
    </div>
  );
}
