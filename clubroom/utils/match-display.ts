import type { Match, MatchPlayer } from '@/constants/types';
import { safeDisplayLabel } from '@/utils/booking-display';

export function getMatchClubLabel(match: Match): string {
  return safeDisplayLabel(match.clubId, 'Club');
}

export function getMatchSquadLabel(match: Match): string | undefined {
  return match.squadId ? safeDisplayLabel(match.squadId, 'Squad') : undefined;
}

export function getMatchPlayerAthleteName(player: MatchPlayer): string {
  return safeDisplayLabel(player.athleteId, 'Athlete');
}
