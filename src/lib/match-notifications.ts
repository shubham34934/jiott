import { after } from "next/server";
import { firstName, firstNamesJoined } from "@/lib/displayName";
import { sendPushToUser, sendPushToUsers } from "@/lib/push";

type ParticipantForNotify = {
  team: "A" | "B";
  player: { userId: string; user: { name: string | null } };
};

/** Push to the opposing team asking them to confirm a completion proposal. */
export function notifyCompletionProposed(
  match: { id: string; participants: Array<ParticipantForNotify> },
  proposerUserId: string,
  proposerName: string | null,
  winningTeam: "A" | "B",
  teamAWins: number,
  teamBWins: number
) {
  const proposerTeam = match.participants.find(
    (p) => p.player.userId === proposerUserId
  )?.team;
  if (!proposerTeam) return;

  const opponentUserIds = match.participants
    .filter((p) => p.team !== proposerTeam)
    .map((p) => p.player.userId)
    .filter((uid): uid is string => !!uid);
  if (opponentUserIds.length === 0) return;

  const proposerLabel = firstName(proposerName);
  const proposerWon = winningTeam === proposerTeam;
  const yourScore = proposerTeam === "A" ? teamAWins : teamBWins;
  const theirScore = proposerTeam === "A" ? teamBWins : teamAWins;
  const body = proposerWon
    ? `${proposerLabel} says they won ${yourScore}-${theirScore}. Confirm?`
    : `${proposerLabel} marked the match complete, ${yourScore}-${theirScore}. Confirm?`;

  after(() =>
    sendPushToUsers(opponentUserIds, {
      body,
      url: `/matches/${match.id}`,
      type: "completion_proposed",
    })
  );
}

/** Final result ping after confirmation — one per participant with their perspective. */
export function notifyMatchCompletedResult(
  match: { id: string; participants: Array<ParticipantForNotify> },
  winningTeam: "A" | "B",
  teamAWins: number,
  teamBWins: number,
  confirmerUserId: string
) {
  const winnerSets = winningTeam === "A" ? teamAWins : teamBWins;
  const loserSets = winningTeam === "A" ? teamBWins : teamAWins;
  const url = `/matches/${match.id}`;

  for (const p of match.participants) {
    const uid = p.player.userId;
    if (!uid || uid === confirmerUserId) continue;
    const won = p.team === winningTeam;
    const opponents = match.participants.filter((x) => x.team !== p.team);
    const opponentNames = firstNamesJoined(
      opponents.map((x) => x.player.user.name)
    );
    const body = won
      ? `You won ${winnerSets}-${loserSets} vs ${opponentNames}`
      : `You lost ${loserSets}-${winnerSets} vs ${opponentNames}`;
    after(() =>
      sendPushToUser(uid, { body, url, type: "completion_confirmed" })
    );
  }
}

/**
 * "Challenge accepted / declined" push.
 *  - Creator-as-player: notify only the creator's team.
 *  - Creator-not-playing: notify the creator (plus any other non-resolvers).
 */
export function notifyChallengeResolved(
  match: { id: string; createdBy: string; participants: Array<ParticipantForNotify> },
  resolverUserId: string,
  resolverName: string | null,
  kind: "accepted" | "declined"
) {
  const creatorTeam = match.participants.find(
    (p) => p.player.userId === match.createdBy
  )?.team;

  let recipientIds: string[];
  if (creatorTeam) {
    recipientIds = match.participants
      .filter((p) => p.team === creatorTeam)
      .map((p) => p.player.userId)
      .filter((uid): uid is string => !!uid && uid !== resolverUserId);
  } else {
    recipientIds = [match.createdBy].filter(
      (uid) => uid !== resolverUserId
    );
  }
  if (recipientIds.length === 0) return;

  const resolverLabel = firstName(resolverName);
  const body =
    kind === "accepted"
      ? `${resolverLabel} accepted your challenge`
      : `${resolverLabel} declined your challenge`;

  after(() =>
    sendPushToUsers(recipientIds, {
      body,
      url: `/matches/${match.id}`,
      type: kind === "accepted" ? "challenge_accepted" : "challenge_declined",
    })
  );
}

/** Re-open ping — a COMPLETED match was edited or the opponent rejected the completion proposal. */
export function notifyCompletionReopened(
  match: { id: string; participants: Array<ParticipantForNotify> },
  actorUserId: string,
  actorName: string | null
) {
  const actorTeam = match.participants.find(
    (p) => p.player.userId === actorUserId
  )?.team;
  if (!actorTeam) return;

  const otherSideUserIds = match.participants
    .filter((p) => p.team !== actorTeam)
    .map((p) => p.player.userId)
    .filter((uid): uid is string => !!uid);
  if (otherSideUserIds.length === 0) return;

  const label = firstName(actorName);
  after(() =>
    sendPushToUsers(otherSideUserIds, {
      body: `${label} re-opened the match — score changed`,
      url: `/matches/${match.id}`,
      type: "completion_reopened",
    })
  );
}
