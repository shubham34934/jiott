import type { Metadata } from "next";
import { MatchDetailPageClient } from "./match-detail-client";
import { prisma } from "@/lib/prisma";
import { getCompletedMatchOutcome } from "@/lib/matchWinningTeam";
import { firstNamesJoined } from "@/lib/displayName";

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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MatchDetailPageClient id={id} />;
}
