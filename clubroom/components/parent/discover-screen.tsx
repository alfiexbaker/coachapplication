import { useState, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
} from '@/constants/mock-data';
import { availabilityService } from '@/services/availability-service';
import { createLogger } from '@/utils/logger';
import type { AvailabilitySlot } from '@/constants/types';

const logger = createLogger('ParentDiscoverScreen');

// Cache for next available slots to avoid repeated API calls
const nextAvailableCache: Record<string, { slot: AvailabilitySlot | null; timestamp: number }> = {};

export function ParentDiscoverScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const [postcode, setPostcode] = useState('');
  const [nextAvailableSlots, setNextAvailableSlots] = useState<Record<string, AvailabilitySlot | null>>({});

  if (!currentUser) return null;

  const children = getChildrenForParent(currentUser.id);
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id);

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
                      <ThemedText type="defaultSemiBold" style={styles.coachName}>
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
                          <Ionicons name="star" size={13} color="#f59e0b" />
                          <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                            {coach.rating?.toFixed(1) || '5.0'}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                    <View style={styles.priceInfo}>
                      <ThemedText style={[styles.price, { color: palette.text }]}>
                        {formatGBP(coach.priceRange?.minUsd || 120)}
                      </ThemedText>
                      <ThemedText style={[styles.priceLabel, { color: palette.muted }]}>
                        per session
                      </ThemedText>
                    </View>
                  </View>
                  {/* Next Available Slot */}
                  <View style={[styles.nextAvailable, { backgroundColor: palette.tint + '10' }]}>
                    <Ionicons name="time-outline" size={14} color={palette.tint} />
                    <ThemedText style={[styles.nextAvailableText, { color: palette.tint }]}>
                      {formatNextAvailable(nextAvailableSlots[coach.id])}
                    </ThemedText>
                  </View>
                  {coach.footballFocuses && coach.footballFocuses.length > 0 && (
                    <View style={styles.focuses}>
                      {coach.footballFocuses.slice(0, 3).map((focus, index) => (
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
    gap: 4,
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
    gap: 4,
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
    paddingVertical: 4,
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
});
