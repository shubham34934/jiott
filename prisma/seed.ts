/**
 * Development-only seed. Safe to remove later.
 *
 * All seeded users use emails `@jiott-seed.dev`. Re-run replaces only that data.
 *
 *   ALLOW_SEED=true npx prisma db seed
 *
 * Seed users have no password; register a real account or add passwords in Prisma for local testing.
 * Domain data (leaderboard, matches, tournaments) is for UI/dev testing.
 */

import "dotenv/config";
import { Prisma } from "@prisma/client";
/** Reuse Neon WebSocket adapter + pool settings from the app (plain `PrismaClient` often times out on pooled Neon URLs). */
import { prisma } from "../src/lib/prisma";

const SEED_DOMAIN = "jiott-seed.dev";

function email(local: string) {
  return `${local}@${SEED_DOMAIN}`;
}

async function cleanSeedData() {
  const seedUsers = await prisma.user.findMany({
    where: { email: { endsWith: `@${SEED_DOMAIN}` } },
    select: { id: true },
  });
  const userIds = seedUsers.map((u) => u.id);
  if (userIds.length === 0) return;

  await prisma.tournament.deleteMany({ where: { createdBy: { in: userIds } } });
  await prisma.match.deleteMany({ where: { createdBy: { in: userIds } } });
  await prisma.otpCode.deleteMany({
    where: { email: { endsWith: `@${SEED_DOMAIN}` } },
  });
  await prisma.player.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

async function main() {
  if (process.env.ALLOW_SEED !== "true") {
    console.error(
      "Refusing to seed: set ALLOW_SEED=true (e.g. ALLOW_SEED=true npx prisma db seed)"
    );
    process.exit(1);
  }

  console.log("Cleaning previous jiott-seed.dev data…");
  await cleanSeedData();

  const now = new Date();
  const verified = new Date("2026-01-01T00:00:00.000Z");

  const userDefs = [
    { local: "dana", name: "Dana Seed", rating: 1180, played: 24, won: 16 },
    { local: "eli", name: "Eli Seed", rating: 1120, played: 20, won: 12 },
    { local: "faye", name: "Faye Seed", rating: 1050, played: 18, won: 9 },
    { local: "gus", name: "Gus Seed", rating: 980, played: 15, won: 5 },
    { local: "hana", name: "Hana Seed", rating: 1040, played: 12, won: 7 },
    { local: "ivan", name: "Ivan Seed", rating: 1010, played: 10, won: 4 },
    { local: "jade", name: "Jade Seed", rating: 990, played: 8, won: 3 },
    { local: "kurt", name: "Kurt Seed", rating: 1000, played: 0, won: 0 },
  ] as const;

  const users: { id: string; playerId: string }[] = [];

  for (const def of userDefs) {
    const u = await prisma.user.create({
      data: {
        email: email(def.local),
        name: def.name,
        emailVerified: verified,
        image: null,
        password: null,
      },
    });
    const p = await prisma.player.create({
      data: {
        userId: u.id,
        rating: def.rating,
        matchesPlayed: def.played,
        matchesWon: def.won,
      },
    });
    users.push({ id: u.id, playerId: p.id });
  }

  const [dana, eli, faye, gus, hana, ivan, jade, kurt] = users;
  const P = (i: (typeof users)[number]) => i.playerId;

  const creatorId = dana.id;

  async function logMatch(
    matchId: string,
    action: string,
    newValue: Prisma.InputJsonValue | typeof Prisma.JsonNull | null,
    by: string
  ) {
    await prisma.eventLog.create({
      data: {
        entityType: "Match",
        entityId: matchId,
        action,
        newValue: newValue === null ? Prisma.JsonNull : newValue,
        updatedBy: by,
        matchId,
      },
    });
  }

  // --- Standalone matches (not in a tournament) ---
  const m1 = await prisma.match.create({
    data: {
      type: "SINGLES",
      status: "ONGOING",
      totalSets: 3,
      pointsPerSet: 11,
      isFriendly: false,
      createdBy: creatorId,
      participants: {
        create: [
          { playerId: P(dana), team: "A" },
          { playerId: P(eli), team: "B" },
        ],
      },
      sets: {
        create: [
          { setNumber: 1, teamAScore: 11, teamBScore: 9 },
          { setNumber: 2, teamAScore: 0, teamBScore: 0 },
          { setNumber: 3, teamAScore: 0, teamBScore: 0 },
        ],
      },
    },
  });
  await logMatch(m1.id, "CREATED", { note: "seed singles ongoing" }, creatorId);
  await logMatch(m1.id, "SCORE_UPDATED", { setNumber: 1, teamAScore: 11, teamBScore: 9 }, creatorId);

  const m2 = await prisma.match.create({
    data: {
      type: "SINGLES",
      status: "COMPLETED",
      totalSets: 3,
      pointsPerSet: 11,
      isFriendly: false,
      createdBy: creatorId,
      participants: {
        create: [
          { playerId: P(faye), team: "A" },
          { playerId: P(gus), team: "B" },
        ],
      },
      sets: {
        create: [
          { setNumber: 1, teamAScore: 8, teamBScore: 11 },
          { setNumber: 2, teamAScore: 11, teamBScore: 7 },
          { setNumber: 3, teamAScore: 11, teamBScore: 9 },
        ],
      },
    },
  });
  await logMatch(m2.id, "COMPLETED", null, creatorId);

  const m3 = await prisma.match.create({
    data: {
      type: "SINGLES",
      status: "COMPLETED",
      totalSets: 3,
      pointsPerSet: 11,
      isFriendly: true,
      createdBy: creatorId,
      participants: {
        create: [
          { playerId: P(hana), team: "A" },
          { playerId: P(ivan), team: "B" },
        ],
      },
      sets: {
        create: [
          { setNumber: 1, teamAScore: 11, teamBScore: 5 },
          { setNumber: 2, teamAScore: 11, teamBScore: 6 },
          { setNumber: 3, teamAScore: 0, teamBScore: 0 },
        ],
      },
    },
  });
  await logMatch(m3.id, "COMPLETED", null, creatorId);

  const m4 = await prisma.match.create({
    data: {
      type: "DOUBLES",
      status: "COMPLETED",
      totalSets: 3,
      pointsPerSet: 11,
      isFriendly: false,
      createdBy: creatorId,
      participants: {
        create: [
          { playerId: P(dana), team: "A" },
          { playerId: P(eli), team: "A" },
          { playerId: P(faye), team: "B" },
          { playerId: P(gus), team: "B" },
        ],
      },
      sets: {
        create: [
          { setNumber: 1, teamAScore: 11, teamBScore: 8 },
          { setNumber: 2, teamAScore: 9, teamBScore: 11 },
          { setNumber: 3, teamAScore: 12, teamBScore: 10 },
        ],
      },
    },
  });
  await logMatch(m4.id, "COMPLETED", null, creatorId);

  const m5 = await prisma.match.create({
    data: {
      type: "SINGLES",
      status: "DISPUTED",
      totalSets: 3,
      pointsPerSet: 11,
      isFriendly: false,
      createdBy: creatorId,
      participants: {
        create: [
          { playerId: P(jade), team: "A" },
          { playerId: P(kurt), team: "B" },
        ],
      },
      sets: {
        create: [
          { setNumber: 1, teamAScore: 11, teamBScore: 10 },
          { setNumber: 2, teamAScore: 10, teamBScore: 11 },
          { setNumber: 3, teamAScore: 11, teamBScore: 10 },
        ],
      },
    },
  });
  await logMatch(m5.id, "SCORE_UPDATED", { setNumber: 3, teamAScore: 11, teamBScore: 10 }, creatorId);

  // --- Tournament: draft (teams only, no bracket) ---
  const tDraft = await prisma.tournament.create({
    data: {
      name: "[Seed] Office Cup — draft",
      type: "SINGLE_ELIMINATION",
      matchType: "SINGLES",
      status: "CREATED",
      createdBy: creatorId,
    },
  });
  await prisma.team.createMany({
    data: [
      { tournamentId: tDraft.id, player1Id: P(dana), name: "Dana" },
      { tournamentId: tDraft.id, player1Id: P(eli), name: "Eli" },
      { tournamentId: tDraft.id, player1Id: P(faye), name: "Faye" },
    ],
  });

  // --- Tournament: round robin in progress (all READY + one linked live match) ---
  const tRR = await prisma.tournament.create({
    data: {
      name: "[Seed] Round Robin — live",
      type: "ROUND_ROBIN",
      matchType: "SINGLES",
      status: "IN_PROGRESS",
      createdBy: creatorId,
    },
  });
  const rrTeams = await prisma.$transaction([
    prisma.team.create({
      data: { tournamentId: tRR.id, player1Id: P(hana), name: "Hana" },
    }),
    prisma.team.create({
      data: { tournamentId: tRR.id, player1Id: P(ivan), name: "Ivan" },
    }),
    prisma.team.create({
      data: { tournamentId: tRR.id, player1Id: P(jade), name: "Jade" },
    }),
  ]);
  const [rrT0, rrT1, rrT2] = rrTeams;
  const rrTm0 = await prisma.tournamentMatch.create({
    data: {
      tournamentId: tRR.id,
      round: 1,
      position: 0,
      teamAId: rrT0.id,
      teamBId: rrT1.id,
      status: "READY",
    },
  });
  await prisma.tournamentMatch.create({
    data: {
      tournamentId: tRR.id,
      round: 1,
      position: 1,
      teamAId: rrT0.id,
      teamBId: rrT2.id,
      status: "READY",
    },
  });
  await prisma.tournamentMatch.create({
    data: {
      tournamentId: tRR.id,
      round: 1,
      position: 2,
      teamAId: rrT1.id,
      teamBId: rrT2.id,
      status: "READY",
    },
  });
  const mRR = await prisma.match.create({
    data: {
      type: "SINGLES",
      status: "ONGOING",
      totalSets: 3,
      pointsPerSet: 11,
      isFriendly: false,
      createdBy: creatorId,
      participants: {
        create: [
          { playerId: P(hana), team: "A" },
          { playerId: P(ivan), team: "B" },
        ],
      },
      sets: {
        create: [
          { setNumber: 1, teamAScore: 5, teamBScore: 7 },
          { setNumber: 2, teamAScore: 0, teamBScore: 0 },
          { setNumber: 3, teamAScore: 0, teamBScore: 0 },
        ],
      },
    },
  });
  await prisma.tournamentMatch.update({
    where: { id: rrTm0.id },
    data: { matchId: mRR.id, status: "ONGOING" },
  });

  // --- Tournament: completed single elim (4 teams) ---
  const tDone = await prisma.tournament.create({
    data: {
      name: "[Seed] Winter Classic — finished",
      type: "SINGLE_ELIMINATION",
      matchType: "SINGLES",
      status: "COMPLETED",
      createdBy: creatorId,
    },
  });
  const doneTeams = await prisma.$transaction([
    prisma.team.create({
      data: { tournamentId: tDone.id, player1Id: P(dana), name: "Dana" },
    }),
    prisma.team.create({
      data: { tournamentId: tDone.id, player1Id: P(eli), name: "Eli" },
    }),
    prisma.team.create({
      data: { tournamentId: tDone.id, player1Id: P(faye), name: "Faye" },
    }),
    prisma.team.create({
      data: { tournamentId: tDone.id, player1Id: P(gus), name: "Gus" },
    }),
  ]);
  const teamIds = doneTeams.map((t) => t.id);
  const [t0, t1, t2, t3] = teamIds;

  const semi0 = await prisma.tournamentMatch.create({
    data: {
      tournamentId: tDone.id,
      round: 1,
      position: 0,
      teamAId: t0,
      teamBId: t1,
      status: "READY",
    },
  });
  const semi1 = await prisma.tournamentMatch.create({
    data: {
      tournamentId: tDone.id,
      round: 1,
      position: 1,
      teamAId: t2,
      teamBId: t3,
      status: "READY",
    },
  });
  const finalTm = await prisma.tournamentMatch.create({
    data: {
      tournamentId: tDone.id,
      round: 2,
      position: 0,
      teamAId: null,
      teamBId: null,
      status: "LOCKED",
    },
  });
  await prisma.matchDependency.createMany({
    data: [
      { matchId: finalTm.id, dependsOnMatchId: semi0.id, slot: "A" },
      { matchId: finalTm.id, dependsOnMatchId: semi1.id, slot: "B" },
    ],
  });

  const mSemi0 = await prisma.match.create({
    data: {
      type: "SINGLES",
      status: "COMPLETED",
      totalSets: 3,
      pointsPerSet: 11,
      isFriendly: false,
      createdBy: creatorId,
      participants: {
        create: [
          { playerId: P(dana), team: "A" },
          { playerId: P(eli), team: "B" },
        ],
      },
      sets: {
        create: [
          { setNumber: 1, teamAScore: 11, teamBScore: 7 },
          { setNumber: 2, teamAScore: 11, teamBScore: 9 },
          { setNumber: 3, teamAScore: 0, teamBScore: 0 },
        ],
      },
    },
  });
  const mSemi1 = await prisma.match.create({
    data: {
      type: "SINGLES",
      status: "COMPLETED",
      totalSets: 3,
      pointsPerSet: 11,
      isFriendly: false,
      createdBy: creatorId,
      participants: {
        create: [
          { playerId: P(faye), team: "A" },
          { playerId: P(gus), team: "B" },
        ],
      },
      sets: {
        create: [
          { setNumber: 1, teamAScore: 11, teamBScore: 5 },
          { setNumber: 2, teamAScore: 8, teamBScore: 11 },
          { setNumber: 3, teamAScore: 11, teamBScore: 6 },
        ],
      },
    },
  });
  const finalMatch = await prisma.match.create({
    data: {
      type: "SINGLES",
      status: "COMPLETED",
      totalSets: 3,
      pointsPerSet: 11,
      isFriendly: false,
      createdBy: creatorId,
      participants: {
        create: [
          { playerId: P(dana), team: "A" },
          { playerId: P(faye), team: "B" },
        ],
      },
      sets: {
        create: [
          { setNumber: 1, teamAScore: 11, teamBScore: 6 },
          { setNumber: 2, teamAScore: 11, teamBScore: 8 },
          { setNumber: 3, teamAScore: 0, teamBScore: 0 },
        ],
      },
    },
  });

  await prisma.tournamentMatch.update({
    where: { id: semi0.id },
    data: {
      status: "COMPLETED",
      winnerId: t0,
      matchId: mSemi0.id,
    },
  });
  await prisma.tournamentMatch.update({
    where: { id: semi1.id },
    data: {
      status: "COMPLETED",
      winnerId: t2,
      matchId: mSemi1.id,
    },
  });
  await prisma.tournamentMatch.update({
    where: { id: finalTm.id },
    data: {
      status: "COMPLETED",
      winnerId: t0,
      matchId: finalMatch.id,
    },
  });

  await prisma.tournament.update({
    where: { id: tDone.id },
    data: {
      winnerTeamId: t0,
      runnerUpTeamId: t2,
    },
  });

  // --- Doubles tournament (minimal: 2 doubles teams, one completed TM) ---
  const tDbl = await prisma.tournament.create({
    data: {
      name: "[Seed] Doubles mini",
      type: "SINGLE_ELIMINATION",
      matchType: "DOUBLES",
      status: "COMPLETED",
      createdBy: creatorId,
    },
  });
  const dtA = await prisma.team.create({
    data: {
      tournamentId: tDbl.id,
      player1Id: P(hana),
      player2Id: P(ivan),
      name: "Team North",
    },
  });
  const dtB = await prisma.team.create({
    data: {
      tournamentId: tDbl.id,
      player1Id: P(jade),
      player2Id: P(kurt),
      name: "Team South",
    },
  });
  const dblFinal = await prisma.match.create({
    data: {
      type: "DOUBLES",
      status: "COMPLETED",
      totalSets: 3,
      pointsPerSet: 11,
      isFriendly: false,
      createdBy: creatorId,
      participants: {
        create: [
          { playerId: P(hana), team: "A" },
          { playerId: P(ivan), team: "A" },
          { playerId: P(jade), team: "B" },
          { playerId: P(kurt), team: "B" },
        ],
      },
      sets: {
        create: [
          { setNumber: 1, teamAScore: 11, teamBScore: 4 },
          { setNumber: 2, teamAScore: 11, teamBScore: 7 },
          { setNumber: 3, teamAScore: 0, teamBScore: 0 },
        ],
      },
    },
  });
  await prisma.tournamentMatch.create({
    data: {
      tournamentId: tDbl.id,
      round: 1,
      position: 0,
      teamAId: dtA.id,
      teamBId: dtB.id,
      winnerId: dtA.id,
      matchId: dblFinal.id,
      status: "COMPLETED",
    },
  });
  await prisma.tournament.update({
    where: { id: tDbl.id },
    data: { winnerTeamId: dtA.id, runnerUpTeamId: dtB.id },
  });

  // --- Misc: OTP + verification token samples ---
  await prisma.otpCode.create({
    data: {
      email: email("otp-demo"),
      code: "000000",
      type: "VERIFY_EMAIL",
      expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
      used: false,
    },
  });
  await prisma.otpCode.create({
    data: {
      email: email("otp-expired"),
      code: "999999",
      type: "RESET_PASSWORD",
      expiresAt: new Date(now.getTime() - 60 * 60 * 1000),
      used: false,
    },
  });
  await prisma.verificationToken.create({
    data: {
      identifier: email("verify-token"),
      token: "seed-verification-token-do-not-use",
      expires: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    },
  });

  console.log("Seed complete.");
  console.log(`  Users/players: ${userDefs.length} (@${SEED_DOMAIN})`);
  console.log("  Matches: singles ongoing, completed, friendly, doubles, disputed + RR + finals");
  console.log("  Tournaments: draft, round-robin (in progress), completed elim, doubles mini");
  console.log("  Extras: sample OtpCode + VerificationToken rows");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
