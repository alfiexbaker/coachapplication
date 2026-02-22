import { useMemo } from 'react';

import type { SkillLevel } from '@/services/progress-service';
import {
  inferSkillTrajectories,
  type SkillTrajectory,
} from '@/services/progress/progress-inference-service';

interface UseSkillTrajectoriesParams {
  skills: SkillLevel[];
}

/**
 * Returns skill trajectories for corner detail panels.
 * For each skill with 3+ history entries: 8-week trend, predicted next level date.
 */
export function useSkillTrajectories({ skills }: UseSkillTrajectoriesParams): SkillTrajectory[] {
  return useMemo(() => inferSkillTrajectories(skills), [skills]);
}
