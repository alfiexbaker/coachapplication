import { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { MOCK_SESSIONS } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AthleteSessionDetailScreen');

const RATING_LABELS = ['Keep Practicing', 'Needs Work', 'Average', 'Good', 'Excellent'] as const;

export function useAthleteSessionDetail() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const session = useMemo(() => MOCK_SESSIONS.find(s => s.id === sessionId), [sessionId]);

  const hasNotes = !!(session?.notes && session.notes.trim() !== '');
  const hasVideos = !!(session?.videoUrls && session.videoUrls.length > 0);
  const hasSkills = !!(session?.skillsWorkedOn && session.skillsWorkedOn.length > 0);
  const hasNextFocus = !!(session?.nextFocusAreas && session.nextFocusAreas.length > 0);

  const ratingLabel = session ? RATING_LABELS[session.performanceRating - 1] ?? 'Keep Practicing' : '';

  if (session) {
    logger.debug('Athlete session detail rendered', { sessionId, hasNotes, hasVideos, hasSkills });
  }

  return { session, hasNotes, hasVideos, hasSkills, hasNextFocus, ratingLabel };
}
