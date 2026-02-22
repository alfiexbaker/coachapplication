import { BadgeAward, BadgeDefinition, BadgeVisibility, BadgeCategory, type Booking } from '@/constants/types';
import { apiClient } from './api-client';
import { socialFeedService } from './social-feed-service';
import { notificationSenderService } from './notification/notification-sender';
import { bookingService } from './booking-service';
import { userService } from './user-service';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { type Result, type ServiceError, ok, err, validationError } from '@/types/result';
import {
  ProgressionLevel,
  getProgressToNextLevel,
  getCategoryMilestoneStatus,
  CategoryInfo,
  TierNames,
} from '@/constants/progression';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { SESSION_MILESTONE_BADGES, EVENT_BADGES } from './badge-definitions';
const ENABLE_PROGRESS_DEMO_SEED =
  process.env.EXPO_PUBLIC_ENABLE_PROGRESS_DEMO_SEED === 'true' ||
  process.env.EXPO_PUBLIC_ENABLE_PROGRESS_DEMO_SEED === '1' ||
  process.env.NODE_ENV === 'test';

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
  recipientId?: string; // Optional notification recipient
};

// Badge catalog — mapped to FA Four Corners (Technical, Physical, Psychological, Social)
const BASE_BADGE_CATALOG: BadgeDefinition[] = [
  {
    id: 'badge_best_training',
    label: 'Standout Session',
    tone: 'success',
    description: 'Recognised for outstanding effort and focus in training.',
    category: 'physical',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_streak_starter',
    label: 'Consistent Attender',
    tone: 'default',
    description: 'Demonstrated reliable attendance across sessions.',
    category: 'psychological',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_dedicated_athlete',
    label: 'Dedicated Athlete',
    tone: 'success',
    description: 'Maintained strong attendance and commitment.',
    category: 'psychological',
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'badge_master_passer',
    label: 'Vision & Passing',
    tone: 'default',
    description: 'Recognised for reliable build-up play and vision.',
    category: 'technical',
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'badge_sharp_shooter_pro',
    label: 'Clinical Finishing',
    tone: 'warning',
    description: 'Recognised for composure and accuracy under pressure.',
    category: 'technical',
    tier: 3,
    pointValue: 50,
  },
  {
    id: 'badge_first_touch',
    label: 'Ball Control',
    tone: 'default',
    description: 'Demonstrated excellent ball control in tight spaces.',
    category: 'technical',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_team_captain',
    label: 'Session Leader',
    tone: 'success',
    description: 'Led drills and encouraged teammates.',
    category: 'social',
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'badge_vocal_leader',
    label: 'Communication',
    tone: 'default',
    description: 'Communicated well and organised the group.',
    category: 'social',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_mentor',
    label: 'Mentoring',
    tone: 'success',
    description: 'Helped younger players improve their skills.',
    category: 'social',
    tier: 3,
    pointValue: 50,
  },
  {
    id: 'badge_growth_mindset',
    label: 'Growth Mindset',
    tone: 'default',
    description: 'Embraced challenges and learned from mistakes.',
    category: 'psychological',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_focused_athlete',
    label: 'Focus & Concentration',
    tone: 'success',
    description: 'Maintained concentration throughout the session.',
    category: 'psychological',
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'badge_team_player',
    label: 'Team Player',
    tone: 'default',
    description: 'Put the team first and supported others.',
    category: 'social',
    tier: 1,
    pointValue: 10,
  },
  // Generic recognition badges — one per FA Four Corners category
  {
    id: 'badge_recognition_technical',
    label: 'Technical Recognition',
    tone: 'default',
    description: 'Recognised for technical development.',
    category: 'technical',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_recognition_physical',
    label: 'Physical Recognition',
    tone: 'default',
    description: 'Recognised for physical development.',
    category: 'physical',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_recognition_psychological',
    label: 'Psychological Recognition',
    tone: 'default',
    description: 'Recognised for psychological development.',
    category: 'psychological',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_recognition_social',
    label: 'Social Recognition',
    tone: 'default',
    description: 'Recognised for social development.',
    category: 'social',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_assist_king',
    label: 'Creating Opportunities',
    tone: 'success',
    description: 'Created multiple opportunities for teammates.',
    category: 'technical',
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'badge_comeback_kid',
    label: 'Resilience',
    tone: 'warning',
    description: 'Bounced back from setbacks with determination.',
    category: 'psychological',
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'badge_never_give_up',
    label: 'Perseverance',
    tone: 'success',
    description: 'Showed incredible perseverance under pressure.',
    category: 'psychological',
    tier: 3,
    pointValue: 50,
  },
  // Challenge reward badges
  {
    id: 'badge_challenge_on_a_roll',
    label: 'On a Roll',
    tone: 'success',
    description: 'Completed a consistency streak challenge.',
    category: 'psychological',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_challenge_unstoppable',
    label: 'Unstoppable',
    tone: 'success',
    description: 'Completed a major streak milestone challenge.',
    category: 'psychological',
    tier: 2,
    pointValue: 25,
  },
  {
    id: 'badge_challenge_machine',
    label: 'Machine',
    tone: 'warning',
    description: 'Completed an elite streak challenge.',
    category: 'psychological',
    tier: 3,
    pointValue: 50,
  },
  {
    id: 'badge_challenge_levelling_up',
    label: 'Levelling Up',
    tone: 'default',
    description: 'Completed a skill development challenge.',
    category: 'technical',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_challenge_collector',
    label: 'Collector',
    tone: 'default',
    description: 'Completed a badge collection challenge.',
    category: 'social',
    tier: 1,
    pointValue: 10,
  },
  {
    id: 'badge_challenge_reflector',
    label: 'Reflector',
    tone: 'default',
    description: 'Completed a reflection challenge.',
    category: 'psychological',
    tier: 1,
    pointValue: 10,
  },
];

