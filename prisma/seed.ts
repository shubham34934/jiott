import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const players = [
  { name: "Alex Chen", email: "alex@company.com", rating: 1850, played: 45, won: 32 },
  { name: "Sarah Kim", email: "sarah@company.com", rating: 1820, played: 42, won: 29 },
  { name: "Marcus Lee", email: "marcus@company.com", rating: 1790, played: 38, won: 25 },
  { name: "Emma Wilson", email: "emma@company.com", rating: 1760, played: 40, won: 24 },
  { name: "James Park", email: "james@company.com", rating: 1730, played: 35, won: 20 },
  { name: "Lisa Wong", email: "lisa@company.com", rating: 1700, played: 33, won: 18 },
  { name: "David Zhang", email: "david@company.com", rating: 1670, played: 30, won: 15 },
  { name: "Rachel Kim", email: "rachel@company.com", rating: 1640, played: 28, won: 13 },
];

async function main() {
  console.log("Seeding database...");

  for (const p of players) {
    const existing = await prisma.user.findUnique({ where: { email: p.email } });

    let user;
    if (existing) {
      user = await prisma.user.update({
        where: { email: p.email },
        data: { name: p.name },
      });
    } else {
      user = await prisma.user.create({
        data: { name: p.name, email: p.email },
      });
    }

    const existingPlayer = await prisma.player.findUnique({
      where: { userId: user.id },
    });

    if (existingPlayer) {
      await prisma.player.update({
        where: { userId: user.id },
        data: {
          rating: p.rating,
          matchesPlayed: p.played,
          matchesWon: p.won,
        },
      });
    } else {
      await prisma.player.create({
        data: {
          userId: user.id,
          rating: p.rating,
          matchesPlayed: p.played,
          matchesWon: p.won,
        },
      });
    }
  }

  const allPlayers = await prisma.player.findMany({
    include: { user: true },
    orderBy: { rating: "desc" },
  });

  const alex = allPlayers.find((p) => p.user.name === "Alex Chen")!;
  const sarah = allPlayers.find((p) => p.user.name === "Sarah Kim")!;
  const marcus = allPlayers.find((p) => p.user.name === "Marcus Lee")!;
  const emma = allPlayers.find((p) => p.user.name === "Emma Wilson")!;
  const james = allPlayers.find((p) => p.user.name === "James Park")!;
  const lisa = allPlayers.find((p) => p.user.name === "Lisa Wong")!;
  const david = allPlayers.find((p) => p.user.name === "David Zhang")!;

  const match1 = await prisma.match.create({
    data: {
      type: "SINGLES",
      status: "COMPLETED",
      totalSets: 3,
      pointsPerSet: 11,
      createdBy: alex.userId,
      participants: {
        create: [
          { playerId: alex.id, team: "A" },
          { playerId: sarah.id, team: "B" },
        ],
      },
      sets: {
        create: [
          { setNumber: 1, teamAScore: 11, teamBScore: 8 },
          { setNumber: 2, teamAScore: 9, teamBScore: 11 },
          { setNumber: 3, teamAScore: 11, teamBScore: 6 },
        ],
      },
    },
  });

  await prisma.eventLog.create({
    data: {
      entityType: "Match",
      entityId: match1.id,
      action: "COMPLETED",
      newValue: { status: "COMPLETED", winningTeam: "A", teamAWins: 2, teamBWins: 1 },
      updatedBy: alex.userId,
      matchId: match1.id,
    },
  });

  await prisma.match.create({
    data: {
      type: "SINGLES",
      status: "ONGOING",
      totalSets: 3,
      pointsPerSet: 11,
      createdBy: marcus.userId,
      participants: {
        create: [
          { playerId: marcus.id, team: "A" },
          { playerId: emma.id, team: "B" },
        ],
      },
      sets: {
        create: [
          { setNumber: 1, teamAScore: 11, teamBScore: 9 },
          { setNumber: 2, teamAScore: 8, teamBScore: 11 },
          { setNumber: 3, teamAScore: 0, teamBScore: 0 },
        ],
      },
    },
  });

  await prisma.match.create({
    data: {
      type: "SINGLES",
      status: "COMPLETED",
      totalSets: 3,
      pointsPerSet: 11,
      createdBy: james.userId,
      createdAt: new Date("2026-03-26"),
      participants: {
        create: [
          { playerId: james.id, team: "A" },
          { playerId: lisa.id, team: "B" },
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

  await prisma.match.create({
    data: {
      type: "SINGLES",
      status: "COMPLETED",
      totalSets: 3,
      pointsPerSet: 11,
      createdBy: sarah.userId,
      createdAt: new Date("2026-03-25"),
      participants: {
        create: [
          { playerId: sarah.id, team: "A" },
          { playerId: david.id, team: "B" },
        ],
      },
      sets: {
        create: [
          { setNumber: 1, teamAScore: 11, teamBScore: 5 },
          { setNumber: 2, teamAScore: 11, teamBScore: 8 },
          { setNumber: 3, teamAScore: 0, teamBScore: 0 },
        ],
      },
    },
  });

  await prisma.match.create({
    data: {
      type: "SINGLES",
      status: "COMPLETED",
      totalSets: 3,
      pointsPerSet: 11,
      createdBy: alex.userId,
      createdAt: new Date("2026-03-24"),
      participants: {
        create: [
          { playerId: alex.id, team: "A" },
          { playerId: emma.id, team: "B" },
        ],
      },
      sets: {
        create: [
          { setNumber: 1, teamAScore: 11, teamBScore: 9 },
          { setNumber: 2, teamAScore: 9, teamBScore: 11 },
          { setNumber: 3, teamAScore: 11, teamBScore: 7 },
        ],
      },
    },
  });

  console.log("Seed completed!");
  console.log(`Created ${players.length} players and 5 matches`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
