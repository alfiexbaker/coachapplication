import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  getAllCoachesWithProfiles,
  getDistanceBetweenPostcodes,
  formatGBP,
  getChildrenForParent,
  clubs,
  clubMemberships,
} from '@/constants/mock-data';
import { availabilityService } from '@/services/availability-service';
import { inviteService as sessionInviteService } from '@/services/invite-service';
import { bookingService } from '@/services/booking-service';
import { createLogger } from '@/utils/logger';
import type { AvailabilitySlot, SessionInvite, Club } from '@/constants/types';
import type { Booking } from '@/constants/app-types';

const logger = createLogger('ParentDiscoverScreen');

// Cache for next available slots to avoid repeated API calls
const nextAvailableCache: Record<string, { slot: AvailabilitySlot | null; timestamp: number }> = {};

export function ParentDiscoverScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const [postcode, setPostcode] = useState('');
  const [nextAvailableSlots, setNextAvailableSlots] = useState<Record<string, AvailabilitySlot | null>>({});
  const [pendingInvites, setPendingInvites] = useState<SessionInvite[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | undefined>(undefined);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [invitesError, setInvitesError] = useState<string | null>(null);
  const [completedSessions, setCompletedSessions] = useState<Booking[]>([]);

  // Get children for the current parent
  const children = useMemo(() => {
    if (!currentUser) return [];
    return getChildrenForParent(currentUser.id);
  }, [currentUser]);

  // Get clubs for the current parent
  const userClubs = useMemo((): Club[] => {
    if (!currentUser) return [];
    const memberships = clubMemberships.filter((m) => m.userId === currentUser.id && m.status === 'active');
    return memberships
      .map((m) => clubs.find((c) => c.id === m.clubId))
      .filter((c): c is Club => c !== undefined);
  }, [currentUser]);

  const [clubInviteCode, setClubInviteCode] = useState('');

  const handleJoinClub = () => {
    if (clubInviteCode.trim()) {
      router.push({
        pathname: '/(tabs)/club-hub',
        params: { code: clubInviteCode.trim().toUpperCase() },
      });
    } else {
      router.push('/(tabs)/club-hub');
    }
  };

  // Initialize selectedChildId when children change
  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const loadCompletedSessions = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const bookings = await bookingService.getBookingsForUser(currentUser.id, 'parent');
      const dismissed = await AsyncStorage.getItem('dismissed_reviews');
      const dismissedMap: Record<string, number> = dismissed ? JSON.parse(dismissed) : {};
      const now = Date.now();
      const ONE_DAY = 24 * 60 * 60 * 1000;

      const needsReview = bookings.filter((b: any) => {
        if (b.status !== 'COMPLETED') return false;
        const dismissedAt = dismissedMap[b.id];
        // If dismissed, re-prompt after 24h once
        if (dismissedAt) {
          const secondDismiss = dismissedMap[`${b.id}_second`];
          if (secondDismiss) return false; // Already prompted twice
          return now - dismissedAt > ONE_DAY;
        }
        return true;
      });
      setCompletedSessions(needsReview.slice(0, 2));
    } catch (error) {
      logger.error('Failed to load completed sessions', error);
    }
  }, [currentUser?.id]);

  const dismissReview = async (bookingId: string) => {
    try {
      const dismissed = await AsyncStorage.getItem('dismissed_reviews');
      const dismissedMap: Record<string, number> = dismissed ? JSON.parse(dismissed) : {};
      if (dismissedMap[bookingId]) {
        // Second dismiss
        dismissedMap[`${bookingId}_second`] = Date.now();
      } else {
        dismissedMap[bookingId] = Date.now();
      }
      await AsyncStorage.setItem('dismissed_reviews', JSON.stringify(dismissedMap));
      setCompletedSessions(prev => prev.filter(b => b.id !== bookingId));
    } catch (error) {
      logger.error('Failed to dismiss review', error);
    }
  };

  const loadPendingInvites = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoadingInvites(true);
    setInvitesError(null);
    try {
      const invites = await sessionInviteService.getInvitesForParent(currentUser.id);
      const pending = invites.filter(
        (inv) => inv.status === 'PENDING' && new Date(inv.expiresAt) > new Date()
      );
      setPendingInvites(pending.slice(0, 3)); // Show max 3 on home
    } catch (error) {
      logger.error('Failed to load pending invites', { error });
      setInvitesError('Failed to load invites');
    } finally {
      setLoadingInvites(false);
    }
  }, [currentUser?.id]);

  // Load pending invites and completed sessions when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (currentUser?.id) {
        loadPendingInvites();
        loadCompletedSessions();
      }
    }, [currentUser?.id, loadPendingInvites, loadCompletedSessions])
  );

  // All hooks must be called before any early returns
  const nearbyCoaches = useMemo(() => {
    if (!postcode || postcode.length < 3 || !currentUser) return [];

    const allCoaches = getAllCoachesWithProfiles();

    return allCoaches
      .map((coach) => ({
        ...coach,
        distance: getDistanceBetweenPostcodes(currentUser.postcode, coach.postcode),
      }))
      .filter((coach) => coach.distance <= 5)
      .sort((a, b) => a.distance - b.distance);
  }, [postcode, currentUser]);

  // Fetch next available slot for each coach
  useEffect(() => {
    const fetchNextAvailableSlots = async () => {
      const today = new Date().toISOString().split('T')[0];
      const twoWeeksLater = new Date();
      twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
      const endDate = twoWeeksLater.toISOString().split('T')[0];

      const slotsMap: Record<string, AvailabilitySlot | null> = {};

      for (const coach of nearbyCoaches) {
        // Check cache first (valid for 5 minutes)
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

    if (nearbyCoaches.length > 0) {
      fetchNextAvailableSlots();
    }
  }, [nearbyCoaches]);

  // Early return after all hooks
  if (!currentUser) return null;

  // Format next available slot for display
  const formatNextAvailable = (slot: AvailabilitySlot | null): string => {
    if (!slot) return 'Check availability';

    const slotDate = new Date(slot.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (slotDate.toDateString() === today.toDateString()) {
      return `Today at ${slot.startTime}`;
    } else if (slotDate.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${slot.startTime}`;
    } else {
      const dayName = slotDate.toLocaleDateString('en-US', { weekday: 'short' });
      return `${dayName} at ${slot.startTime}`;
    }
  };

  const handlePostcodeChange = (value: string) => {
    const stripped = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!stripped) {
      setPostcode('');
      return;
    }

    const withSpace =
      stripped.length > 3 ? `${stripped.slice(0, stripped.length - 3)} ${stripped.slice(-3)}` : stripped;
    setPostcode(withSpace);
  };

  const selectedChild = children.find((c) => c.id === selectedChildId);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} stickyHeaderIndices={[0]}>
        {/* Sticky Header with Child Selector */}
        <View style={[styles.stickyHeader, { backgroundColor: palette.background }]}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Discover Coaches
            </ThemedText>
            {children.length === 0 ? (
              <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
                Add children to your account to book sessions
              </ThemedText>
            ) : children.length === 1 ? (
              <View style={styles.singleChild}>
                <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
                  Booking for {children[0].name}
                </ThemedText>
              </View>
            ) : (
              <View style={styles.childTabs}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tabsContent}>
                  {children.map((child) => {
                    const isSelected = child.id === selectedChildId;
                    return (
                      <Pressable
                        key={child.id}
                        onPress={() => {
                          setSelectedChildId(child.id);
                          logger.press('ChildTab', { childId: child.id, childName: child.name });
                        }}
                        style={({ pressed }) => [
                          styles.childTab,
                          {
                            borderBottomColor: isSelected ? palette.tint : 'transparent',
                            opacity: pressed ? 0.6 : 1,
                          },
                        ]}>
                        <ThemedText
                          style={[
                            styles.tabText,
                            {
                              color: isSelected ? palette.tint : palette.muted,
                              fontWeight: isSelected ? '700' : '500',
                            },
                          ]}>
                          {child.name}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>

          {children.length > 0 && (
            <View style={[styles.searchBar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Ionicons name="search" size={20} color={palette.icon} />
              <TextInput
                value={postcode}
                onChangeText={handlePostcodeChange}
                placeholder="Search by postcode"
                placeholderTextColor={palette.muted}
                keyboardType="default"
                autoCapitalize="characters"
                style={[styles.searchInput, { color: palette.text }]}
              />
              {postcode ? (
                <Clickable onPress={() => setPostcode('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={palette.icon} />
                </Clickable>
              ) : null}
            </View>
          )}
        </View>

        {/* Club Hub Section - Prominent Position */}
        <Animated.View entering={FadeInDown.springify()} style={styles.clubHubSection}>
          <SurfaceCard style={styles.clubHubCard}>
            <View style={styles.clubHubHeader}>
              <View style={[styles.clubHubIconCircle, { backgroundColor: `${palette.tint}15` }]}>
                <Ionicons name="shield" size={24} color={palette.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold" style={{ fontSize: 17 }}>
                  Club Hub
                </ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
                  {userClubs.length > 0 ? `${userClubs.length} club${userClubs.length > 1 ? 's' : ''} joined` : 'Join your team'}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => router.push('/(tabs)/club-hub')}
                style={({ pressed }) => [
                  styles.clubHubViewButton,
                  { backgroundColor: palette.tint, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <ThemedText style={{ color: palette.surface, fontWeight: '600', fontSize: 13 }}>
                  {userClubs.length > 0 ? 'View All' : 'Browse'}
                </ThemedText>
              </Pressable>
            </View>

            {/* Show user's clubs */}
            {userClubs.length > 0 && (
              <View style={styles.clubHubList}>
                {userClubs.slice(0, 2).map((club) => (
                  <Pressable
                    key={club.id}
                    onPress={() => router.push({ pathname: '/club/[id]', params: { id: club.id } })}
                    style={({ pressed }) => [
                      styles.clubHubItem,
                      { backgroundColor: `${palette.tint}08`, borderColor: `${palette.tint}20`, opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <View style={[styles.clubHubItemIcon, { backgroundColor: palette.tint }]}>
                      <ThemedText style={styles.clubHubItemIconText}>
                        {club.badge?.slice(0, 2) || club.name.slice(0, 2).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }} numberOfLines={1}>
                        {club.name}
                      </ThemedText>
                      <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                        {club.memberCount} members
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={palette.muted} />
                  </Pressable>
                ))}
              </View>
            )}

            {/* Join with code section */}
            <View style={[styles.clubHubJoinSection, { borderTopColor: palette.border }]}>
              <View style={styles.clubHubJoinRow}>
                <View style={[styles.clubInviteInput, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                  <Ionicons name="key-outline" size={16} color={palette.muted} />
                  <TextInput
                    value={clubInviteCode}
                    onChangeText={setClubInviteCode}
                    placeholder="Have an invite code?"
                    placeholderTextColor={palette.muted}
                    autoCapitalize="characters"
                    style={[styles.clubInviteText, { color: palette.text }]}
                  />
                </View>
                <Pressable
                  onPress={handleJoinClub}
                  disabled={!clubInviteCode.trim()}
                  style={({ pressed }) => [
                    styles.clubJoinButton,
                    { backgroundColor: clubInviteCode.trim() ? palette.success : palette.border, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Ionicons name="arrow-forward" size={18} color={clubInviteCode.trim() ? palette.surface : palette.muted} />
                </Pressable>
              </View>
            </View>
          </SurfaceCard>
        </Animated.View>

        {/* Review Prompt for Completed Sessions */}
        {completedSessions.length > 0 && (
          <Animated.View entering={FadeInDown.springify()} style={styles.reviewSection}>
            {completedSessions.map((session, index) => {
              const sessionDate = new Date(session.scheduledAt);
              const isToday = sessionDate.toDateString() === new Date().toDateString();
              const timeStr = sessionDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
              const dateStr = isToday ? `Today ${timeStr}` : sessionDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ` ${timeStr}`;

              return (
                <Animated.View key={session.id} entering={FadeInDown.delay(index * 80).springify()}>
                  <SurfaceCard style={[styles.reviewCard, { borderLeftColor: palette.warning }]}>
                    <View style={styles.reviewCardContent}>
                      <View style={styles.reviewInfo}>
                        <ThemedText type="defaultSemiBold" style={styles.reviewTitle} numberOfLines={1}>
                          How was {session.athleteName ? `${session.athleteName}'s` : 'the'} session?
                        </ThemedText>
                        <ThemedText style={[styles.reviewMeta, { color: palette.muted }]} numberOfLines={1}>
                          with Coach {session.coachName || 'Coach'} -- {dateStr}
                        </ThemedText>
                      </View>
                      <View style={styles.reviewActions}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.rateButton,
                            { backgroundColor: palette.tint, opacity: pressed ? 0.8 : 1 },
                          ]}
                          onPress={() => {
                            logger.press('RateNow', { bookingId: session.id });
                            router.push({
                              pathname: '/review/create' as any,
                              params: { bookingId: session.id, coachId: session.coachId },
                            });
                          }}
                        >
                          <Ionicons name="star" size={14} color={palette.surface} />
                          <ThemedText style={[styles.rateButtonText, { color: palette.surface }]}>Rate Now</ThemedText>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [
                            styles.laterButton,
                            { borderColor: palette.border, opacity: pressed ? 0.7 : 1 },
                          ]}
                          onPress={() => dismissReview(session.id)}
                        >
                          <ThemedText style={[styles.laterButtonText, { color: palette.muted }]}>Later</ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  </SurfaceCard>
                </Animated.View>
              );
            })}
          </Animated.View>
        )}

        {/* Loading State for Invites */}
        {loadingInvites && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={palette.tint} />
          </View>
        )}

        {/* Error State for Invites */}
        {invitesError && !loadingInvites && (
          <View style={[styles.errorContainer, { backgroundColor: `${palette.error}10`, borderColor: palette.error }]}>
            <Ionicons name="alert-circle" size={16} color={palette.error} />
            <ThemedText style={[styles.errorText, { color: palette.error }]}>{invitesError}</ThemedText>
            <Clickable onPress={loadPendingInvites}>
              <ThemedText style={[styles.retryLink, { color: palette.tint }]}>Retry</ThemedText>
            </Clickable>
          </View>
        )}

        {/* Pending Session Invites */}
        {!loadingInvites && pendingInvites.length > 0 && (
          <Animated.View entering={FadeInDown.springify()} style={styles.pendingInvitesSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="mail" size={18} color={palette.warning} />
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Pending Invites ({pendingInvites.length})
                </ThemedText>
              </View>
              <Clickable onPress={() => router.push('/session-invites')}>
                <ThemedText style={[styles.viewAllLink, { color: palette.tint }]}>View All</ThemedText>
              </Clickable>
            </View>

            {pendingInvites.map((invite, index) => {
              const coachFirstName = invite.coachName.split(' ')[0];
              const athleteDisplay = invite.athleteNames.length === 1
                ? invite.athleteNames[0]
                : `${invite.athleteNames.length} athletes`;
              const message = invite.clubName
                ? `Coach ${coachFirstName} invited ${athleteDisplay} to ${invite.clubName}`
                : `Coach ${coachFirstName} invited ${athleteDisplay} to ${invite.sessionType.toLowerCase()}`;

              return (
                <Clickable
                  key={invite.id}
                  onPress={() => router.push({ pathname: '/session-invites/[id]', params: { id: invite.id } })}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
                    <SurfaceCard style={[styles.inviteCard, { borderLeftColor: palette.warning }]}>
                      <View style={styles.inviteCardContent}>
                        <View style={[styles.inviteAvatar, { backgroundColor: `${palette.tint}10` }]}>
                          <ThemedText style={[styles.inviteAvatarText, { color: palette.tint }]}>
                            {invite.coachName.split(' ').map((n) => n[0]).join('')}
                          </ThemedText>
                        </View>
                        <View style={styles.inviteInfo}>
                          <ThemedText type="defaultSemiBold" numberOfLines={2} style={styles.inviteMessage}>
                            {message}
                          </ThemedText>
                          <View style={styles.inviteMeta}>
                            <View style={styles.metaItem}>
                              <Ionicons name="calendar-outline" size={12} color={palette.muted} />
                              <ThemedText style={[styles.inviteMetaText, { color: palette.muted }]}>
                                {invite.proposedSlots[0]
                                  ? new Date(invite.proposedSlots[0].date).toLocaleDateString('en-GB', {
                                      weekday: 'short',
                                      day: 'numeric',
                                      month: 'short',
                                    })
                                  : 'View times'}
                              </ThemedText>
                            </View>
                            <View style={[styles.expiryBadge, { backgroundColor: `${palette.warning}15` }]}>
                              <Ionicons name="time-outline" size={10} color={palette.warning} />
                              <ThemedText style={[styles.expiryText, { color: palette.warning }]}>
                                Respond soon
                              </ThemedText>
                            </View>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={palette.muted} />
                      </View>
                    </SurfaceCard>
                  </Animated.View>
                </Clickable>
              );
            })}
          </Animated.View>
        )}

        {/* Content */}
        {children.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              No children added
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              Add your children to start discovering coaches
            </ThemedText>
          </View>
        ) : !postcode || postcode.length < 3 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={48} color={palette.icon} style={{ opacity: 0.3 }} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Find expert coaches
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              Enter postcode to discover coaches for {selectedChild?.name}
            </ThemedText>
          </View>
        ) : nearbyCoaches.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={48} color={palette.icon} style={{ opacity: 0.3 }} />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              No coaches nearby
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              Try a different postcode
            </ThemedText>
          </View>
        ) : (
          <View style={styles.coachList}>
            <ThemedText style={[styles.resultsText, { color: palette.muted }]}>
              {nearbyCoaches.length} {nearbyCoaches.length === 1 ? 'coach' : 'coaches'} near {postcode}
            </ThemedText>

            {nearbyCoaches.map((coach) => (
              <Clickable
                key={coach.id}
                onPress={() => {
                  logger.press('CoachCard', { coachId: coach.id, selectedChildId });
                  router.push({
                    pathname: '/book-coach',
                    params: { coachId: coach.id, selectedChildId },
                  });
                }}
                style={({ pressed }) => [
                  styles.coachCard,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <SurfaceCard style={styles.cardContent}>
                  <View style={styles.coachHeader}>
                    <View style={[styles.avatar, { backgroundColor: palette.tint + '15' }]}>
                      <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                        {coach.avatar || coach.name.charAt(0)}
                      </ThemedText>
                    </View>
                    <View style={styles.coachInfo}>
                      <ThemedText type="defaultSemiBold" style={styles.coachName} numberOfLines={1}>
                        {coach.name}
                      </ThemedText>
                      <View style={styles.coachMeta}>
                        <View style={styles.metaItem}>
                          <Ionicons name="location" size={13} color={palette.muted} />
                          <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                            {coach.distance.toFixed(1)}mi
                          </ThemedText>
                        </View>
                        <View style={styles.metaItem}>
                          <Ionicons name="star" size={13} color={palette.warning} />
                          <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                            {coach.profile.rating?.toFixed(1) || '5.0'}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                    <View style={styles.priceInfo}>
                      <ThemedText style={[styles.price, { color: palette.text }]}>
                        {formatGBP(coach.profile.sessionRate || 120)}
                      </ThemedText>
                      <ThemedText style={[styles.priceLabel, { color: palette.muted }]}>
                        per session
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={palette.muted} />
                  </View>
                  {/* Next Available Slot */}
                  <View style={[styles.nextAvailable, { backgroundColor: palette.tint + '10' }]}>
                    <Ionicons name="time-outline" size={14} color={palette.tint} />
                    <ThemedText style={[styles.nextAvailableText, { color: palette.tint }]}>
                      {formatNextAvailable(nextAvailableSlots[coach.id])}
                    </ThemedText>
                  </View>
                  {coach.profile.specialties && coach.profile.specialties.length > 0 && (
                    <View style={styles.focuses}>
                      {coach.profile.specialties.slice(0, 3).map((focus: string, index: number) => (
                        <View
                          key={index}
                          style={[styles.focusPill, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                          <ThemedText style={[styles.focusText, { color: palette.secondary }]}>
                            {focus}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                </SurfaceCard>
              </Clickable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: Spacing['2xl'],
  },
  stickyHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  header: {
    gap: Spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  loadingContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
  },
  retryLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  singleChild: {
    marginTop: 2,
  },
  childTabs: {
    marginTop: Spacing.xs,
    marginHorizontal: -Spacing.lg,
  },
  tabsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  childTab: {
    paddingBottom: Spacing.sm,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 15,
    letterSpacing: 0.2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },
  emptyState: {
    paddingTop: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: Spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  coachList: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingTop: Spacing.md,
  },
  resultsText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coachCard: {
    // No styles needed
  },
  cardContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
  },
  coachInfo: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  coachName: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  coachMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  focuses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  focusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  focusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  nextAvailable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  nextAvailableText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Pending Invites Section
  pendingInvitesSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 15,
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: '600',
  },
  inviteCard: {
    padding: Spacing.md,
    borderLeftWidth: 3,
  },
  inviteCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  inviteAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteAvatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  inviteInfo: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  inviteMessage: {
    fontSize: 14,
    lineHeight: 18,
  },
  inviteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  inviteMetaText: {
    fontSize: 12,
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  expiryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  // Club Hub Section
  clubHubSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  clubHubCard: {
    gap: Spacing.md,
  },
  clubHubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  clubHubIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubHubViewButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  clubHubList: {
    gap: Spacing.sm,
  },
  clubHubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  clubHubItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubHubItemIconText: {
    color: Colors.light.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  clubHubJoinSection: {
    borderTopWidth: 1,
    paddingTop: Spacing.md,
  },
  clubHubJoinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  clubInviteInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  clubInviteText: {
    flex: 1,
    fontSize: 14,
  },
  clubJoinButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Review prompt styles
  reviewSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  reviewCard: {
    padding: Spacing.md,
    borderLeftWidth: 3,
  },
  reviewCardContent: {
    gap: Spacing.sm,
  },
  reviewInfo: {
    gap: Spacing.xs / 2,
  },
  reviewTitle: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  reviewMeta: {
    fontSize: 13,
  },
  reviewActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  rateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  laterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  laterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