const SEED_BADGE_AWARDS: BadgeAward[] = [
  {
    id: 'award_training_focus',
    badgeId: 'badge_best_training',
    badgeLabel: 'Standout Session',
    badgeTone: 'success',
    athleteId: 'user1',
    coachId: 'coach1',
    sessionId: 'sess1',
    reason: 'Led transitions and stayed switched on across drills.',
    note: 'Kept energy up for younger players in the pod.',
    awardedBy: 'coach1',
    awardedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    visibility: 'supporters',
    badgeCategory: 'physical',
    badgeTier: 1,
    badgePointValue: 10,
  },
  {
    id: 'award_master_passer',
    badgeId: 'badge_master_passer',
    badgeLabel: 'Vision & Passing',
    badgeTone: 'default',
    athleteId: 'user2',
    coachId: 'coach3',
    sessionId: 'sess4',
    reason: 'Threaded creative passes under pressure.',
    note: 'Great first-time balls during rondos.',
    awardedBy: 'coach3',
    awardedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    visibility: 'athlete',
    badgeCategory: 'technical',
    badgeTier: 2,
    badgePointValue: 25,
  },
  {
    id: 'award_sharp_shooter',
    badgeId: 'badge_sharp_shooter_pro',
    badgeLabel: 'Clinical Finishing',
    badgeTone: 'warning',
    athleteId: 'user3',
    coachId: 'coach2',
    sessionId: 'club_session_1',
    reason: 'Finished five consecutive reps with both feet.',
    note: 'Stayed composed with a defender closing.',
    awardedBy: 'coach2',
    awardedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    visibility: 'supporters',
    badgeCategory: 'technical',
    badgeTier: 3,
    badgePointValue: 50,
  },
];

const ATHLETE_PARENT_MAP: Record<string, { id: string }> = {
  user1: { id: 'user4' },
  user2: { id: 'user4' },
  user3: { id: 'user5' },
};

async function resolveUserName(userId: string, fallback: string): Promise<string> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) {
    return fallback;
  }

  return userResult.data.name?.trim() || fallback;
}

class BadgeService {
  private logger = createLogger('BadgeService');
  private static readonly WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  private async getStoredAwards(): Promise<BadgeAward[]> {
    return apiClient.get<BadgeAward[]>(STORAGE_KEYS.BADGE_AWARDS, []);
  }

