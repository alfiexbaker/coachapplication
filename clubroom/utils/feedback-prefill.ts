import type { FourCornerKey, FourCornerRatings, QuickRateInput } from '@/types/progress-types';

export interface FeedbackPrefillData {
  performanceRating: number;
  effortRating: number;
  skillsWorkedOn: string[];
  sessionSummary: string;
}

interface FeedbackPrefillOptions {
  previousCorners?: FourCornerRatings | null;
  attendeeCount?: number;
  defaultDotValue?: number;
}

function formatList(values: string[]): string {
  if (values.length === 0) return '';
  if (values.length === 1) return values[0];
  return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`;
}

export function buildFeedbackPrefillFromQuickRate(
  quickRate: QuickRateInput,
  options: FeedbackPrefillOptions = {},
): FeedbackPrefillData {
  const attendeeCount = options.attendeeCount ?? 1;
  const defaultDotValue = options.defaultDotValue ?? 3;
  const corners: FourCornerRatings = {
    technical: quickRate.technical ?? defaultDotValue,
    physical: quickRate.physical ?? defaultDotValue,
    psychological: quickRate.psychological ?? defaultDotValue,
    social: quickRate.social ?? defaultDotValue,
  };

  const cornerLabels: Record<FourCornerKey, string> = {
    technical: 'Technical',
    physical: 'Physical',
    psychological: 'Psychological',
    social: 'Social',
  };

  const changedCorners = (Object.keys(corners) as FourCornerKey[]).filter((corner) => {
    if (options.previousCorners) {
      return corners[corner] !== options.previousCorners[corner];
    }
    return corners[corner] !== defaultDotValue;
  });

  const summary =
    changedCorners.length > 0
      ? `Session focused on ${formatList(changedCorners.map((corner) => cornerLabels[corner]))}. ${attendeeCount} ${attendeeCount === 1 ? 'athlete' : 'athletes'} attended.`
      : `Session completed. ${attendeeCount} ${attendeeCount === 1 ? 'athlete' : 'athletes'} attended.`;

  return {
    performanceRating: Math.max(1, Math.min(5, Math.round(quickRate.effort))),
    effortRating: Math.max(1, Math.min(5, Math.round(quickRate.effort))),
    skillsWorkedOn: changedCorners.map((corner) => cornerLabels[corner]),
    sessionSummary: summary,
  };
}
