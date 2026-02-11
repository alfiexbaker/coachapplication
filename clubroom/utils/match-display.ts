import type { Match, MatchPlayer } from '@/constants/types';

export function getMatchClubLabel(match: Match): string {
  return match.clubId;
}

export function getMatchSquadLabel(match: Match): string | undefined {
  return match.squadId;
}

export function getMatchPlayerAthleteName(player: MatchPlayer): string {
  return player.athleteId || 'Athlete';
}
