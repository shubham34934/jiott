"use client";

import Link from "next/link";

export function PlayerProfileLink({
  playerId,
  children,
  className,
  stopPropagation,
}: {
  playerId: string;
  children: React.ReactNode;
  className?: string;
  /** When the link sits inside a parent that handles clicks (e.g. match card). */
  stopPropagation?: boolean;
}) {
  return (
    <Link
      href={`/players/${playerId}`}
      className={className}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
    >
      {children}
    </Link>
  );
}

/** Team row used in tournaments (player1 / optional player2). */
export function TeamPlayersLinks({
  team,
  className = "font-medium hover:underline text-inherit",
  stopPropagation,
}: {
  team: {
    player1: { id: string; user: { name: string | null } };
    player2: { id: string; user: { name: string | null } } | null;
  } | null;
  className?: string;
  stopPropagation?: boolean;
}) {
  if (!team) return <>TBD</>;
  const p1 = team.player1.user.name || "?";
  if (!team.player2) {
    return (
      <PlayerProfileLink
        playerId={team.player1.id}
        className={className}
        stopPropagation={stopPropagation}
      >
        {p1}
      </PlayerProfileLink>
    );
  }
  const p2 = team.player2.user.name || "?";
  return (
    <>
      <PlayerProfileLink
        playerId={team.player1.id}
        className={className}
        stopPropagation={stopPropagation}
      >
        {p1}
      </PlayerProfileLink>
      <span className="mx-1.5 shrink-0 text-neutral">&</span>
      <PlayerProfileLink
        playerId={team.player2.id}
        className={className}
        stopPropagation={stopPropagation}
      >
        {p2}
      </PlayerProfileLink>
    </>
  );
}
