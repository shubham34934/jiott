type ParticipantWithUser = {
  team: "A" | "B";
  player: { userId: string };
};

/** Return the team the given user plays on in this match, or null if not a participant. */
export function teamOfUserInMatch(
  participants: ReadonlyArray<ParticipantWithUser>,
  userId: string
): "A" | "B" | null {
  const p = participants.find((x) => x.player.userId === userId);
  return p?.team ?? null;
}

/** True when actor is a participant on the team opposing the target user. */
export function isActorOnOpposingTeam(
  participants: ReadonlyArray<ParticipantWithUser>,
  actorUserId: string,
  targetUserId: string
): boolean {
  const actorTeam = teamOfUserInMatch(participants, actorUserId);
  const targetTeam = teamOfUserInMatch(participants, targetUserId);
  return !!actorTeam && !!targetTeam && actorTeam !== targetTeam;
}

/**
 * Challenge-acceptance rule:
 *  - If the creator is one of the participants, only the *opposing* team can
 *    accept/decline.
 *  - If the creator is a non-player (e.g. organiser setting up a friendly),
 *    any participant can accept/decline.
 */
export function canResolveChallenge(
  participants: ReadonlyArray<ParticipantWithUser>,
  actorUserId: string,
  creatorUserId: string
): boolean {
  const creatorTeam = teamOfUserInMatch(participants, creatorUserId);
  const actorTeam = teamOfUserInMatch(participants, actorUserId);
  if (!actorTeam) return false; // actor must be a participant
  if (!creatorTeam) return true; // creator isn't playing → any participant may resolve
  return actorTeam !== creatorTeam; // otherwise only opposite side
}
