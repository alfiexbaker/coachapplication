import type { SessionFeedback } from '@/services/progress-service';
import {
  inferCoachFocus,
  type CoachFocusNarrative,
} from '@/services/progress/progress-inference-service';

interface UseCoachFocusParams {
  feedback: SessionFeedback[];
}

/**
 * Returns coach focus narrative for CoachSaysCard.
 * Analyzes which corners the coach emphasizes across sessions.
 */
export function useCoachFocus({ feedback }: UseCoachFocusParams): CoachFocusNarrative | null {
  return inferCoachFocus(feedback);
}
