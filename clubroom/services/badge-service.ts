import { badgeAwards as mockBadgeAwards, badgeCatalog } from '@/constants/mock-data';
import { BadgeAward, BadgeDefinition, BadgeVisibility, BadgeCategory } from '@/constants/types';
import { storageService } from './storage-service';
import { socialFeedService } from './social-feed-service';
import { createLogger } from '@/utils/logger';
import {
  ProgressionLevel,
  getProgressToNextLevel,
  getCategoryMilestoneStatus,
  CategoryInfo,
  TierNames,
} from '@/constants/progression';

const STORAGE_KEY = 'clubroom.badge_awards';

type AwardBadgeInput = {
  badgeId: string;
  athleteId: string;
  athleteName?: string;
  coachId: string;
  coachName?: string;
  sessionId?: string;
  reason: string;
  note?: string;
  visibility?: BadgeVisibility;
  presetId?: string;
  overrideCooldown?: boolean;
  overrideNote?: string;
  context?: 'session' | 'athlete_profile';
};

class BadgeService {
  private logger = createLogger('BadgeService');

  private async getStoredAwards(): Promise<BadgeAward[]> {
    return storageService.getItem<BadgeAward[]>(STORAGE_KEY, []);
  }

  private mergeAwards(stored: BadgeAward[]): BadgeAward[] {
    const merged = new Map<string, BadgeAward>();
    mockBadgeAwards.forEach((award) => {
      merged.set(award.id, award);
    });
    stored.forEach((award) => {
      merged.set(award.id, award);
    });

    return Array.from(merged.values()).sort(
      (a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime(),
    );
  }

  async listDefinitions(): Promise<BadgeDefinition[]> {
    return badgeCatalog;
  }

  async listAwards(): Promise<BadgeAward[]> {
    const stored = await this.getStoredAwards();
    return this.mergeAwards(stored);
  }

  async listAwardsForAthlete(athleteId: string): Promise<BadgeAward[]> {
    const awards = await this.listAwards();
    return awards.filter((award) => award.athleteId === athleteId);
  }

  async listAwardsForSession(sessionId: string): Promise<BadgeAward[]> {
    const awards = await this.listAwards();
    return awards.filter((award) => award.sessionId === sessionId);
  }

  async awardBadge(input: AwardBadgeInput): Promise<BadgeAward> {
    const stored = await this.getStoredAwards();
    const definition = badgeCatalog.find((badge) => badge.id === input.badgeId);
    const allAwards = this.mergeAwards(stored);
    const mostRecentAward = allAwards.find((award) => award.athleteId === input.athleteId);
    const cooldownWindowDays = 7;

    if (mostRecentAward) {
      const lastAwardDate = new Date(mostRecentAward.awardedAt).getTime();
      const now = Date.now();
      const diffDays = (now - lastAwardDate) / (1000 * 60 * 60 * 24);

      if (diffDays < cooldownWindowDays && !input.overrideCooldown) {
        throw new Error(
          `Cooldown in effect. Last badge was ${Math.ceil(diffDays)} day(s) ago. Toggle exception with a note to proceed.`,
        );
      }

      if (diffDays < cooldownWindowDays && input.overrideCooldown && !input.overrideNote?.trim()) {
        throw new Error('Exception note is required to bypass the cooldown.');
      }
    }

    const award: BadgeAward = {
      id: `award_${Date.now()}`,
      badgeId: input.badgeId,
      badgeLabel: definition?.label || input.reason,
      badgeTone: definition?.tone,
      athleteId: input.athleteId,
      athleteName: input.athleteName,
      coachId: input.coachId,
      coachName: input.coachName,
      sessionId: input.sessionId,
      reason: input.reason,
      note: input.note,
      presetId: input.presetId,
      cooldownBypassed: Boolean(input.overrideCooldown),
      cooldownWindowDays,
      context: input.context ?? (input.sessionId ? 'session' : 'athlete_profile'),
      overrideNote: input.overrideNote,
      awardedBy: input.coachId,
      awardedByName: input.coachName,
      awardedAt: new Date().toISOString(),
      visibility: input.visibility || 'athlete',
      // Copy progression fields from definition
      badgeCategory: definition?.category,
      badgeTier: definition?.tier,
      badgePointValue: definition?.pointValue,
    };

    const updated = [award, ...stored];
    await storageService.setItem(STORAGE_KEY, updated);
    this.logger.info('badge_awarded', {
      badgeId: input.badgeId,
      athleteId: input.athleteId,
      coachId: input.coachId,
      sessionId: input.sessionId,
      presetId: input.presetId,
      cooldownBypassed: Boolean(input.overrideCooldown),
      context: award.context,
      visibility: award.visibility,
    });

    return award;
  }

  async markShared(awardId: string): Promise<BadgeAward | undefined> {
    const stored = await this.getStoredAwards();
    const merged = this.mergeAwards(stored);
    const target = merged.find((award) => award.id === awardId);
    if (!target) return undefined;

    const alreadySentToFeed = Boolean(target.feedPostId);

    const shareContentParts = [
      `Earned the ${target.badgeLabel} badge`,
      target.reason,
      target.note,
      target.sessionId ? 'Linked to a recent session' : undefined,
    ].filter(Boolean);

    const feedPost = alreadySentToFeed
      ? undefined
      : socialFeedService.addPost({
          authorId: target.athleteId,
          authorName: target.athleteName || 'Athlete',
          authorAvatar: undefined,
          content: shareContentParts.join('\n'),
          context: 'badge_share',
          badgeAwardId: target.id,
          badgeId: target.badgeId,
          badgeLabel: target.badgeLabel,
          sessionId: target.sessionId,
        });

    const updatedAward = { ...target, shared: true, feedPostId: feedPost?.id ?? target.feedPostId };
    const nextStored = [updatedAward, ...stored.filter((award) => award.id !== awardId)];
    await storageService.setItem(STORAGE_KEY, nextStored);
    this.logger.info('badge_shared', {
      badgeId: target.badgeId,
      athleteId: target.athleteId,
      awardId,
    });
    return updatedAward;
  }

  // ===== Progression Methods =====

  /**
   * Calculate total points for an athlete based on their badge awards
   */
  async calculateTotalPoints(athleteId: string): Promise<number> {
    const awards = await this.listAwardsForAthlete(athleteId);
    return awards.reduce((total, award) => {
      // Use stored point value or look up from catalog
      if (award.badgePointValue) {
        return total + award.badgePointValue;
      }
      const definition = badgeCatalog.find((badge) => badge.id === award.badgeId);
      return total + (definition?.pointValue ?? 0);
    }, 0);
  }

  /**
   * Get the current progression level for an athlete
   */
  async getCurrentLevel(athleteId: string): Promise<ProgressionLevel> {
    const points = await this.calculateTotalPoints(athleteId);
    return getProgressToNextLevel(points).currentLevel;
  }

  /**
   * Get detailed progress to the next level for an athlete
   */
  async getProgressToNextLevel(athleteId: string): Promise<{
    currentLevel: ProgressionLevel;
    nextLevel: ProgressionLevel | null;
    progressPercent: number;
    pointsToNext: number;
    totalPoints: number;
  }> {
    const points = await this.calculateTotalPoints(athleteId);
    const progress = getProgressToNextLevel(points);
    return {
      ...progress,
      totalPoints: points,
    };
  }

  /**
   * Get category breakdown for an athlete showing badge counts and milestone progress
   */
  async getCategoryBreakdown(athleteId: string): Promise<
    Array<{
      category: BadgeCategory;
      label: string;
      icon: string;
      badgeCount: number;
      currentMilestone: string;
      nextMilestone: string | null;
      badgesToNext: number;
      progressPercent: number;
      totalPoints: number;
    }>
  > {
    const awards = await this.listAwardsForAthlete(athleteId);
    const categories: BadgeCategory[] = [
      'leadership',
      'consistency',
      'technique',
      'mindset',
      'teamwork',
      'resilience',
    ];

    return categories.map((category) => {
      const categoryAwards = awards.filter((award) => {
        // Check stored category or look up from catalog
        if (award.badgeCategory) {
          return award.badgeCategory === category;
        }
        const definition = badgeCatalog.find((badge) => badge.id === award.badgeId);
        return definition?.category === category;
      });

      const badgeCount = categoryAwards.length;
      const totalPoints = categoryAwards.reduce((sum, award) => {
        if (award.badgePointValue) {
          return sum + award.badgePointValue;
        }
        const definition = badgeCatalog.find((badge) => badge.id === award.badgeId);
        return sum + (definition?.pointValue ?? 0);
      }, 0);

      const milestoneStatus = getCategoryMilestoneStatus(badgeCount);
      const info = CategoryInfo[category];

      return {
        category,
        label: info.label,
        icon: info.icon,
        badgeCount,
        currentMilestone: milestoneStatus.currentMilestone,
        nextMilestone: milestoneStatus.nextMilestone,
        badgesToNext: milestoneStatus.badgesToNext,
        progressPercent: milestoneStatus.progressPercent,
        totalPoints,
      };
    });
  }

  /**
   * Get top categories for an athlete (sorted by badge count)
   */
  async getTopCategories(
    athleteId: string,
    limit = 3,
  ): Promise<Array<{ category: BadgeCategory; label: string; badgeCount: number; totalPoints: number }>> {
    const breakdown = await this.getCategoryBreakdown(athleteId);
    return breakdown
      .filter((cat) => cat.badgeCount > 0)
      .sort((a, b) => b.badgeCount - a.badgeCount || b.totalPoints - a.totalPoints)
      .slice(0, limit)
      .map(({ category, label, badgeCount, totalPoints }) => ({
        category,
        label,
        badgeCount,
        totalPoints,
      }));
  }

  /**
   * Get a complete progression summary for an athlete
   */
  async getProgressionSummary(athleteId: string): Promise<{
    totalPoints: number;
    currentLevel: ProgressionLevel;
    nextLevel: ProgressionLevel | null;
    progressPercent: number;
    pointsToNext: number;
    totalBadges: number;
    categoryBreakdown: Awaited<ReturnType<typeof this.getCategoryBreakdown>>;
    topCategories: Awaited<ReturnType<typeof this.getTopCategories>>;
  }> {
    const [progress, categoryBreakdown, topCategories, awards] = await Promise.all([
      this.getProgressToNextLevel(athleteId),
      this.getCategoryBreakdown(athleteId),
      this.getTopCategories(athleteId),
      this.listAwardsForAthlete(athleteId),
    ]);

    return {
      totalPoints: progress.totalPoints,
      currentLevel: progress.currentLevel,
      nextLevel: progress.nextLevel,
      progressPercent: progress.progressPercent,
      pointsToNext: progress.pointsToNext,
      totalBadges: awards.length,
      categoryBreakdown,
      topCategories,
    };
  }

  /**
   * Get tier display name
   */
  getTierName(tier: 1 | 2 | 3): string {
    return TierNames[tier];
  }

  /**
   * Get category info
   */
  getCategoryInfo(category: BadgeCategory): { label: string; icon: string } {
    return CategoryInfo[category];
  }
}

export const badgeService = new BadgeService();
