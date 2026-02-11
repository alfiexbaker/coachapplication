"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.badgeService = void 0;
const api_client_1 = require("./api-client");
const social_feed_service_1 = require("./social-feed-service");
const notification_service_1 = require("./notification-service");
const booking_service_1 = require("./booking-service");
const user_service_1 = require("./user-service");
const logger_1 = require("@/utils/logger");
const event_bus_1 = require("@/services/event-bus");
const result_1 = require("@/types/result");
const progression_1 = require("@/constants/progression");
const storage_keys_1 = require("@/constants/storage-keys");
const badge_definitions_1 = require("./badge-definitions");
const BASE_BADGE_CATALOG = [
    { id: 'badge_best_training', label: 'Best Training Session', tone: 'success', description: 'Recognises a standout session with effort and focus.', category: 'consistency', tier: 1, pointValue: 10 },
    { id: 'badge_streak_starter', label: 'Streak Starter', tone: 'default', description: 'Completed 3 sessions in a row without missing.', category: 'consistency', tier: 1, pointValue: 10 },
    { id: 'badge_dedicated_athlete', label: 'Dedicated Athlete', tone: 'success', description: 'Maintained perfect attendance for a month.', category: 'consistency', tier: 2, pointValue: 25 },
    { id: 'badge_master_passer', label: 'Master Passer', tone: 'default', description: 'Awarded for reliable build-up play and vision.', category: 'technique', tier: 2, pointValue: 25 },
    { id: 'badge_sharp_shooter_pro', label: 'Sharp Shooter Pro', tone: 'warning', description: 'Celebrates clinical finishing under pressure.', category: 'technique', tier: 3, pointValue: 50 },
    { id: 'badge_first_touch', label: 'Silky First Touch', tone: 'default', description: 'Demonstrated excellent ball control in tight spaces.', category: 'technique', tier: 1, pointValue: 10 },
    { id: 'badge_team_captain', label: 'Team Captain', tone: 'success', description: 'Led drills and encouraged teammates.', category: 'leadership', tier: 2, pointValue: 25 },
    { id: 'badge_vocal_leader', label: 'Vocal Leader', tone: 'default', description: 'Communicated well and organized the group.', category: 'leadership', tier: 1, pointValue: 10 },
    { id: 'badge_mentor', label: 'Mentor', tone: 'success', description: 'Helped younger players improve their skills.', category: 'leadership', tier: 3, pointValue: 50 },
    { id: 'badge_growth_mindset', label: 'Growth Mindset', tone: 'default', description: 'Embraced challenges and learned from mistakes.', category: 'mindset', tier: 1, pointValue: 10 },
    { id: 'badge_focused_athlete', label: 'Laser Focus', tone: 'success', description: 'Maintained concentration throughout the session.', category: 'mindset', tier: 2, pointValue: 25 },
    { id: 'badge_team_player', label: 'Team Player', tone: 'default', description: 'Put the team first and supported others.', category: 'teamwork', tier: 1, pointValue: 10 },
    { id: 'badge_assist_king', label: 'Assist King', tone: 'success', description: 'Created multiple scoring opportunities for teammates.', category: 'teamwork', tier: 2, pointValue: 25 },
    { id: 'badge_comeback_kid', label: 'Comeback Kid', tone: 'warning', description: 'Bounced back from setbacks with determination.', category: 'resilience', tier: 2, pointValue: 25 },
    { id: 'badge_never_give_up', label: 'Never Give Up', tone: 'success', description: 'Showed incredible perseverance under pressure.', category: 'resilience', tier: 3, pointValue: 50 },
];
const SEED_BADGE_AWARDS = [
    {
        id: 'award_training_focus',
        badgeId: 'badge_best_training',
        badgeLabel: 'Best Training Session',
        badgeTone: 'success',
        athleteId: 'user1',
        coachId: 'coach1',
        sessionId: 'sess1',
        reason: 'Led transitions and stayed switched on across drills.',
        note: 'Kept energy up for younger players in the pod.',
        awardedBy: 'coach1',
        awardedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        visibility: 'supporters',
        badgeCategory: 'consistency',
        badgeTier: 1,
        badgePointValue: 10,
    },
    {
        id: 'award_master_passer',
        badgeId: 'badge_master_passer',
        badgeLabel: 'Master Passer',
        badgeTone: 'default',
        athleteId: 'user2',
        coachId: 'coach3',
        sessionId: 'sess4',
        reason: 'Threaded creative passes under pressure.',
        note: 'Great first-time balls during rondos.',
        awardedBy: 'coach3',
        awardedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        visibility: 'athlete',
        badgeCategory: 'technique',
        badgeTier: 2,
        badgePointValue: 25,
    },
    {
        id: 'award_sharp_shooter',
        badgeId: 'badge_sharp_shooter_pro',
        badgeLabel: 'Sharp Shooter Pro',
        badgeTone: 'warning',
        athleteId: 'user3',
        coachId: 'coach2',
        sessionId: 'club_session_1',
        reason: 'Finished five consecutive reps with both feet.',
        note: 'Stayed composed with a defender closing.',
        awardedBy: 'coach2',
        awardedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        visibility: 'supporters',
        badgeCategory: 'technique',
        badgeTier: 3,
        badgePointValue: 50,
    },
];
const ATHLETE_PARENT_MAP = {
    user1: { id: 'user4' },
    user2: { id: 'user4' },
    user3: { id: 'user5' },
};
async function resolveUserName(userId, fallback) {
    const userResult = await user_service_1.userService.getUserById(userId);
    if (!userResult.success) {
        return fallback;
    }
    return userResult.data.name?.trim() || fallback;
}
class BadgeService {
    constructor() {
        this.logger = (0, logger_1.createLogger)('BadgeService');
    }
    async getStoredAwards() {
        return api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BADGE_AWARDS, []);
    }
    mergeAwards(stored) {
        const merged = new Map();
        SEED_BADGE_AWARDS.forEach((award) => {
            merged.set(award.id, award);
        });
        stored.forEach((award) => {
            merged.set(award.id, award);
        });
        return Array.from(merged.values()).sort((a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime());
    }
    async listDefinitions() {
        return BASE_BADGE_CATALOG;
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
        const definition = BASE_BADGE_CATALOG.find((badge) => badge.id === input.badgeId);
        const allAwards = this.mergeAwards(stored);
        const mostRecentAward = allAwards.find((award) => award.athleteId === input.athleteId);
        const cooldownWindowDays = 7;
        if (mostRecentAward) {
            const lastAwardDate = new Date(mostRecentAward.awardedAt).getTime();
            const now = Date.now();
            const diffDays = (now - lastAwardDate) / (1000 * 60 * 60 * 24);
            if (diffDays < cooldownWindowDays && !input.overrideCooldown) {
                return (0, result_1.err)((0, result_1.validationError)(`Cooldown in effect. Last badge was ${Math.ceil(diffDays)} day(s) ago. Toggle exception with a note to proceed.`));
            }
            if (diffDays < cooldownWindowDays && input.overrideCooldown && !input.overrideNote?.trim()) {
                return (0, result_1.err)((0, result_1.validationError)('Exception note is required to bypass the cooldown.'));
            }
        }
        const award = {
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
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BADGE_AWARDS, updated);
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
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.BADGE_EARNED, {
            userId: input.athleteId,
            badgeId: input.badgeId,
            badgeLabel: award.badgeLabel,
            coachId: input.coachId,
            sessionId: input.sessionId,
        });
        return (0, result_1.ok)(award);
    }
    /**
     * Create achievement posts in social feed for all clubs the athlete is in
     */
    async createAchievementPosts(award) {
        const clubs = social_feed_service_1.socialFeedService.getUserClubs(award.athleteId);
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
                social_feed_service_1.socialFeedService.createAchievementPost({
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
        const parent = ATHLETE_PARENT_MAP[award.athleteId];
        if (!parent) {
            this.logger.debug('no_parent_for_notification', { athleteId: award.athleteId });
            return;
        }
        const [athleteName, coachName] = await Promise.all([
            resolveUserName(award.athleteId, 'Athlete'),
            resolveUserName(award.coachId, 'Coach'),
        ]);
        const notification = {
            id: `notif_badge_${award.id}`,
            type: 'badge',
            title: `${athleteName} earned a badge!`,
            body: `${athleteName} earned the ${award.badgeLabel} badge from Coach ${coachName}`,
            timeLabel: 'Just now',
            read: false,
            badgeTitle: award.badgeLabel,
            athleteName,
            badgeAwardId: award.id,
            actionLabel: 'View Badge',
            handled: false,
            deepLink: `/children/badges/${award.athleteId}?highlightBadge=${award.id}`,
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
        const athleteName = await resolveUserName(target.athleteId, 'Athlete');
        const feedPost = alreadySentToFeed
            ? undefined
            : social_feed_service_1.socialFeedService.addPost({
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
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BADGE_AWARDS, nextStored);
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
    async postBadgeToFeed(awardId) {
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
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BADGE_AWARDS, nextStored);
        this.logger.info('badge_posted_to_feed_by_user', {
            awardId,
            athleteId: award.athleteId,
            badgeLabel: award.badgeLabel,
        });
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
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BADGE_AWARDS, nextStored);
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
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BADGE_AWARDS, updated);
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
            const definition = BASE_BADGE_CATALOG.find((badge) => badge.id === award.badgeId);
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
        const coachIds = Array.from(new Set(awards.map((award) => award.coachId)));
        const coachNameEntries = await Promise.all(coachIds.map(async (coachId) => [coachId, await resolveUserName(coachId, 'Coach')]));
        const coachNameById = new Map(coachNameEntries);
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
                awardedBy: award ? coachNameById.get(award.coachId) ?? 'Coach' : undefined,
                progress: isUnlocked ? 100 : 0,
                progressLabel: isUnlocked ? 'Earned' : 'Locked',
            });
        });
        // Add session milestone badges
        badge_definitions_1.SESSION_MILESTONE_BADGES.forEach((milestone) => {
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
        badge_definitions_1.STREAK_BADGES.forEach((streak) => {
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
        // Check if athlete has earned any event badges from their awards
        const eventAwards = awards.filter((a) => badge_definitions_1.EVENT_BADGES.some((e) => e.id === a.badgeId));
        const earnedEventIds = new Set(eventAwards.map((a) => a.badgeId));
        badge_definitions_1.EVENT_BADGES.forEach((event) => {
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
     * Get session count for an athlete from booking data
     */
    async getSessionCount(athleteId) {
        try {
            const bookings = await booking_service_1.bookingService.getBookingsForUser(athleteId, 'athlete');
            // Count completed sessions
            const completedCount = bookings.filter((b) => b.status === 'COMPLETED' || b.status === 'AWAITING_COMPLETION').length;
            return completedCount;
        }
        catch (error) {
            this.logger.error('Failed to get session count', error);
            return 0;
        }
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
exports.badgeService = new BadgeService();
