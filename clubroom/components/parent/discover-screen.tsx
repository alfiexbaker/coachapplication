/**
 * ParentDiscoverScreen — Coach discovery with child selector, club hub,
 * invites, review prompts, and nearby coach search.
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Row } from '@/components/primitives/row';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { Clickable } from '@/components/primitives/clickable';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/useTheme';
import { apiClient } from '@/services/api-client';
import {
  getAllCoachesWithProfiles,
  getDistanceBetweenPostcodes,
  getChildrenForParent,
  clubs,
  clubMemberships,
} from '@/constants/mock-data';
import { availabilityService } from '@/services/availability-service';
import { inviteService as sessionInviteService } from '@/services/invite';
import { bookingService } from '@/services/booking-service';
import { createLogger } from '@/utils/logger';
import { toDateStr } from '@/utils/format';
import type { AvailabilitySlot, SessionInvite, Club } from '@/constants/types';
import type { Booking } from '@/constants/app-types';

import { DiscoverHeader } from './discover-header';
import { DiscoverClubHub } from './discover-club-hub';
import { DiscoverReviewPrompt } from './discover-review-prompt';
import { DiscoverPendingInvites } from './discover-pending-invites';
import { DiscoverCoachList } from './discover-coach-list';

const logger = createLogger('ParentDiscoverScreen');

const nextAvailableCache: Record<string, { slot: AvailabilitySlot | null; timestamp: number }> = {};

export function ParentDiscoverScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const [postcode, setPostcode] = useState('');
  const [nextAvailableSlots, setNextAvailableSlots] = useState<Record<string, AvailabilitySlot | null>>({});
  const [pendingInvites, setPendingInvites] = useState<SessionInvite[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>(undefined);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [invitesError, setInvitesError] = useState<string | null>(null);
  const [completedSessions, setCompletedSessions] = useState<Booking[]>([]);

  const children = useMemo(() => {
    if (!currentUser) return [];
    return getChildrenForParent(currentUser.id);
  }, [currentUser]);

  const userClubs = useMemo((): Club[] => {
    if (!currentUser) return [];
    const memberships = clubMemberships.filter((m) => m.userId === currentUser.id && m.status === 'active');
    return memberships.map((m) => clubs.find((c) => c.id === m.clubId)).filter((c): c is Club => c !== undefined);
  }, [currentUser]);

  useEffect(() => {
    if (children.length > 0 && !selectedChildId) setSelectedChildId(children[0].id);
  }, [children, selectedChildId]);

  const loadCompletedSessions = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const bookings = await bookingService.getBookingsForUser(currentUser.id, 'parent');
      const dismissed = await apiClient.get<Record<string, number>>('dismissed_reviews', {});
      const now = Date.now(), DAY = 86_400_000;
      const needsReview = bookings.filter((b) => {
        if (b.status !== 'COMPLETED') return false;
        if (!dismissed[b.id]) return true;
        return !dismissed[`${b.id}_second`] && now - dismissed[b.id] > DAY;
      });
      setCompletedSessions(needsReview.slice(0, 2));
    } catch (e) { logger.error('Failed to load completed sessions', e); }
  }, [currentUser?.id]);

  const dismissReview = useCallback(async (bookingId: string) => {
    try {
      const map = await apiClient.get<Record<string, number>>('dismissed_reviews', {});
      map[map[bookingId] ? `${bookingId}_second` : bookingId] = Date.now();
      await apiClient.set('dismissed_reviews', map);
      setCompletedSessions((prev) => prev.filter((b) => b.id !== bookingId));
    } catch (e) { logger.error('Failed to dismiss review', e); }
  }, []);

  const loadPendingInvites = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoadingInvites(true);
    setInvitesError(null);
    try {
      const invites = await sessionInviteService.getInvitesForParent(currentUser.id);
      const pending = invites.filter((inv) => inv.status === 'PENDING' && new Date(inv.expiresAt) > new Date());
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
    return getAllCoachesWithProfiles()
      .map((coach) => ({ ...coach, distance: getDistanceBetweenPostcodes(currentUser.postcode, coach.postcode) }))
      .filter((coach) => coach.distance <= 5)
      .sort((a, b) => a.distance - b.distance);
  }, [postcode, currentUser]);

  useEffect(() => {
    const fetchSlots = async () => {
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
    if (nearbyCoaches.length > 0) fetchSlots();
  }, [nearbyCoaches]);

  if (!currentUser) return null;

  const selectedChild = children.find((c) => c.id === selectedChildId);

  const renderEmptyState = () => {
    if (children.length === 0) {
      return (
        <View style={styles.emptyState}>
          <ThemedText type="subtitle" style={styles.emptyTitle}>No children added</ThemedText>
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
            Add your children to start discovering coaches
          </ThemedText>
        </View>
      );
    }
    if (!postcode || postcode.length < 3) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search" size={48} color={palette.icon} style={{ opacity: 0.3 }} />
          <ThemedText type="subtitle" style={styles.emptyTitle}>Find expert coaches</ThemedText>
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
            Enter postcode to discover coaches for {selectedChild?.name}
          </ThemedText>
        </View>
      );
    }
    if (nearbyCoaches.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="location-outline" size={48} color={palette.icon} style={{ opacity: 0.3 }} />
          <ThemedText type="subtitle" style={styles.emptyTitle}>No coaches nearby</ThemedText>
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>Try a different postcode</ThemedText>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} stickyHeaderIndices={[0]}>
        <DiscoverHeader
          children={children}
          selectedChildId={selectedChildId}
          onSelectChild={setSelectedChildId}
          postcode={postcode}
          onPostcodeChange={setPostcode}
        />
        <DiscoverClubHub userClubs={userClubs} />
        <DiscoverReviewPrompt sessions={completedSessions} onDismiss={dismissReview} />

        {loadingInvites && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={palette.tint} />
          </View>
        )}
        {invitesError && !loadingInvites && (
          <Row align="center" gap="sm" style={[styles.errorContainer, { backgroundColor: withAlpha(palette.error, 0.06), borderColor: palette.error }]}>
            <Ionicons name="alert-circle" size={16} color={palette.error} />
            <ThemedText style={[styles.errorText, { color: palette.error }]}>{invitesError}</ThemedText>
            <Clickable onPress={loadPendingInvites}>
              <ThemedText style={[styles.retryLink, { color: palette.tint }]}>Retry</ThemedText>
            </Clickable>
          </Row>
        )}

        {!loadingInvites && <DiscoverPendingInvites invites={pendingInvites} />}

        {renderEmptyState() || (
          nearbyCoaches.length > 0 && (
            <DiscoverCoachList
              coaches={nearbyCoaches}
              postcode={postcode}
              selectedChildId={selectedChildId}
              nextAvailableSlots={nextAvailableSlots}
            />
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: Spacing['2xl'] },
  loadingContainer: { padding: Spacing.lg, alignItems: 'center' },
  errorContainer: {
    marginHorizontal: Spacing.lg, padding: Spacing.md, borderRadius: 12, borderWidth: 1,
  },
  errorText: { ...Typography.small, flex: 1 },
  retryLink: { ...Typography.smallSemiBold },
  emptyState: { paddingTop: Spacing['3xl'], paddingHorizontal: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
  emptyTitle: { ...Typography.heading, marginTop: Spacing.sm },
  emptyText: { ...Typography.bodySmall, textAlign: 'center', lineHeight: 20 },
});
