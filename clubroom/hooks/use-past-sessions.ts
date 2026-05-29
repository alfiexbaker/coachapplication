import type { BadgeAward } from '@/constants/types';
import type { SessionFeedback } from '@/services/progress-service';
import type { PastSession, SessionMedia } from '@/types/progress-types';

interface BuildPastSessionsInput {
  feedback: SessionFeedback[];
  media: SessionMedia[];
  badges: BadgeAward[];
  coachQualificationById?: Record<string, string | undefined>;
  limit?: number;
}

function sortByDateDesc(left: string | undefined, right: string | undefined): number {
  return new Date(right ?? '').getTime() - new Date(left ?? '').getTime();
}

function truncateSummary(summary: string | undefined, maxLength: number): string {
  if (!summary) {
    return '';
  }
  if (summary.length <= maxLength) {
    return summary;
  }
  return `${summary.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function firstByNewest<T>(items: T[], getDate: (item: T) => string | undefined): T | null {
  if (items.length === 0) {
    return null;
  }
  return Array.from(items).toSorted((left, right) => sortByDateDesc(getDate(left), getDate(right)))[0] ?? null;
}

export function buildPastSessions({
  feedback,
  media,
  badges,
  coachQualificationById,
  limit,
}: BuildPastSessionsInput): PastSession[] {
  const feedbackBySession = new Map<string, SessionFeedback>();
  for (const item of Array.from(feedback).toSorted((left, right) => sortByDateDesc(left.createdAt, right.createdAt))) {
    if (!feedbackBySession.has(item.sessionId)) {
      feedbackBySession.set(item.sessionId, item);
    }
  }

  const mediaBySession = new Map<string, SessionMedia>();
  for (const item of Array.from(media).toSorted((left, right) => sortByDateDesc(left.createdAt, right.createdAt))) {
    if (!mediaBySession.has(item.sessionId)) {
      mediaBySession.set(item.sessionId, item);
    }
  }

  const badgesBySession = new Map<string, BadgeAward[]>();
  for (const badge of badges) {
    if (!badge.sessionId) {
      continue;
    }
    const existing = badgesBySession.get(badge.sessionId) ?? [];
    existing.push(badge);
    badgesBySession.set(badge.sessionId, existing);
  }

  const sessionIds = Array.from(feedbackBySession.keys());
  const sessions: PastSession[] = sessionIds.map((sessionId) => {
    const latestFeedback = feedbackBySession.get(sessionId) ?? null;
    const latestMedia = mediaBySession.get(sessionId) ?? null;
    const latestBadge = firstByNewest(badgesBySession.get(sessionId) ?? [], (item) => item.awardedAt);

    const date =
      latestFeedback?.createdAt ??
      latestMedia?.createdAt ??
      latestBadge?.awardedAt ??
      new Date(0).toISOString();

    return {
      sessionId,
      feedbackId: latestFeedback?.id,
      date,
      coachName: latestFeedback?.coachName ?? 'Coach',
      coachQualification: latestFeedback?.coachId
        ? coachQualificationById?.[latestFeedback.coachId]
        : undefined,
      corners: latestFeedback?.fourCorners ?? null,
      effort: latestFeedback?.effortRating ?? 0,
      summary: truncateSummary(latestFeedback?.publicSummary, 120),
      performance: latestFeedback?.overallPerformance ?? latestFeedback?.effortRating ?? 0,
      photos: latestMedia?.photos ?? [],
      video: latestMedia?.video ?? null,
      badgeAwarded: latestBadge
        ? {
            label: latestBadge.badgeLabel,
            category: latestBadge.badgeCategory,
          }
        : undefined,
    };
  });

  const sorted = sessions.sort((left, right) => sortByDateDesc(left.date, right.date));
  if (typeof limit === 'number' && limit > 0) {
    return sorted.slice(0, limit);
  }
  return sorted;
}

export function usePastSessions({
  feedback,
  media,
  badges,
  coachQualificationById,
  limit,
}: BuildPastSessionsInput): PastSession[] {
  return buildPastSessions({
    feedback,
    media,
    badges,
    coachQualificationById,
    limit,
  });
}
