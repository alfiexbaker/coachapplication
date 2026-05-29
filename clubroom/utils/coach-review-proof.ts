import type { PublicReview } from '@/services/coach-service';

export interface CoachReviewProofSummary {
  verifiedReviewCount: number;
  athleteCount: number;
  averageRating: number;
  recentSessionTypes: string[];
  strongestSignals: string[];
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function formatReviewContext(review: Pick<PublicReview, 'athleteName' | 'sessionType'>): string {
  const parts = [review.athleteName?.trim(), review.sessionType?.trim()].filter(
    (value): value is string => Boolean(value),
  );
  return parts.join(' · ');
}

export function buildCoachReviewProofSummary(reviews: PublicReview[]): CoachReviewProofSummary {
  const verified = reviews.filter((review) => review.isVerifiedBooking);
  const source = verified.length > 0 ? verified : reviews;
  const athleteCount = unique(source.flatMap((review) => (review.athleteId ? [review.athleteId] : [])))
    .length;
  const averageRating =
    source.length > 0
      ? Math.round((source.reduce((sum, review) => sum + review.rating, 0) / source.length) * 10) /
        10
      : 0;
  const recentSessionTypes = unique(
    source
      .map((review) => review.sessionType?.trim())
      .filter((value): value is string => Boolean(value)),
  ).slice(0, 3);

  const categoryCounts = new Map<string, number>();
  for (const review of source) {
    for (const [key, value] of Object.entries(review.categories ?? {})) {
      if (value >= 4) {
        categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
      }
    }
  }

  const strongestSignals = Array.from(categoryCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([key]) => key);

  return {
    verifiedReviewCount: verified.length,
    athleteCount,
    averageRating,
    recentSessionTypes,
    strongestSignals,
  };
}
