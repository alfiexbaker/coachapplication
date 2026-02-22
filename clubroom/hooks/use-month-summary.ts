import { useMemo } from 'react';

import type { MonthSummary, SessionMedia } from '@/types/progress-types';
import type { AthleteProgress, SessionFeedback } from '@/services/progress-service';
import type { BadgeAward } from '@/constants/types';

interface UseMonthSummaryParams {
  progress: AthleteProgress | null;
  feedback: SessionFeedback[];
  badges: BadgeAward[];
  media: SessionMedia[];
}

function isCurrentMonth(dateString: string | undefined): boolean {
  if (!dateString) {
    return false;
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

export function useMonthSummary({
  progress,
  feedback,
  badges,
  media,
}: UseMonthSummaryParams): MonthSummary {
  return useMemo(() => {
    const sessionsAttended = progress?.sessionsThisMonth ?? 0;
    const feedbackCount = feedback.filter((entry) => isCurrentMonth(entry.createdAt)).length;
    const skillsImproved = (progress?.skills ?? []).filter((skill) => skill.trend === 'improving').length;
    const goalsCompleted = (progress?.completedGoals ?? []).filter((goal) =>
      isCurrentMonth(goal.updatedAt || goal.createdAt),
    ).length;
    const badgesEarned = badges.filter((badge) => isCurrentMonth(badge.awardedAt)).length;
    const monthMedia = media.filter((entry) => isCurrentMonth(entry.createdAt));
    const photosCount = monthMedia.reduce((sum, entry) => sum + entry.photos.length, 0);
    const videosCount = monthMedia.filter((entry) => Boolean(entry.video)).length;

    return {
      sessionsAttended,
      feedbackCount,
      skillsImproved,
      goalsCompleted,
      badgesEarned,
      photosCount,
      videosCount,
    };
  }, [badges, feedback, media, progress]);
}
