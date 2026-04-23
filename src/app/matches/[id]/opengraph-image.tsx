import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { getCompletedMatchOutcome } from "@/lib/matchWinningTeam";
import { firstNamesJoined } from "@/lib/displayName";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "JIotableTennis match";

export default async function OpengraphImage({
  params,
}: {
  params: { id: string };
}) {
  const match = await prisma.match.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      status: true,
      type: true,
      isFriendly: true,
      totalSets: true,
      pointsPerSet: true,
      createdAt: true,
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

  const gradient =
    "linear-gradient(135deg, #2554d4 0%, #5e9eff 60%, #7bc0ff 100%)";

  if (!match) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
            background: gradient,
            color: "white",
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: -1,
          }}
        >
          JIotableTennis
        </div>
      ),
      size
    );
  }

  const teamA = match.participants.filter((p) => p.team === "A");
  const teamB = match.participants.filter((p) => p.team === "B");
  const teamAName = firstNamesJoined(
    teamA.map((p) => p.player.user.name)
  );
  const teamBName = firstNamesJoined(
    teamB.map((p) => p.player.user.name)
  );

  const outcome =
    match.status === "COMPLETED"
      ? getCompletedMatchOutcome({
          sets: match.sets,
          totalSets: match.totalSets,
          pointsPerSet: match.pointsPerSet,
        })
      : null;
  const teamASetsWon = outcome?.teamAWins ?? 0;
  const teamBSetsWon = outcome?.teamBWins ?? 0;
  const teamAWon = outcome?.winningTeam === "A";
  const teamBWon = outcome?.winningTeam === "B";

  const dateStr = new Date(match.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const statusLabel =
    match.status === "COMPLETED"
      ? "Completed"
      : match.status === "ONGOING"
        ? "Ongoing"
        : "Disputed";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: gradient,
          color: "white",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "rgba(255,255,255,0.22)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                fontWeight: 800,
              }}
            >
              J
            </div>
            <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1 }}>
              JIotableTennis
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              fontSize: 22,
              opacity: 0.85,
            }}
          >
            <span>{match.type}</span>
            <span>·</span>
            <span>{statusLabel}</span>
            {match.isFriendly && (
              <>
                <span>·</span>
                <span>Friendly</span>
              </>
            )}
            <span>·</span>
            <span>{dateStr}</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            gap: 20,
          }}
        >
          <TeamRow name={teamAName || "Team A"} score={teamASetsWon} won={teamAWon} />
          <TeamRow name={teamBName || "Team B"} score={teamBSetsWon} won={teamBWon} />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 22,
            opacity: 0.8,
          }}
        >
          <span>Best of {match.totalSets} · {match.pointsPerSet} points</span>
          <span>Tap to view</span>
        </div>
      </div>
    ),
    size
  );
}

function TeamRow({
  name,
  score,
  won,
}: {
  name: string;
  score: number;
  won: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "24px 36px",
        background: won ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)",
        borderRadius: 24,
        border: won ? "3px solid rgba(255,255,255,0.75)" : "1px solid rgba(255,255,255,0.18)",
      }}
    >
      <span
        style={{
          fontSize: 64,
          fontWeight: 800,
          letterSpacing: -1,
          maxWidth: 850,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </span>
      <span
        style={{
          fontSize: 112,
          fontWeight: 900,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {score}
      </span>
    </div>
  );
}
