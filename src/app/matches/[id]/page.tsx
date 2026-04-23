import type { Metadata } from "next";
import { MatchDetailPageClient } from "./match-detail-client";
import { safeReturnPath } from "@/lib/safe-return-path";
import { prisma } from "@/lib/prisma";
import { getCompletedMatchOutcome } from "@/lib/matchWinningTeam";
import { firstNamesJoined } from "@/lib/displayName";

function firstReturnToQuery(
  raw: string | string[] | undefined
): string | null {
  if (raw === undefined) return null;
  if (typeof raw === "string") return raw;
  return typeof raw[0] === "string" ? raw[0] : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const match = await prisma.match.findUnique({
    where: { id },
    select: {
      status: true,
      totalSets: true,
      pointsPerSet: true,
      isFriendly: true,
      participants: {
        select: {
          team: true,
          player: { select: { user: { select: { name: true } } } },
        },
      },
      sets: {
        orderBy: { setNumber: "asc" },
        select: { teamAScore: true, teamBScore: true },
      },
    },
  });
  if (!match) {
    return { title: "Match · JIotableTennis" };
  }
  const teamAName = firstNamesJoined(
    match.participants.filter((p) => p.team === "A").map((p) => p.player.user.name)
  );
  const teamBName = firstNamesJoined(
    match.participants.filter((p) => p.team === "B").map((p) => p.player.user.name)
  );
  const outcome =
    match.status === "COMPLETED"
      ? getCompletedMatchOutcome({
          sets: match.sets,
          totalSets: match.totalSets,
          pointsPerSet: match.pointsPerSet,
        })
      : null;
  const scorePart = outcome
    ? ` ${outcome.teamAWins}-${outcome.teamBWins}`
    : "";
  const title = `${teamAName || "Team A"}${scorePart} ${teamBName || "Team B"} · JIotableTennis`;
  const description = match.isFriendly
    ? "Friendly match on JIotableTennis."
    : "Match on JIotableTennis.";
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const returnTo = safeReturnPath(firstReturnToQuery(sp.returnTo));
  return <MatchDetailPageClient id={id} returnTo={returnTo} />;
}
