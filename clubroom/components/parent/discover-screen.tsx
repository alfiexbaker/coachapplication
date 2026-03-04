/**
 * ParentDiscoverScreen — Coach discovery with child selector, club hub,
 * invites, review prompts, and nearby coach search.
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Row } from '@/components/primitives/row';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import { Clickable } from '@/components/primitives/clickable';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { useTheme } from '@/hooks/useTheme';
import { apiClient } from '@/services/api-client';
import { availabilityService } from '@/services/availability-service';
import { inviteService as sessionInviteService } from '@/services/invite';
import { bookingService } from '@/services/booking-service';
import { socialFeedService } from '@/services/social-feed-service';
import { discoverService } from '@/services/discover-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { getStoredCoachReviews } from '@/services/review-sync-service';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import type { AvailabilitySlot, SessionInvite, Club } from '@/constants/types';
import type { Booking } from '@/constants/app-types';
import { Routes } from '@/navigation/routes';
import { DiscoverHeader } from './discover-header';
import { DiscoverClubHub } from './discover-club-hub';
import { DiscoverReviewPrompt } from './discover-review-prompt';
import { DiscoverPendingInvites } from './discover-pending-invites';
import { DiscoverCoachList } from './discover-coach-list';
import { styles } from './discover-screen-styles';
import {
  type ChildOption,
  type CoachOption,
  DiscoverEmptyState,
  mapCoachOption,
} from './discover-screen-sections';
const logger = createLogger('ParentDiscoverScreen');
const nextAvailableCache: Record<string, { slot: AvailabilitySlot | null; timestamp: number }> = {};

export function ParentDiscoverScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const { children: contextChildren } = useChildContext();
  const [postcode, setPostcode] = useState('');
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [allCoaches, setAllCoaches] = useState<CoachOption[]>([]);
  const [nextAvailableSlots, setNextAvailableSlots] = useState<
    Record<string, AvailabilitySlot | null>
  >({});
  const [pendingInvites, setPendingInvites] = useState<SessionInvite[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>(undefined);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [invitesError, setInvitesError] = useState<string | null>(null);
  const [completedSessions, setCompletedSessions] = useState<Booking[]>([]);
  const userClubs = useMemo((): Club[] => {
    if (!currentUser?.id) return [];
    return socialFeedService.getUserClubs(currentUser.id);
  }, [currentUser?.id]);
  useEffect(() => {
    if (children.length > 0 && !selectedChildId) setSelectedChildId(children[0].id);
  }, [children, selectedChildId]);
  useEffect(() => {
    setChildren(contextChildren.map((c) => ({ id: c.id, name: c.name })));
  }, [contextChildren]);
  useEffect(() => {
    let active = true;
    const loadCoaches = async () => {
      const result = await discoverService.getAllCoaches();
      if (!active) {
        return;
      }
      if (!result.success) {
        setAllCoaches([]);
        return;
      }
      setAllCoaches(result.data.map(mapCoachOption));
    };
    void loadCoaches();
    return () => {
      active = false;
    };
  }, []);
  const loadCompletedSessions = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const [bookings, dismissed, reviews] = await Promise.all([
        bookingService.getBookingsForUser(currentUser.id, 'parent'),
        apiClient.get<Record<string, number>>(STORAGE_KEYS.DISMISSED_REVIEW_PROMPTS, {}),
        getStoredCoachReviews(),
      ]);
      const now = Date.now(),
        DAY = 86_400_000;
      const reviewedBookingIds = new Set(
        reviews
          .filter((review) => {
            if (!review.bookingId) return false;
            return (
              review.userId === currentUser.id ||
              review.parentId === currentUser.id ||
              (!review.userId && !review.parentId)
            );
          })
          .map((review) => review.bookingId as string),
      );
      const needsReview = bookings.filter((b) => {
        if (b.status !== 'COMPLETED') return false;
        if (reviewedBookingIds.has(b.id)) return false;
        if (!dismissed[b.id]) return true;
        return !dismissed[`${b.id}_second`] && now - dismissed[b.id] > DAY;
      });
      setCompletedSessions(needsReview.slice(0, 2));
    } catch (e) {
      logger.error('Failed to load completed sessions', e);
    }
  }, [currentUser?.id]);
  const dismissReview = useCallback(async (bookingId: string) => {
    try {
      const map = await apiClient.get<Record<string, number>>(
        STORAGE_KEYS.DISMISSED_REVIEW_PROMPTS,
        {},
      );
      map[map[bookingId] ? `${bookingId}_second` : bookingId] = Date.now();
      await apiClient.set(STORAGE_KEYS.DISMISSED_REVIEW_PROMPTS, map);
      setCompletedSessions((prev) => prev.filter((b) => b.id !== bookingId));
    } catch (e) {
      logger.error('Failed to dismiss review', e);
    }
  }, []);
  const loadPendingInvites = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoadingInvites(true);
    setInvitesError(null);
    try {
      const invites = await sessionInviteService.getInvitesForParent(currentUser.id);
      const pending = invites.filter(
        (inv) => inv.status === 'PENDING' && new Date(inv.expiresAt) > new Date(),
      );
      setPendingInvites(pending.slice(0, 3));
    } catch (error) {
      logger.error('Failed to load pending invites', { error });
      setInvitesError('Failed to load invites');
    } finally {
      setLoadingInvites(false);
    }
  }, [currentUser?.id]);
  useFocusEffect(
    useCallback(() => {
      if (currentUser?.id) {
        loadPendingInvites();
        loadCompletedSessions();
      }
    }, [currentUser?.id, loadPendingInvites, loadCompletedSessions]),
  );
  const nearbyCoaches = useMemo(() => {
    if (!postcode || postcode.length < 3 || !currentUser) return [];
    return allCoaches
      .filter((coach) => coach.distance <= 5)
      .sort((a, b) => a.distance - b.distance);
  }, [allCoaches, postcode, currentUser]);
  useEffect(() => {
    const fetchSlots = async () => {
      if (nearbyCoaches.length === 0) {
        setNextAvailableSlots({});
        return;
      }
      const today = toDateStr(new Date());
      const twoWeeks = new Date();
      twoWeeks.setDate(twoWeeks.getDate() + 14);
      const endDate = toDateStr(twoWeeks);
      const slotsMap: Record<string, AvailabilitySlot | null> = {};
      for (const coach of nearbyCoaches) {
        const cached = nextAvailableCache[coach.id];
        if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
          slotsMap[coach.id] = cached.slot;
          continue;
        }
        try {
          const slots = await availabilityService.getAvailableSlots(coach.id, today, endDate);
          const nextSlot = slots.find((s) => s.isAvailable) || null;
          slotsMap[coach.id] = nextSlot;
          nextAvailableCache[coach.id] = { slot: nextSlot, timestamp: Date.now() };
        } catch (error) {
          logger.error('Failed to fetch availability for coach', { coachId: coach.id, error });
          slotsMap[coach.id] = null;
        }
      }
      setNextAvailableSlots(slotsMap);
    };
    void fetchSlots();
  }, [nearbyCoaches]);
  if (!currentUser) return null;
  const selectedChild = children.find((c) => c.id === selectedChildId);
  const emptyState = (
    <DiscoverEmptyState
      childrenCount={children.length}
      postcode={postcode}
      selectedChildName={selectedChild?.name}
      nearbyCoachCount={nearbyCoaches.length}
      palette={palette}
    />
  );
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView contentContainerStyle={styles.content} stickyHeaderIndices={[0]}>
        <DiscoverHeader
          childOptions={children}
          selectedChildId={selectedChildId}
          onSelectChild={setSelectedChildId}
          postcode={postcode}
          onPostcodeChange={setPostcode}
        />
        <View style={styles.familyEntryPanel}>
          <Row gap="sm">
            <Clickable
              onPress={() => router.push(Routes.FAMILY)}
              style={[
                styles.familyEntryTile,
                {
                  backgroundColor: withAlpha(palette.tint, 0.08),
                  borderColor: withAlpha(palette.tint, 0.2),
                },
              ]}
            >
              <Row align="center" gap="xs">
                <Ionicons name="people-outline" size={16} color={palette.tint} />
                <ThemedText style={[styles.familyEntryLabel, { color: palette.tint }]}>
                  Family Dashboard
                </ThemedText>
              </Row>
            </Clickable>
            <Clickable
              onPress={() => router.push(Routes.FAMILY_CALENDAR)}
              style={[
                styles.familyEntryTile,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <Row align="center" gap="xs">
                <Ionicons name="calendar-outline" size={16} color={palette.tint} />
                <ThemedText style={[styles.familyEntryLabel, { color: palette.text }]}>
                  Family Calendar
                </ThemedText>
              </Row>
            </Clickable>
          </Row>
          <Row gap="sm">
            <Clickable
              onPress={() => router.push(Routes.FAMILY_SPENDING)}
              style={[
                styles.familyEntryTile,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <Row align="center" gap="xs">
                <Ionicons name="wallet-outline" size={16} color={palette.tint} />
                <ThemedText style={[styles.familyEntryLabel, { color: palette.text }]}>
                  Family Spending
                </ThemedText>
              </Row>
            </Clickable>
            <Clickable
              onPress={() => router.push(Routes.HEALTH)}
              style={[
                styles.familyEntryTile,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <Row align="center" gap="xs">
                <Ionicons name="medkit-outline" size={16} color={palette.tint} />
                <ThemedText style={[styles.familyEntryLabel, { color: palette.text }]}>
                  Health & Injury
                </ThemedText>
              </Row>
            </Clickable>
          </Row>
        </View>
        <DiscoverClubHub userClubs={userClubs} />
        <DiscoverReviewPrompt sessions={completedSessions} onDismiss={dismissReview} />
        {loadingInvites && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={palette.tint} />
          </View>
        )}
        {invitesError && !loadingInvites && (
          <Row
            align="center"
            gap="sm"
            style={[
              styles.errorContainer,
              { backgroundColor: withAlpha(palette.error, 0.06), borderColor: palette.error },
            ]}
          >
            <Ionicons name="alert-circle" size={16} color={palette.error} />
            <ThemedText style={[styles.errorText, { color: palette.error }]}>
              {invitesError}
            </ThemedText>
            <Clickable onPress={loadPendingInvites}>
              <ThemedText style={[styles.retryLink, { color: palette.tint }]}>Retry</ThemedText>
            </Clickable>
          </Row>
        )}
        {!loadingInvites && <DiscoverPendingInvites invites={pendingInvites} />}
        {emptyState ||
          (nearbyCoaches.length > 0 && (
            <DiscoverCoachList
              coaches={nearbyCoaches}
              postcode={postcode}
              selectedChildId={selectedChildId}
              nextAvailableSlots={nextAvailableSlots}
            />
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}
