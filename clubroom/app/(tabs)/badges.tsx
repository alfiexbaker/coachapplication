/**
 * UserBadgesScreen — Athlete badge dashboard.
 *
 * Shows progression level, category breakdown, CTAs, shareable badges,
 * and full badge timeline. Uses useScreen() for data loading with
 * 4 mandatory state branches.
 */

import { useCallback, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { PageContainer } from '@/components/primitives/page-container';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { BadgeLevelCard } from '@/components/badges/badge-level-card';
import { BadgeCategoryCarousel } from '@/components/badges/badge-category-carousel';
import { BadgeCtaSection } from '@/components/badges/badge-cta-section';
import { BadgeShareSection } from '@/components/badges/badge-share-section';
import { BadgeTimelineSection } from '@/components/badges/badge-timeline-section';
import { Spacing } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { useAuth } from '@/hooks/use-auth';
import { badgeService } from '@/services/badge-service';
import { ServiceEvents } from '@/services/event-bus';
import { ok, err } from '@/types/result';
import { createLogger } from '@/utils/logger';
import type { BadgeAward, BadgeCategory } from '@/constants/types';
import type { ProgressionLevel } from '@/constants/progression';
import type { CategoryBreakdownItem } from '@/components/badges/badge-category-carousel';

const logger = createLogger('UserBadgesScreen');

function formatDate(date: Date | string): string {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown date';
  }
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface BadgeScreenData {
  awards: BadgeAward[];
  progression: {
    totalPoints: number;
    currentLevel: ProgressionLevel;
    nextLevel: ProgressionLevel | null;
    progressPercent: number;
    pointsToNext: number;
    totalBadges: number;
    categoryBreakdown: CategoryBreakdownItem[];
    topCategories: {
      category: BadgeCategory;
      label: string;
      badgeCount: number;
      totalPoints: number;
    }[];
  };
}

export default function UserBadgesScreen() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id ?? '';

  const [sharingId, setSharingId] = useState<string | null>(null);
  const [localAwards, setLocalAwards] = useState<BadgeAward[] | null>(null);

  const { data, status, error, retry } = useScreen<BadgeScreenData>({
    load: async () => {
      if (!userId) {
        return err({ code: 'UNAUTHORIZED' as const, message: 'Not signed in' });
      }
      try {
        const [awards, progression] = await Promise.all([
          badgeService.listAwardsForAthlete(userId),
          badgeService.getProgressionSummary(userId),
        ]);
        return ok({ awards, progression });
      } catch (e) {
        return err({
          code: 'UNKNOWN' as const,
          message: e instanceof Error ? e.message : 'Failed to load badges',
        });
      }
    },
    deps: [userId],
    events: [ServiceEvents.BADGE_EARNED],
    isEmpty: (d) => d.awards.length === 0 && d.progression.totalBadges === 0,
  });

  // Use local awards if user has shared (optimistic update), otherwise use fetched data.
  const awards = useMemo(() => localAwards ?? data?.awards ?? [], [localAwards, data?.awards]);
  const progression = data?.progression ?? null;

  const supporterFacingAwards = useMemo(
    () => awards.filter((a) => a.visibility !== 'coach_only'),
    [awards],
  );

  const shareable = useMemo(
    () => supporterFacingAwards.filter((a) => !a.shared),
    [supporterFacingAwards],
  );

  const sharedCount = useMemo(
    () => supporterFacingAwards.filter((a) => a.shared).length,
    [supporterFacingAwards],
  );

  const lastBadgeDate = useMemo(
    () => (awards.length > 0 ? formatDate(awards[0].awardedAt) : null),
    [awards],
  );

  const handleShare = useCallback(
    async (awardId: string) => {
      setSharingId(awardId);
      try {
        const updated = await badgeService.markShared(awardId);
        if (updated) {
          setLocalAwards((prev) => {
            const source = prev ?? awards;
            return source.map((a) => (a.id === awardId ? updated : a));
          });
          logger.info('badge_shared_by_athlete', { awardId });
        }
      } finally {
        setSharingId(null);
      }
    },
    [awards],
  );

  if (!currentUser) return null;

  // --- 4 State Branches ---

  if (status === 'loading') {
    return (
      <PageContainer header={<ScreenHeader title="Development" subtitle="Progress & recognition" />}>
        <LoadingState variant="card" />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer header={<ScreenHeader title="Development" subtitle="Progress & recognition" />}>
        <ErrorState message={error?.message ?? 'Failed to load development data'} onRetry={retry} />
      </PageContainer>
    );
  }

  if (status === 'empty') {
    return (
      <PageContainer header={<ScreenHeader title="Development" subtitle="Progress & recognition" />}>
        <EmptyState
          icon="trending-up-outline"
          title="Your journey starts here"
          message="Complete sessions with your coach to start tracking your development."
        />
      </PageContainer>
    );
  }

  // --- Success State ---

  return (
    <PageContainer
      header={<ScreenHeader title="Development" subtitle="Progress & recognition" />}
      gap={Spacing.md}
    >
      {progression && (
        <BadgeLevelCard
          currentLevel={progression.currentLevel}
          nextLevel={progression.nextLevel}
          totalPoints={progression.totalPoints}
          progressPercent={progression.progressPercent}
          pointsToNext={progression.pointsToNext}
          totalBadges={progression.totalBadges}
          sharedCount={sharedCount}
          lastBadgeDate={lastBadgeDate}
        />
      )}

      {progression && <BadgeCategoryCarousel categories={progression.categoryBreakdown} />}

      <BadgeCtaSection />

      {supporterFacingAwards.length > 0 && shareable.length > 0 && (
        <BadgeShareSection shareable={shareable} sharingId={sharingId} onShare={handleShare} />
      )}

      <BadgeTimelineSection awards={awards} />
    </PageContainer>
  );
}
