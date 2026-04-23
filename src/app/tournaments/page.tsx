import { getTournamentsListCached } from "@/lib/get-tournaments-list";
import { TournamentListCard } from "@/components/TournamentListCard";
import { TournamentsHeader } from "./tournaments-header";

/** Avoid DB access during `next build`; list payload is cached via `unstable_cache`. */
export const dynamic = "force-dynamic";

type TeamLike = {
  player1: { user: { name: string | null } };
  player2: { user: { name: string | null } } | null;
};

function getTeamName(team: TeamLike | null): string {
  if (!team) return "—";
  const p1 = team.player1?.user?.name || "?";
  const p2 = team.player2?.user?.name;
  return p2 ? `${p1} & ${p2}` : p1;
}

export default async function TournamentsListPage() {
  const tournaments = await getTournamentsListCached();

  return (
    <div className="px-4 pt-4">
      <div className="mb-6">
        <TournamentsHeader />
      </div>

      {tournaments.length === 0 && (
        <p className="text-sm text-neutral text-center py-12">
          No tournaments yet. Create one to run a bracket.
        </p>
      )}

      <div className="flex flex-col gap-3 pb-4">
        {tournaments.map((t) => {
          const finalMatch = t.matches[0];
          const champion =
            t.status === "COMPLETED" && finalMatch?.winner
              ? getTeamName(finalMatch.winner as TeamLike)
              : null;

          return (
            <TournamentListCard
              key={t.id}
              href={`/tournaments/${t.id}`}
              title={t.name}
              status={t.status}
              meta={`${t.matchType} · ${t._count.teams} teams · ${t._count.matches} bracket matches`}
              highlight={champion ? `Winner: ${champion}` : null}
            />
          );
        })}
      </div>
    </div>
  );
}
