"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = void 0;
exports.deduplicateBookings = deduplicateBookings;
exports.useHomeScreen = useHomeScreen;
/**
 * useHomeScreen — Data loading and state for the athlete/parent home screen.
 */
const react_1 = require("react");
const use_auth_1 = require("@/hooks/use-auth");
const use_child_context_1 = require("@/hooks/use-child-context");
const badge_service_1 = require("@/services/badge-service");
const social_feed_service_1 = require("@/services/social-feed-service");
const progress_service_1 = require("@/services/progress-service");
const booking_service_1 = require("@/services/booking-service");
const event_bus_1 = require("@/services/event-bus");
const logger_1 = require("@/utils/logger");
const format_1 = require("@/utils/format");
const logger = (0, logger_1.createLogger)('UserHomeScreen');
exports.formatDate = format_1.formatShortDateWithYear;
/**
 * Pure function: deduplicate bookings across children for family view.
 * Groups by booking.id, merges children that share the same booking.
 */
function deduplicateBookings(bookings, children) {
    const childMap = new Map();
    for (const child of children) {
        childMap.set(child.id, child);
    }
    const groups = new Map();
    for (const booking of bookings) {
        const involvedChildIds = [];
        if (booking.athleteId && childMap.has(booking.athleteId)) {
            involvedChildIds.push(booking.athleteId);
        }
        for (const id of booking.athleteIds ?? []) {
            if (childMap.has(id) && !involvedChildIds.includes(id)) {
                involvedChildIds.push(id);
            }
        }
        const key = booking.id;
        const existing = groups.get(key);
        if (existing) {
            for (const cid of involvedChildIds) {
                existing.childIds.add(cid);
            }
        }
        else {
            groups.set(key, { booking, childIds: new Set(involvedChildIds) });
        }
    }
    const rows = [];
    for (const [, group] of groups) {
        const childEntries = [];
        for (const cid of group.childIds) {
            const info = childMap.get(cid);
            if (info) {
                childEntries.push({ id: info.id, name: info.name, colorCode: info.colorCode });
            }
        }
        rows.push({
            booking: group.booking,
            children: childEntries,
            isShared: childEntries.length >= 2,
        });
    }
    rows.sort((a, b) => new Date(a.booking.scheduledAt).getTime() - new Date(b.booking.scheduledAt).getTime());
    return rows;
}
function useHomeScreen() {
    const { currentUser } = (0, use_auth_1.useAuth)();
    const { children: contextChildren, activeChildId: contextActiveChildId, setActiveChildId: contextSetActiveChildId, isParent, isMultiChild, } = (0, use_child_context_1.useChildContext)();
    const [refreshing, setRefreshing] = (0, react_1.useState)(false);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [recentBadges, setRecentBadges] = (0, react_1.useState)([]);
    const [clubs, setClubs] = (0, react_1.useState)([]);
    const [upcomingBookings, setUpcomingBookings] = (0, react_1.useState)([]);
    const [stats, setStats] = (0, react_1.useState)({ sessions: 0, badges: 0, level: 1 });
    const [streakInfo, setStreakInfo] = (0, react_1.useState)(null);
    // Local selectedChildId for immediate UI response — initialized from context
    const [selectedChildId, setSelectedChildIdLocal] = (0, react_1.useState)(() => contextActiveChildId);
    // Sync from external context changes
    (0, react_1.useEffect)(() => {
        const unsub = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.FAMILY_ACTIVE_CHILD_CHANGED, (payload) => {
            setSelectedChildIdLocal(payload.childId);
        });
        return unsub;
    }, []);
    // Handler: update BOTH local and context
    const setSelectedChildId = (0, react_1.useCallback)((childId) => {
        setSelectedChildIdLocal(childId);
        void contextSetActiveChildId(childId);
    }, [contextSetActiveChildId]);
    const athleteId = selectedChildId || contextChildren[0]?.id || currentUser?.id;
    const loadData = (0, react_1.useCallback)(async () => {
        if (!athleteId)
            return;
        setError(null);
        try {
            const badges = await badge_service_1.badgeService.listAwardsForAthlete(athleteId);
            setRecentBadges(badges.slice(0, 3));
            const userClubs = social_feed_service_1.socialFeedService.getUserClubs(currentUser?.id || '');
            setClubs(userClubs);
            const progress = await progress_service_1.progressService.getAthleteProgress(athleteId, 'athlete');
            setStats({
                sessions: progress.totalSessions,
                badges: progress.totalBadges,
                level: progress.currentLevel.level,
            });
            const streak = await badge_service_1.badgeService.getStreakInfo(athleteId);
            setStreakInfo(streak);
            if (currentUser?.id) {
                const role = isParent ? 'parent' : 'athlete';
                const bookings = await booking_service_1.bookingService.getBookingsForUser(currentUser.id, role);
                const now = Date.now();
                const filteredBookings = bookings
                    .filter((booking) => {
                    const isFuture = new Date(booking.scheduledAt).getTime() > now;
                    const isConfirmed = booking.status === 'CONFIRMED';
                    if (!selectedChildId) {
                        return isFuture && isConfirmed;
                    }
                    return (isFuture &&
                        isConfirmed &&
                        (booking.athleteId === selectedChildId ||
                            booking.athleteIds?.includes(selectedChildId)));
                })
                    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
                setUpcomingBookings(filteredBookings);
            }
            else {
                setUpcomingBookings([]);
            }
        }
        catch (err) {
            logger.error('Failed to load home data', err);
            setError('Failed to load data. Pull down to refresh.');
            setUpcomingBookings([]);
        }
        finally {
            setLoading(false);
        }
    }, [athleteId, currentUser, selectedChildId, isParent]);
    (0, react_1.useEffect)(() => {
        loadData();
    }, [loadData]);
    const onRefresh = (0, react_1.useCallback)(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);
    // Deduplicated family booking rows for multi-child "All" mode
    const familyBookingRows = (0, react_1.useMemo)(() => isMultiChild && selectedChildId === null
        ? deduplicateBookings(upcomingBookings, contextChildren)
        : [], [upcomingBookings, contextChildren, isMultiChild, selectedChildId]);
    return {
        currentUser,
        refreshing,
        loading,
        error,
        recentBadges,
        clubs,
        stats,
        streakInfo,
        selectedChildId,
        setSelectedChildId,
        onRefresh,
        upcomingBookings,
        familyBookingRows,
        isMultiChild,
        isParent,
        contextChildren,
    };
}
