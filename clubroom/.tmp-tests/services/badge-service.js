"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.badgeService = void 0;
const mock_data_1 = require("@/constants/mock-data");
const storage_service_1 = require("./storage-service");
const social_feed_service_1 = require("./social-feed-service");
const notification_service_1 = require("./notification-service");
const logger_1 = require("@/utils/logger");
const progression_1 = require("@/constants/progression");
const STORAGE_KEY = 'clubroom.badge_awards';
class BadgeService {
    constructor() {
        this.logger = (0, logger_1.createLogger)('BadgeService');
    }
    async getStoredAwards() {
        return storage_service_1.storageService.getItem(STORAGE_KEY, []);
    }
    mergeAwards(stored) {
        const merged = new Map();
        mock_data_1.badgeAwards.forEach((award) => {
            merged.set(award.id, award);
        });
        stored.forEach((award) => {
            merged.set(award.id, award);
        });
        return Array.from(merged.values()).sort((a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime());
    }
    async listDefinitions() {
        return mock_data_1.badgeCatalog;
    }
    async listAwards() {
        const stored = await this.getStoredAwards();
        return this.mergeAwards(stored);
    }
    async listAwardsForAthlete(athleteId) {
        const awards = await this.listAwards();
        return awards.filter((award) => award.athleteId === athleteId);
    }
    async listAwardsForSession(sessionId) {
        const awards = await this.listAwards();
        return awards.filter((award) => award.sessionId === sessionId);
    }
    async awardBadge(input) {
        const stored = await this.getStoredAwards();
        const definition = mock_data_1.badgeCatalog.find((badge) => badge.id === input.badgeId);
        const allAwards = this.mergeAwards(stored);
        const mostRecentAward = allAwards.find((award) => award.athleteId === input.athleteId);
        const cooldownWindowDays = 7;
        if (mostRecentAward) {
            const lastAwardDate = new Date(mostRecentAward.awardedAt).getTime();
            const now = Date.now();
            const diffDays = (now - lastAwardDate) / (1000 * 60 * 60 * 24);
            if (diffDays < cooldownWindowDays && !input.overrideCooldown) {
                throw new Error(`Cooldown in effect. Last badge was ${Math.ceil(diffDays)} day(s) ago. Toggle exception with a note to proceed.`);
            }
            if (diffDays < cooldownWindowDays && input.overrideCooldown && !input.overrideNote?.trim()) {
                throw new Error('Exception note is required to bypass the cooldown.');
            }
        }
        const award = {
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
            seenByParent: false,
            // Copy progression fields from definition
            badgeCategory: definition?.category,
            badgeTier: definition?.tier,
            badgePointValue: definition?.pointValue,
        };
        const updated = [award, ...stored];
        await storage_service_1.storageService.setItem(STORAGE_KEY, updated);
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
        return award;
    }
    /**
     * Create achievement posts in social feed for all clubs the athlete is in
     */
    async createAchievementPosts(award) {
        const clubs = (0, mock_data_1.getUserClubs)(award.athleteId);
        if (clubs.length === 0) {
            this.logger.debug('no_clubs_for_achievement_post', { athleteId: award.athleteId });
            return;
        }
        for (const club of clubs) {
            try {
                social_feed_service_1.socialFeedService.createAchievementPost({
                    clubId: club.id,
                    clubName: club.name,
                    athleteId: award.athleteId,
                    athleteName: award.athleteName || 'Athlete',
                    badgeId: award.badgeId,
                    badgeLabel: award.badgeLabel || 'Badge',
                    badgeAwardId: award.id,
                    coachId: award.coachId,
                    coachName: award.coachName || 'Coach',
                    reason: award.reason,
                });
                this.logger.info('achievement_post_created', {
                    clubId: club.id,
                    athleteId: award.athleteId,
                    badgeAwardId: award.id,
                });
            }
            catch (error) {
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
    async notifyParent(award) {
        const parent = (0, mock_data_1.getParentForAthlete)(award.athleteId);
        if (!parent) {
            this.logger.debug('no_parent_for_notification', { athleteId: award.athleteId });
            return;
        }
        const notification = {
            id: `notif_badge_${award.id}`,
            type: 'badge',
            title: `${award.athleteName} earned a badge!`,
            body: `${award.athleteName} earned the ${award.badgeLabel} badge from Coach ${award.coachName}`,
            timeLabel: 'Just now',
            read: false,
            badgeTitle: award.badgeLabel,
            athleteName: award.athleteName,
            badgeAwardId: award.id,
            actionLabel: 'View Badge',
            handled: false,
        };
        await notification_service_1.notificationService.create(notification);
        this.logger.info('parent_notified_of_badge', {
            parentId: parent.id,
            badgeAwardId: award.id,
            athleteId: award.athleteId,
        });
    }
    async markShared(awardId) {
        const stored = await this.getStoredAwards();
        const merged = this.mergeAwards(stored);
        const target = merged.find((award) => award.id === awardId);
        if (!target)
            return undefined;
        const alreadySentToFeed = Boolean(target.feedPostId);
        const shareContentParts = [
            `Earned the ${target.badgeLabel} badge`,
            target.reason,
            target.note,
            target.sessionId ? 'Linked to a recent session' : undefined,
        ].filter(Boolean);
        const feedPost = alreadySentToFeed
            ? undefined
            : social_feed_service_1.socialFeedService.addPost({
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
        await storage_service_1.storageService.setItem(STORAGE_KEY, nextStored);
        this.logger.info('badge_shared', {
            badgeId: target.badgeId,
            athleteId: target.athleteId,
            awardId,
        });
        return updatedAward;
    }
    /**
     * Mark a badge as seen by parent
     */
    async markSeenByParent(awardId) {
        const stored = await this.getStoredAwards();
        const merged = this.mergeAwards(stored);
        const target = merged.find((award) => award.id === awardId);
        if (!target)
            return undefined;
        const updatedAward = {
            ...target,
            seenByParent: true,
            seenAt: new Date().toISOString(),
        };
        const nextStored = [updatedAward, ...stored.filter((award) => award.id !== awardId)];
        await storage_service_1.storageService.setItem(STORAGE_KEY, nextStored);
        this.logger.info('badge_seen_by_parent', { awardId });
        return updatedAward;
    }
    /**
     * Mark all badges for an athlete as seen by parent
     */
    async markAllSeenByParent(athleteId) {
        const stored = await this.getStoredAwards();
        const merged = this.mergeAwards(stored);
        const now = new Date().toISOString();
        const updated = merged.map((award) => award.athleteId === athleteId && !award.seenByParent
            ? { ...award, seenByParent: true, seenAt: now }
            : award);
        await storage_service_1.storageService.setItem(STORAGE_KEY, updated);
        this.logger.info('all_badges_seen_by_parent', { athleteId });
    }
    /**
     * Get count of unseen badges for an athlete (for parent view)
     */
    async getUnseenBadgeCount(athleteId) {
        const awards = await this.listAwardsForAthlete(athleteId);
        return awards.filter((award) => award.visibility !== 'coach_only' && !award.seenByParent).length;
    }
    /**
     * Get unseen badges for an athlete
     */
    async getUnseenBadges(athleteId) {
        const awards = await this.listAwardsForAthlete(athleteId);
        return awards.filter((award) => award.visibility !== 'coach_only' && !award.seenByParent);
    }
    // ===== Progression Methods =====
    /**
     * Calculate total points for an athlete based on their badge awards
     */
    async calculateTotalPoints(athleteId) {
        const awards = await this.listAwardsForAthlete(athleteId);
        return awards.reduce((total, award) => {
            // Use stored point value or look up from catalog
            if (award.badgePointValue) {
                return total + award.badgePointValue;
            }
            const definition = mock_data_1.badgeCatalog.find((badge) => badge.id === award.badgeId);
            return total + (definition?.pointValue ?? 0);
        }, 0);
    }
    /**
     * Get the current progression level for an athlete
     */
    async getCurrentLevel(athleteId) {
        const points = await this.calculateTotalPoints(athleteId);
        return (0, progression_1.getProgressToNextLevel)(points).currentLevel;
    }
    /**
     * Get detailed progress to the next level for an athlete
     */
    async getProgressToNextLevel(athleteId) {
        const points = await this.calculateTotalPoints(athleteId);
        const progress = (0, progression_1.getProgressToNextLevel)(points);
        return {
            ...progress,
            totalPoints: points,
        };
    }
    /**
     * Get category breakdown for an athlete showing badge counts and milestone progress
     */
    async getCategoryBreakdown(athleteId) {
        const awards = await this.listAwardsForAthlete(athleteId);
        const categories = [
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
                const definition = mock_data_1.badgeCatalog.find((badge) => badge.id === award.badgeId);
                return definition?.category === category;
            });
            const badgeCount = categoryAwards.length;
            const totalPoints = categoryAwards.reduce((sum, award) => {
                if (award.badgePointValue) {
                    return sum + award.badgePointValue;
                }
                const definition = mock_data_1.badgeCatalog.find((badge) => badge.id === award.badgeId);
                return sum + (definition?.pointValue ?? 0);
            }, 0);
            const milestoneStatus = (0, progression_1.getCategoryMilestoneStatus)(badgeCount);
            const info = progression_1.CategoryInfo[category];
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
    async getTopCategories(athleteId, limit = 3) {
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
    async getProgressionSummary(athleteId) {
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
    getTierName(tier) {
        return progression_1.TierNames[tier];
    }
    /**
     * Get category info
     */
    getCategoryInfo(category) {
        return progression_1.CategoryInfo[category];
    }
    // ===== All Badges with Progress (for Badges/Achievements Screen) =====
    /**
     * Get all badge definitions with unlock status and progress for an athlete
     */
    async getAllBadgesWithProgress(athleteId) {
        const [definitions, awards] = await Promise.all([
            this.listDefinitions(),
            this.listAwardsForAthlete(athleteId),
        ]);
        // Create a map of awarded badges for quick lookup
        const awardedBadgeIds = new Set(awards.map((a) => a.badgeId));
        const awardsByBadgeId = new Map();
        awards.forEach((award) => {
            // Keep the most recent award for each badge
            if (!awardsByBadgeId.has(award.badgeId)) {
                awardsByBadgeId.set(award.badgeId, award);
            }
        });
        // Get session count for milestone badges
        const sessionCount = await this.getSessionCount(athleteId);
        const weeklyStreak = await this.getWeeklyStreak(athleteId);
        // Combine catalog badges with milestone badges
        const allBadges = [];
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
                awardedBy: award?.coachName,
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
                category: 'consistency',
                tier: milestone.tier,
                pointValue: milestone.pointValue,
                badgeType: 'milestone',
                isUnlocked,
                earnedAt: isUnlocked ? new Date().toISOString() : undefined,
                progress,
                progressLabel: isUnlocked
                    ? 'Earned'
                    : `${sessionCount}/${milestone.threshold} sessions`,
                currentValue: sessionCount,
                targetValue: milestone.threshold,
            });
        });
        // Add weekly streak badges
        STREAK_BADGES.forEach((streak) => {
            const isUnlocked = weeklyStreak >= streak.threshold;
            const progress = Math.min(100, Math.round((weeklyStreak / streak.threshold) * 100));
            allBadges.push({
                id: streak.id,
                label: streak.label,
                description: streak.description,
                category: 'consistency',
                tier: streak.tier,
                pointValue: streak.pointValue,
                badgeType: 'streak',
                isUnlocked,
                earnedAt: isUnlocked ? new Date().toISOString() : undefined,
                progress,
                progressLabel: isUnlocked
                    ? 'Earned'
                    : `${weeklyStreak}/${streak.threshold} weeks`,
                currentValue: weeklyStreak,
                targetValue: streak.threshold,
            });
        });
        // Add special event badges
        SPECIAL_EVENT_BADGES.forEach((event) => {
            // Special event badges are unlocked based on specific conditions
            // For now, mock some as unlocked
            const isUnlocked = event.mockUnlocked ?? false;
            allBadges.push({
                id: event.id,
                label: event.label,
                description: event.description,
                category: event.category,
                tier: event.tier,
                pointValue: event.pointValue,
                badgeType: 'event',
                isUnlocked,
                earnedAt: isUnlocked ? event.mockEarnedAt : undefined,
                progress: isUnlocked ? 100 : 0,
                progressLabel: isUnlocked ? 'Earned' : event.requirementLabel,
            });
        });
        return allBadges;
    }
    /**
     * Get badges grouped by category for display
     */
    async getBadgesByCategory(athleteId) {
        const badges = await this.getAllBadgesWithProgress(athleteId);
        const grouped = new Map();
        // Add type-based groups
        grouped.set('milestones', badges.filter((b) => b.badgeType === 'milestone'));
        grouped.set('streaks', badges.filter((b) => b.badgeType === 'streak'));
        grouped.set('events', badges.filter((b) => b.badgeType === 'event'));
        // Add category-based groups for skill badges
        const skillBadges = badges.filter((b) => b.badgeType === 'skill');
        const categories = ['leadership', 'consistency', 'technique', 'mindset', 'teamwork', 'resilience'];
        categories.forEach((cat) => {
            const catBadges = skillBadges.filter((b) => b.category === cat);
            if (catBadges.length > 0) {
                grouped.set(cat, catBadges);
            }
        });
        return grouped;
    }
    /**
     * Get mock session count for an athlete
     */
    async getSessionCount(athleteId) {
        // In production, this would query actual session data
        // For now, return mock data based on athleteId
        const mockCounts = {
            'user1': 47,
            'user2': 12,
            'user3': 8,
            'athlete1': 23,
        };
        return mockCounts[athleteId] ?? 5;
    }
    /**
     * Get mock weekly streak for an athlete
     */
    async getWeeklyStreak(athleteId) {
        // In production, this would calculate from session history
        const mockStreaks = {
            'user1': 6,
            'user2': 3,
            'user3': 2,
            'athlete1': 4,
        };
        return mockStreaks[athleteId] ?? 1;
    }
    /**
     * Get streak info for display on home screen
     */
    async getStreakInfo(athleteId) {
        const currentStreak = await this.getWeeklyStreak(athleteId);
        // Find next milestone
        const milestones = [2, 4, 8, 12];
        const nextMilestone = milestones.find((m) => m > currentStreak) ?? milestones[milestones.length - 1];
        const daysToNextMilestone = Math.max(0, nextMilestone - currentStreak);
        // Generate motivational label
        let streakLabel = '';
        if (currentStreak >= 12) {
            streakLabel = 'Champion streak!';
        }
        else if (currentStreak >= 8) {
            streakLabel = 'Amazing commitment!';
        }
        else if (currentStreak >= 4) {
            streakLabel = 'Great momentum!';
        }
        else if (currentStreak >= 2) {
            streakLabel = 'Keep it going!';
        }
        else {
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
// Session milestone badge definitions
const SESSION_MILESTONE_BADGES = [
    {
        id: 'milestone_5_sessions',
        label: 'First Five',
        description: 'Complete 5 training sessions',
        threshold: 5,
        tier: 1,
        pointValue: 10,
    },
    {
        id: 'milestone_10_sessions',
        label: 'Double Digits',
        description: 'Complete 10 training sessions',
        threshold: 10,
        tier: 1,
        pointValue: 15,
    },
    {
        id: 'milestone_25_sessions',
        label: 'Quarter Century',
        description: 'Complete 25 training sessions',
        threshold: 25,
        tier: 2,
        pointValue: 25,
    },
    {
        id: 'milestone_50_sessions',
        label: 'Half Century',
        description: 'Complete 50 training sessions',
        threshold: 50,
        tier: 2,
        pointValue: 35,
    },
    {
        id: 'milestone_100_sessions',
        label: 'Century Club',
        description: 'Complete 100 training sessions',
        threshold: 100,
        tier: 3,
        pointValue: 50,
    },
];
// Weekly streak badge definitions
const STREAK_BADGES = [
    {
        id: 'streak_2_weeks',
        label: 'Getting Started',
        description: 'Train for 2 consecutive weeks',
        threshold: 2,
        tier: 1,
        pointValue: 10,
    },
    {
        id: 'streak_4_weeks',
        label: 'Monthly Momentum',
        description: 'Train for 4 consecutive weeks',
        threshold: 4,
        tier: 1,
        pointValue: 15,
    },
    {
        id: 'streak_8_weeks',
        label: 'Two Month Warrior',
        description: 'Train for 8 consecutive weeks',
        threshold: 8,
        tier: 2,
        pointValue: 25,
    },
    {
        id: 'streak_12_weeks',
        label: 'Quarter Year Champion',
        description: 'Train for 12 consecutive weeks',
        threshold: 12,
        tier: 3,
        pointValue: 50,
    },
];
// Special event badge definitions
const SPECIAL_EVENT_BADGES = [
    {
        id: 'event_summer_camp',
        label: 'Summer Camp Graduate',
        description: 'Completed the Summer Training Camp program',
        category: 'consistency',
        tier: 2,
        pointValue: 30,
        requirementLabel: 'Complete Summer Camp',
        mockUnlocked: true,
        mockEarnedAt: '2025-08-15T10:00:00Z',
    },
    {
        id: 'event_tournament_mvp',
        label: 'Tournament MVP',
        description: 'Named Most Valuable Player in a tournament',
        category: 'leadership',
        tier: 3,
        pointValue: 50,
        requirementLabel: 'Win Tournament MVP',
        mockUnlocked: false,
    },
    {
        id: 'event_first_goal',
        label: 'First Goal',
        description: 'Scored your first competitive goal',
        category: 'technique',
        tier: 1,
        pointValue: 15,
        requirementLabel: 'Score in a match',
        mockUnlocked: true,
        mockEarnedAt: '2025-06-22T14:30:00Z',
    },
    {
        id: 'event_clean_sheet',
        label: 'Clean Sheet Hero',
        description: 'Kept a clean sheet as goalkeeper',
        category: 'technique',
        tier: 2,
        pointValue: 25,
        requirementLabel: 'Keep a clean sheet',
        mockUnlocked: false,
    },
    {
        id: 'event_community_helper',
        label: 'Community Helper',
        description: 'Helped coach younger players in a session',
        category: 'teamwork',
        tier: 2,
        pointValue: 25,
        requirementLabel: 'Assist in coaching session',
        mockUnlocked: false,
    },
];
exports.badgeService = new BadgeService();