  private mergeAwards(stored: BadgeAward[]): BadgeAward[] {
    const merged = new Map<string, BadgeAward>();
    if (ENABLE_PROGRESS_DEMO_SEED) {
      SEED_BADGE_AWARDS.forEach((award) => {
        merged.set(award.id, award);
      });
    }
    stored.forEach((award) => {
      merged.set(award.id, award);
    });

    return Array.from(merged.values()).sort(
      (a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime(),
    );
  }

  async listDefinitions(): Promise<BadgeDefinition[]> {
    return BASE_BADGE_CATALOG;
  }

  findBadgeForCategory(category: BadgeCategory): BadgeDefinition | undefined {
    return BASE_BADGE_CATALOG.find((badge) => badge.category === category);
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

  async awardBadge(input: AwardBadgeInput): Promise<Result<BadgeAward, ServiceError>> {
    const stored = await this.getStoredAwards();
    const definition = BASE_BADGE_CATALOG.find((badge) => badge.id === input.badgeId);
    const allAwards = this.mergeAwards(stored);
    const mostRecentAward = allAwards.find((award) => award.athleteId === input.athleteId);
    const cooldownWindowDays = 7;

    if (mostRecentAward) {
      const lastAwardDate = new Date(mostRecentAward.awardedAt).getTime();
      const now = Date.now();
      const diffDays = (now - lastAwardDate) / (1000 * 60 * 60 * 24);

      if (diffDays < cooldownWindowDays && !input.overrideCooldown) {
        return err(
          validationError(
            `Cooldown in effect. Last badge was ${Math.ceil(diffDays)} day(s) ago. Toggle exception with a note to proceed.`,
          ),
        );
      }

      if (diffDays < cooldownWindowDays && input.overrideCooldown && !input.overrideNote?.trim()) {
        return err(validationError('Exception note is required to bypass the cooldown.'));
      }
    }

    const award: BadgeAward = {
      id: `award_${Date.now()}`,
      badgeId: input.badgeId,
      badgeLabel: definition?.label || input.reason,
      badgeTone: definition?.tone,
      athleteId: input.athleteId,
      coachId: input.coachId,
      sessionId: input.sessionId,
      reason: input.reason,
      note: input.note,
      presetId: input.presetId,
      cooldownBypassed: Boolean(input.overrideCooldown),
      cooldownWindowDays,
      context: input.context ?? (input.sessionId ? 'session' : 'athlete_profile'),
      overrideNote: input.overrideNote,
      awardedBy: input.coachId,
      awardedAt: new Date().toISOString(),
      visibility: input.visibility || 'athlete',
      seenByParent: false,
      // Copy progression fields from definition
      badgeCategory: definition?.category,
      badgeTier: definition?.tier,
      badgePointValue: definition?.pointValue,
    };

    const updated = [award, ...stored];
    await apiClient.set(STORAGE_KEYS.BADGE_AWARDS, updated);
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

    // Send notification to parent if visibility allows
    if (award.visibility !== 'coach_only') {
      await this.notifyParent(award);
    }

    // Auto-create achievement post in social feed for all clubs the athlete is in
    if (award.visibility !== 'coach_only') {
      await this.createAchievementPosts(award);
    }

    // Emit typed event for cross-service reactions
    emitTyped(ServiceEvents.BADGE_EARNED, {
      userId: input.athleteId,
      badgeId: input.badgeId,
      badgeLabel: award.badgeLabel,
      coachId: input.coachId,
      sessionId: input.sessionId,
    });

    return ok(award);
  }

  /**
   * Create achievement posts in social feed for all clubs the athlete is in
   */
  private async createAchievementPosts(award: BadgeAward): Promise<void> {
    const clubs = socialFeedService.getUserClubs(award.athleteId);
    if (clubs.length === 0) {
      this.logger.debug('no_clubs_for_achievement_post', { athleteId: award.athleteId });
      return;
    }

    const [athleteName, coachName] = await Promise.all([
      resolveUserName(award.athleteId, 'Athlete'),
      resolveUserName(award.coachId, 'Coach'),
    ]);

    for (const club of clubs) {
      try {
        socialFeedService.createAchievementPost({
          clubId: club.id,
          clubName: club.name,
          athleteId: award.athleteId,
          athleteName,
          badgeId: award.badgeId,
          badgeLabel: award.badgeLabel || 'Badge',
          badgeAwardId: award.id,
          coachId: award.coachId,
          coachName,
          reason: award.reason,
        });
        this.logger.info('achievement_post_created', {
          clubId: club.id,
          athleteId: award.athleteId,
          badgeAwardId: award.id,
        });
      } catch (error) {
        this.logger.error('achievement_post_failed', {
          clubId: club.id,
          athleteId: award.athleteId,
          error: String(error),
        });
      }
    }
  }

  /**
   * Send notification to parent when a badge is awarded
   */
  private async notifyParent(award: BadgeAward): Promise<void> {
    const parent = ATHLETE_PARENT_MAP[award.athleteId];
    if (!parent) {
      this.logger.debug('no_parent_for_notification', { athleteId: award.athleteId });
      return;
    }

    const [athleteName, coachName] = await Promise.all([
      resolveUserName(award.athleteId, 'Athlete'),
      resolveUserName(award.coachId, 'Coach'),
    ]);

    await notificationSenderService.notifyParentBadgeAwarded({
      parentId: parent.id,
      childName: athleteName,
      badgeName: award.badgeLabel || 'Badge',
      coachName,
      badgeAwardId: award.id,
    });

    this.logger.info('parent_notified_of_badge', {
      parentId: parent.id,
      badgeAwardId: award.id,
      athleteId: award.athleteId,
    });
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

    const athleteName = await resolveUserName(target.athleteId, 'Athlete');
    const feedPost = alreadySentToFeed
      ? undefined
      : socialFeedService.addPost({
          authorId: target.athleteId,
          authorName: athleteName,
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
    await apiClient.set(STORAGE_KEYS.BADGE_AWARDS, nextStored);
    this.logger.info('badge_shared', {
      badgeId: target.badgeId,
      athleteId: target.athleteId,
      awardId,
    });
    return updatedAward;
  }

  /**
   * Post a badge award to the user's club feeds
   * Called when user taps "Add to Feed" from notification
   */
  async postBadgeToFeed(awardId: string): Promise<void> {
    const stored = await this.getStoredAwards();
    const merged = this.mergeAwards(stored);
    const award = merged.find((a) => a.id === awardId);

    if (!award) {
      this.logger.warn('badge_not_found_for_feed_post', { awardId });
      return;
    }

    // If already posted, skip
    if (award.feedPostId) {
      this.logger.debug('badge_already_posted_to_feed', { awardId });
      return;
    }

    // Post to all clubs the athlete is in
    await this.createAchievementPosts(award);

    // Mark as shared/posted
    const updatedAward = { ...award, shared: true, addedToFeedAt: new Date().toISOString() };
    const nextStored = [updatedAward, ...stored.filter((a) => a.id !== awardId)];
    await apiClient.set(STORAGE_KEYS.BADGE_AWARDS, nextStored);

    this.logger.info('badge_posted_to_feed_by_user', {
      awardId,
      athleteId: award.athleteId,
      badgeLabel: award.badgeLabel,
    });
  }

  /**
   * Mark a badge as seen by parent
   */
  async markSeenByParent(awardId: string): Promise<BadgeAward | undefined> {
    const stored = await this.getStoredAwards();
    const merged = this.mergeAwards(stored);
    const target = merged.find((award) => award.id === awardId);
    if (!target) return undefined;

    const updatedAward = {
      ...target,
      seenByParent: true,
      seenAt: new Date().toISOString(),
    };
    const nextStored = [updatedAward, ...stored.filter((award) => award.id !== awardId)];
    await apiClient.set(STORAGE_KEYS.BADGE_AWARDS, nextStored);
    this.logger.info('badge_seen_by_parent', { awardId });
    return updatedAward;
  }

  /**
   * Mark all badges for an athlete as seen by parent
   */
  async markAllSeenByParent(athleteId: string): Promise<void> {
    const stored = await this.getStoredAwards();
    const merged = this.mergeAwards(stored);
    const now = new Date().toISOString();

    const updated = merged.map((award) =>
      award.athleteId === athleteId && !award.seenByParent
        ? { ...award, seenByParent: true, seenAt: now }
        : award,
    );

    await apiClient.set(STORAGE_KEYS.BADGE_AWARDS, updated);
    this.logger.info('all_badges_seen_by_parent', { athleteId });
  }

  /**
   * Get count of unseen badges for an athlete (for parent view)
   */
  async getUnseenBadgeCount(athleteId: string): Promise<number> {
    const awards = await this.listAwardsForAthlete(athleteId);
    return awards.filter((award) => award.visibility !== 'coach_only' && !award.seenByParent)
      .length;
  }

  /**
   * Get unseen badges for an athlete
   */
  async getUnseenBadges(athleteId: string): Promise<BadgeAward[]> {
    const awards = await this.listAwardsForAthlete(athleteId);
    return awards.filter((award) => award.visibility !== 'coach_only' && !award.seenByParent);
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
      const definition = BASE_BADGE_CATALOG.find((badge) => badge.id === award.badgeId);
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
    {
      category: BadgeCategory;
      label: string;
      icon: string;
      badgeCount: number;
      currentMilestone: string;
      nextMilestone: string | null;
      badgesToNext: number;
      progressPercent: number;
      totalPoints: number;
    }[]
  > {
    const awards = await this.listAwardsForAthlete(athleteId);
    const categories: BadgeCategory[] = [
      'technical',
      'physical',
      'psychological',
      'social',
    ];

    return categories.map((category) => {
      const categoryAwards = awards.filter((award) => {
        // Check stored category or look up from catalog
        if (award.badgeCategory) {
          return award.badgeCategory === category;
        }
        const definition = BASE_BADGE_CATALOG.find((badge) => badge.id === award.badgeId);
        return definition?.category === category;
      });

      const badgeCount = categoryAwards.length;
      const totalPoints = categoryAwards.reduce((sum, award) => {
        if (award.badgePointValue) {
          return sum + award.badgePointValue;
        }
        const definition = BASE_BADGE_CATALOG.find((badge) => badge.id === award.badgeId);
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
  ): Promise<
    { category: BadgeCategory; label: string; badgeCount: number; totalPoints: number }[]
  > {
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
    categoryBreakdown: {
      category: BadgeCategory;
      label: string;
      icon: string;
      badgeCount: number;
      currentMilestone: string;
      nextMilestone: string | null;
      badgesToNext: number;
      progressPercent: number;
      totalPoints: number;
    }[];
    topCategories: {
      category: BadgeCategory;
      label: string;
      badgeCount: number;
      totalPoints: number;
    }[];
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

  // ===== All Badges with Progress (for Badges/Achievements Screen) =====

  /**
   * Get all badge definitions with unlock status and progress for an athlete
   */
  async getAllBadgesWithProgress(athleteId: string): Promise<AllBadgeWithProgress[]> {
    const [definitions, awards] = await Promise.all([
      this.listDefinitions(),
      this.listAwardsForAthlete(athleteId),
    ]);

    const coachIds = Array.from(new Set(awards.map((award) => award.coachId)));
    const coachNameEntries = await Promise.all(
      coachIds.map(async (coachId) => [coachId, await resolveUserName(coachId, 'Coach')] as const),
    );
    const coachNameById = new Map<string, string>(coachNameEntries);

    // Create a map of awarded badges for quick lookup
    const awardedBadgeIds = new Set(awards.map((a) => a.badgeId));
    const awardsByBadgeId = new Map<string, BadgeAward>();
    awards.forEach((award) => {
      // Keep the most recent award for each badge
      if (!awardsByBadgeId.has(award.badgeId)) {
        awardsByBadgeId.set(award.badgeId, award);
      }
    });

    // Get session count for milestone badges
    const sessionCount = await this.getSessionCount(athleteId);

    // Combine catalog badges with milestone badges
    const allBadges: AllBadgeWithProgress[] = [];

    // Add catalog badges
    definitions.forEach((def) => {
      const isUnlocked = awardedBadgeIds.has(def.id);
      const award = awardsByBadgeId.get(def.id);

      allBadges.push({
        id: def.id,
        label: def.label,
        description: def.description,
        category: def.category,
        tier: def.tier,
        pointValue: def.pointValue ?? 0,
        tone: def.tone,
        badgeType: 'skill',
        isUnlocked,
        earnedAt: award?.awardedAt,
        awardedBy: award ? (coachNameById.get(award.coachId) ?? 'Coach') : undefined,
        progress: isUnlocked ? 100 : 0,
        progressLabel: isUnlocked ? 'Earned' : 'Locked',
      });
    });

    // Add session milestone badges
    SESSION_MILESTONE_BADGES.forEach((milestone) => {
      const isUnlocked = sessionCount >= milestone.threshold;
      const progress = Math.min(100, Math.round((sessionCount / milestone.threshold) * 100));

      allBadges.push({
        id: milestone.id,
        label: milestone.label,
        description: milestone.description,
        category: 'physical',
        tier: milestone.tier,
        pointValue: milestone.pointValue,
        badgeType: 'milestone',
        isUnlocked,
        earnedAt: isUnlocked ? new Date().toISOString() : undefined,
        progress,
        progressLabel: isUnlocked ? 'Earned' : `${sessionCount}/${milestone.threshold} sessions`,
        currentValue: sessionCount,
        targetValue: milestone.threshold,
      });
    });

    // Streak badges hidden from UI — kept for internal data tracking only.
    // Consensus: streaks are harmful for youth athletes whose attendance
    // is parent-dependent. May resurface as "rhythm" feature in v2.

    // Add special event badges
    // Check if athlete has earned any event badges from their awards
    const eventAwards = awards.filter((a) => EVENT_BADGES.some((e) => e.id === a.badgeId));
    const earnedEventIds = new Set(eventAwards.map((a) => a.badgeId));

    EVENT_BADGES.forEach((event) => {
      const isUnlocked = earnedEventIds.has(event.id);
      const award = eventAwards.find((a) => a.badgeId === event.id);

      allBadges.push({
        id: event.id,
        label: event.label,
        description: event.description,
        category: event.category,
        tier: event.tier,
        pointValue: event.pointValue,
        badgeType: 'event',
        isUnlocked,
        earnedAt: award?.awardedAt,
        progress: isUnlocked ? 100 : 0,
        progressLabel: isUnlocked ? 'Earned' : event.requirementLabel,
      });
    });

    return allBadges;
  }

  /**
   * Get badges grouped by category for display
   */
  async getBadgesByCategory(athleteId: string): Promise<Map<string, AllBadgeWithProgress[]>> {
    const badges = await this.getAllBadgesWithProgress(athleteId);
    const grouped = new Map<string, AllBadgeWithProgress[]>();

    // Add type-based groups
    grouped.set(
      'milestones',
      badges.filter((b) => b.badgeType === 'milestone'),
    );
    grouped.set(
      'streaks',
      badges.filter((b) => b.badgeType === 'streak'),
    );
    grouped.set(
      'events',
      badges.filter((b) => b.badgeType === 'event'),
    );

    // Add category-based groups for skill badges
    const skillBadges = badges.filter((b) => b.badgeType === 'skill');
    const categories: BadgeCategory[] = [
      'technical',
      'physical',
      'psychological',
      'social',
    ];

    categories.forEach((cat) => {
      const catBadges = skillBadges.filter((b) => b.category === cat);
      if (catBadges.length > 0) {
        grouped.set(cat, catBadges);
      }
    });

    return grouped;
  }

  /**
   * Get session count for an athlete from booking data
   */
  private async getSessionCount(athleteId: string): Promise<number> {
    try {
      const bookings = await bookingService.getBookingsForUser(athleteId, 'athlete');
      // Count completed sessions
      const completedCount = bookings.filter(
        (b) => b.status === 'COMPLETED' || b.status === 'AWAITING_COMPLETION',
      ).length;
      return completedCount;
    } catch (error) {
      this.logger.error('Failed to get session count', error);
      return 0;
    }
  }

  /**
   * Get mock weekly streak for an athlete
   */
  private async getWeeklyStreak(athleteId: string): Promise<number> {
    try {
      const bookings = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
      const completedBookings = bookings.filter(
        (booking) =>
          booking.status === 'COMPLETED' &&
          (booking.athleteId === athleteId || booking.athleteIds?.includes(athleteId)),
      );
      if (completedBookings.length === 0) {
        return 0;
      }

      const toWeekStart = (dateString: string): number | null => {
        const timestamp = new Date(dateString).getTime();
        if (Number.isNaN(timestamp)) {
          return null;
        }

        const date = new Date(timestamp);
        const day = date.getDay();
        const mondayOffset = day === 0 ? -6 : 1 - day;
        date.setDate(date.getDate() + mondayOffset);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      };

      const activeWeeks = new Set<number>();
      for (const booking of completedBookings) {
        const weekStart = toWeekStart(booking.scheduledAt);
        if (weekStart !== null) {
          activeWeeks.add(weekStart);
        }
      }

      if (activeWeeks.size === 0) {
        return 0;
      }

      const sortedWeeks = Array.from(activeWeeks).sort((left, right) => right - left);
      const nowWeekStart = toWeekStart(new Date().toISOString()) ?? 0;
      const latestWeek = sortedWeeks[0];
      if (latestWeek < nowWeekStart - BadgeService.WEEK_MS) {
        return 0;
      }

      let streak = 1;
      let cursor = latestWeek;
      for (let index = 1; index < sortedWeeks.length; index += 1) {
        const expectedPreviousWeek = cursor - BadgeService.WEEK_MS;
        if (sortedWeeks[index] !== expectedPreviousWeek) {
          break;
        }
        streak += 1;
        cursor = sortedWeeks[index];
      }

      return streak;
    } catch (error) {
      this.logger.error('Failed to calculate weekly streak from completed bookings', error);
      return 0;
    }
  }

  /**
   * Get streak info for display on home screen
   */
  async getStreakInfo(athleteId: string): Promise<{
    currentStreak: number;
    nextMilestone: number;
    daysToNextMilestone: number;
    streakLabel: string;
  }> {
    const currentStreak = await this.getWeeklyStreak(athleteId);

    // Find next milestone
    const milestones = [2, 4, 8, 12];
    const nextMilestone =
      milestones.find((m) => m > currentStreak) ?? milestones[milestones.length - 1];
    const daysToNextMilestone = Math.max(0, nextMilestone - currentStreak);

    // Generate motivational label
    let streakLabel = '';
    if (currentStreak >= 12) {
      streakLabel = 'Champion streak!';
    } else if (currentStreak >= 8) {
      streakLabel = 'Amazing commitment!';
    } else if (currentStreak >= 4) {
      streakLabel = 'Great momentum!';
    } else if (currentStreak >= 2) {
      streakLabel = 'Keep it going!';
    } else {
      streakLabel = 'Start your streak!';
    }

    return {
      currentStreak,
      nextMilestone,
      daysToNextMilestone,
      streakLabel,
    };
  }
}

// ===== Badge Type Definitions for All Badges Screen =====

export type BadgeType = 'skill' | 'milestone' | 'streak' | 'event';

export interface AllBadgeWithProgress {
  id: string;
  label: string;
  description?: string;
  category?: BadgeCategory;
  tier?: 1 | 2 | 3;
  pointValue: number;
  tone?: 'success' | 'warning' | 'default';
  badgeType: BadgeType;
  isUnlocked: boolean;
  earnedAt?: string;
  awardedBy?: string;
  progress: number; // 0-100
  progressLabel: string;
  currentValue?: number;
  targetValue?: number;
}

export const badgeService = new BadgeService();
