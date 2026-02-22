import { useMemo } from 'react';

import type { SessionFeedback, SkillLevel } from '@/services/progress-service';
import type { BadgeAward } from '@/constants/types';
import {
  inferWeeklyRecap,
  type WeeklyRecap,
} from '@/services/progress/progress-inference-service';

interface UseWeeklyRecapParams {
  feedback: SessionFeedback[];
  badges: BadgeAward[];
  skills: SkillLevel[];
}

/**
 * Returns weekly recap for MomentHero.
 * Auto-generates: headline, highlights, corner improvements, next focus suggestion.
 */
export function useWeeklyRecap({ feedback, badges, skills }: UseWeeklyRecapParams): WeeklyRecap | null {
  return useMemo(
    () => inferWeeklyRecap(feedback, badges, skills),
    [badges, feedback, skills],
  );
}
