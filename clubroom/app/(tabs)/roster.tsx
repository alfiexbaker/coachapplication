import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, StyleSheet, TextInput, ScrollView, ActionSheetIOS, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { PageContainer } from '@/components/primitives/page-container';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Chip } from '@/components/primitives/chip';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { AthleteRow } from '@/components/roster/athlete-row';
import { RemovalConfirmationModal } from '@/components/roster/removal-confirmation-modal';
import { useToast } from '@/components/ui/toast';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { rosterService, type RemovalReason, type AthleteRemovalRecord } from '@/services/roster-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import type { RosterEntry } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('RosterScreen');

type StatusFilter = 'ALL' | RosterEntry['status'];
type SelectionMode = 'none' | 'selecting';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AthleteCard({
  entry,
  index,
  onPress,
}: {
  entry: RosterEntry;
  index: number;
  onPress: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const statusColor = rosterService.getStatusColor(entry.status);
  const initials = entry.athleteName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <SurfaceCard style={styles.athleteCard} onPress={onPress}>
        <View style={styles.cardRow}>
          <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
            {entry.athletePhotoUrl ? (
              <View style={styles.avatarPlaceholder}>
                <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                  {initials}
                </ThemedText>
              </View>
            ) : (
              <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                {initials}
              </ThemedText>
            )}
          </View>

          <View style={styles.cardContent}>
            <View style={styles.nameRow}>
              <ThemedText type="defaultSemiBold" style={styles.athleteName}>
                {entry.athleteName}
              </ThemedText>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            </View>

            <ThemedText style={[styles.metaText, { color: palette.muted }]}>
              {entry.athleteAge ? `Age ${entry.athleteAge}` : ''}{' '}
              {entry.primaryFocus ? `· ${entry.primaryFocus}` : ''}
            </ThemedText>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <ThemedText style={[styles.statValue, { color: palette.text }]}>
                  {entry.totalSessions}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                  sessions
                </ThemedText>
              </View>
              <View style={styles.stat}>
                <ThemedText style={[styles.statValue, { color: palette.text }]}>
                  {entry.averageRating.toFixed(1)}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                  avg rating
                </ThemedText>
              </View>
              {entry.lastSessionDate && (
                <View style={styles.stat}>
                  <ThemedText style={[styles.statValue, { color: palette.text }]}>
                    {new Date(entry.lastSessionDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </ThemedText>
                  <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                    last session
                  </ThemedText>
                </View>
              )}
            </View>

            {entry.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {entry.tags.slice(0, 3).map((tag) => (
                  <View
                    key={tag}
                    style={[styles.tag, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
                  >
                    <ThemedText style={[styles.tagText, { color: palette.tint }]}>
                      {tag}
                    </ThemedText>
                  </View>
                ))}
                {entry.tags.length > 3 && (
                  <ThemedText style={[styles.moreTag, { color: palette.muted }]}>
                    +{entry.tags.length - 3}
                  </ThemedText>
                )}
              </View>
            )}
          </View>

          <Ionicons name="chevron-forward" size={20} color={palette.muted} />
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

export default function RosterScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const { showUndoToast, showToast } = useToast();

  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [, setLoading] = useState(true);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('none');
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());

  // Removal state
  const [selectedAthleteForRemoval, setSelectedAthleteForRemoval] = useState<RosterEntry | null>(null);
  const [showRemovalModal, setShowRemovalModal] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const lastRemovalRef = useRef<AthleteRemovalRecord | null>(null);

  const coachId = currentUser?.id || 'coach_1';

  // Selection handlers
  const toggleSelectionMode = useCallback(() => {
    if (selectionMode === 'none') {
      setSelectionMode('selecting');
    } else {
      setSelectionMode('none');
      setSelectedAthletes(new Set());
    }
  }, [selectionMode]);

  const toggleAthleteSelection = useCallback((athleteId: string) => {
    setSelectedAthletes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(athleteId)) {
        newSet.delete(athleteId);
      } else {
        newSet.add(athleteId);
      }
      return newSet;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    // We'll use roster here and apply same filters
    let filtered = roster;
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.athleteName.toLowerCase().includes(searchLower) ||
          r.parentName.toLowerCase().includes(searchLower) ||
          r.tags.some((t) => t.toLowerCase().includes(searchLower))
      );
    }
    const allIds = filtered.map((r) => r.athleteId);
    setSelectedAthletes(new Set(allIds));
  }, [roster, statusFilter, search]);

  const clearSelection = useCallback(() => {
    setSelectedAthletes(new Set());
  }, []);

  const handleInviteSelected = useCallback(() => {
    if (selectedAthletes.size === 0) {
      showToast('Please select at least one athlete', 'error');
      return;
    }
    // Navigate to group invite screen with pre-selected athletes
    const selectedIds = Array.from(selectedAthletes);
    router.push(Routes.SESSION_INVITES_GROUP);
    // Reset selection
    setSelectionMode('none');
    setSelectedAthletes(new Set());
  }, [selectedAthletes, showToast]);

  const handleQuickInviteAll = useCallback(() => {
    // Filter for active athletes only
    const activeAthletes = roster.filter((r) => r.status === 'ACTIVE');
    if (activeAthletes.length === 0) {
      showToast('No active athletes to invite', 'error');
      return;
    }
    Alert.alert(
      'Invite Entire Roster',
      `Send session invites to all ${activeAthletes.length} active athletes?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            const activeIds = activeAthletes.map((a) => a.athleteId);
            router.push(Routes.SESSION_INVITES_GROUP);
          },
        },
      ]
    );
  }, [roster, showToast]);

  const loadRoster = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const data = await rosterService.getRoster(currentUser.id);
      setRoster(data);
    } catch (error) {
      logger.error('Failed to load roster:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  // Refresh roster when relevant events fire — new bookings can add athletes,
  // completed sessions update stats, and confirmed bookings change status.
  useEffect(() => {
    const unsubBookingCreated = onTyped(ServiceEvents.BOOKING_CREATED, () => {
      loadRoster();
    });
    const unsubSessionCompleted = onTyped(ServiceEvents.SESSION_COMPLETED, () => {
      loadRoster();
    });
    const unsubBookingConfirmed = onTyped(ServiceEvents.BOOKING_CONFIRMED, () => {
      loadRoster();
    });
    return () => {
      unsubBookingCreated();
      unsubSessionCompleted();
      unsubBookingConfirmed();
    };
  }, [loadRoster]);

  const handleRemoveAthlete = (entry: RosterEntry) => {
    setSelectedAthleteForRemoval(entry);
    setShowRemovalModal(true);
  };

  const handleLongPress = (entry: RosterEntry) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'View Details', 'Remove from Roster'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
          title: entry.athleteName,
          message: `${entry.totalSessions} sessions | ${rosterService.formatStatus(entry.status)}`,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            router.push(Routes.rosterAthlete(entry.athleteId));
          } else if (buttonIndex === 2) {
            handleRemoveAthlete(entry);
          }
        }
      );
    } else {
      Alert.alert(
        entry.athleteName,
        `${entry.totalSessions} sessions | ${rosterService.formatStatus(entry.status)}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'View Details',
            onPress: () => {
              router.push(Routes.rosterAthlete(entry.athleteId));
            },
          },
          {
            text: 'Remove from Roster',
            style: 'destructive',
            onPress: () => handleRemoveAthlete(entry),
          },
        ]
      );
    }
  };

  const handleConfirmRemoval = async (reason: RemovalReason, customReason?: string, archive?: boolean) => {
    if (!selectedAthleteForRemoval) return;

    setIsRemoving(true);
    try {
      const result = await rosterService.removeAthlete(
        coachId,
        selectedAthleteForRemoval.athleteId,
        reason,
        { customReason, archive }
      );

      if (!result.success) {
        showToast(result.error.message, 'error');
        return;
      }

      const removalRecord = result.data;
      lastRemovalRef.current = removalRecord;
      setShowRemovalModal(false);
      setSelectedAthleteForRemoval(null);

      // Reload roster
      await loadRoster();

      // Show undo toast
      showUndoToast(
        `${removalRecord.athleteName} removed from roster`,
        async () => {
          try {
            await rosterService.undoRemoval(coachId, removalRecord.id);
            await loadRoster();
            showToast('Athlete restored', 'success');
          } catch (error) {
            logger.error('Failed to undo removal:', error);
            showToast('Failed to restore athlete', 'error');
          }
        }
      );
    } catch (error) {
      logger.error('Failed to remove athlete:', error);
      showToast('Failed to remove athlete', 'error');
    } finally {
      setIsRemoving(false);
    }
  };

  const filteredRoster = useMemo(() => {
    let filtered = roster;

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.athleteName.toLowerCase().includes(searchLower) ||
          r.parentName.toLowerCase().includes(searchLower) ||
          r.tags.some((t) => t.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }, [roster, statusFilter, search]);

  const stats = useMemo(() => {
    return {
      total: roster.length,
      active: roster.filter((r) => r.status === 'ACTIVE').length,
      paused: roster.filter((r) => r.status === 'PAUSED').length,
      graduated: roster.filter((r) => r.status === 'GRADUATED').length,
    };
  }, [roster]);

  const statusFilters: { label: string; value: StatusFilter }[] = [
    { label: `All (${stats.total})`, value: 'ALL' },
    { label: `Active (${stats.active})`, value: 'ACTIVE' },
    { label: `Paused (${stats.paused})`, value: 'PAUSED' },
    { label: `Graduated (${stats.graduated})`, value: 'GRADUATED' },
  ];

  const handleAthletePress = (entry: RosterEntry) => {
    router.push(Routes.rosterAthlete(entry.athleteId));
  };

  if (!currentUser) return null;

  return (
    <PageContainer
      header={
        <ScreenHeader
          title="Roster"
          subtitle="Your athletes"
          rightElement={
            <View style={styles.headerActions}>
              <Clickable onPress={toggleSelectionMode} hitSlop={8}>
                <Ionicons
                  name={selectionMode === 'selecting' ? 'close' : 'checkbox-outline'}
                  size={24}
                  color={selectionMode === 'selecting' ? palette.error : palette.text}
                />
              </Clickable>
              <Clickable onPress={() => router.push(Routes.SESSION_INVITES_GROUP)} hitSlop={8}>
                <Ionicons name="mail-outline" size={24} color={palette.text} />
              </Clickable>
            </View>
          }
        />
      }
      gap={Spacing.md}
    >
      {/* Selection Mode Bar */}
      {selectionMode === 'selecting' && (
        <Animated.View
          entering={FadeInUp.springify()}
          style={[styles.selectionBar, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
        >
          <View style={styles.selectionInfo}>
            <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
              {selectedAthletes.size} selected
            </ThemedText>
          </View>
          <View style={styles.selectionActions}>
            <Clickable onPress={selectAllVisible} style={styles.selectionButton}>
              <ThemedText style={{ color: palette.tint, ...Typography.small }}>Select All</ThemedText>
            </Clickable>
            <Clickable onPress={clearSelection} style={styles.selectionButton}>
              <ThemedText style={{ color: palette.tint, ...Typography.small }}>Clear</ThemedText>
            </Clickable>
          </View>
        </Animated.View>
      )}

      {/* Quick Actions */}
      {selectionMode === 'none' && stats.active > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.quickActions}>
            <Clickable
              onPress={() => router.push(Routes.SESSION_INVITES_GROUP)}
              style={[styles.quickActionButton, { backgroundColor: palette.tint }]}
            >
              <Ionicons name="people" size={16} color={Colors.light.onPrimary} />
              <ThemedText style={{ color: Colors.light.onPrimary, ...Typography.smallSemiBold }}>
                Group Invite
              </ThemedText>
            </Clickable>
            <Clickable
              onPress={handleQuickInviteAll}
              style={[styles.quickActionButton, { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 }]}
            >
              <Ionicons name="mail" size={16} color={palette.tint} />
              <ThemedText style={{ color: palette.text, ...Typography.small }}>
                Invite All Active ({stats.active})
              </ThemedText>
            </Clickable>
          </View>
        </ScrollView>
      )}

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: palette.surface }]}>
        <Ionicons name="search" size={20} color={palette.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search athletes or tags"
          placeholderTextColor={palette.muted}
          style={[styles.searchInput, { color: palette.text }]}
        />
        {search ? (
          <Clickable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={palette.muted} />
          </Clickable>
        ) : null}
      </View>

      {/* Status Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {statusFilters.map((filter) => (
          <Chip
            key={filter.value}
            label={filter.label}
            selected={statusFilter === filter.value}
            onPress={() => setStatusFilter(filter.value)}
          />
        ))}
      </ScrollView>

      {/* Roster List */}
      {filteredRoster.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title={search ? 'No matches found' : 'No athletes yet'}
          message={
            search
              ? 'Try a different search term'
              : 'Athletes will appear here after they book sessions with you'
          }
        />
      ) : (
        <GestureHandlerRootView style={styles.list}>
          {filteredRoster.map((entry, index) => (
            <Animated.View key={entry.id} entering={FadeInDown.delay(index * 40).springify()}>
              <View style={styles.athleteRowContainer}>
                {selectionMode === 'selecting' && (
                  <Clickable
                    onPress={() => toggleAthleteSelection(entry.athleteId)}
                    style={styles.checkboxContainer}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: selectedAthletes.has(entry.athleteId)
                            ? palette.tint
                            : 'transparent',
                          borderColor: selectedAthletes.has(entry.athleteId)
                            ? palette.tint
                            : palette.border,
                        },
                      ]}
                    >
                      {selectedAthletes.has(entry.athleteId) && (
                        <Ionicons name="checkmark" size={14} color={Colors.light.onPrimary} />
                      )}
                    </View>
                  </Clickable>
                )}
                <View style={{ flex: 1 }}>
                  <AthleteRow
                    entry={entry}
                    onPress={
                      selectionMode === 'selecting'
                        ? () => toggleAthleteSelection(entry.athleteId)
                        : () => handleAthletePress(entry)
                    }
                    onRemove={() => handleRemoveAthlete(entry)}
                    onLongPress={
                      selectionMode === 'none' ? () => handleLongPress(entry) : undefined
                    }
                    swipeEnabled={selectionMode === 'none'}
                  />
                </View>
              </View>
            </Animated.View>
          ))}
        </GestureHandlerRootView>
      )}

      {/* Floating Action Button for Inviting Selected */}
      {selectionMode === 'selecting' && selectedAthletes.size > 0 && (
        <Animated.View
          entering={FadeInUp.springify()}
          style={[styles.floatingAction, { backgroundColor: palette.tint }]}
        >
          <Clickable onPress={handleInviteSelected} style={styles.floatingActionButton}>
            <Ionicons name="mail" size={20} color={Colors.light.onPrimary} />
            <ThemedText style={{ color: Colors.light.onPrimary, fontWeight: '700' }}>
              Invite {selectedAthletes.size} Athlete{selectedAthletes.size !== 1 ? 's' : ''}
            </ThemedText>
          </Clickable>
        </Animated.View>
      )}

      {/* Removal Confirmation Modal */}
      <RemovalConfirmationModal
        visible={showRemovalModal}
        onClose={() => {
          setShowRemovalModal(false);
          setSelectedAthleteForRemoval(null);
        }}
        onConfirm={(reason, customReason, archive) => handleConfirmRemoval(reason as RemovalReason, customReason, archive)}
        type="athlete"
        name={selectedAthleteForRemoval?.athleteName || ''}
        isLoading={isRemoving}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
  },
  filtersRow: {
    gap: Spacing.xs,
    paddingRight: Spacing.lg,
  },
  list: {
    gap: Spacing.sm,
  },
  athleteCard: {
    padding: Spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.heading,
  },
  cardContent: {
    flex: 1,
    gap: Spacing.xxs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  athleteName: {
    ...Typography.subheading,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  metaText: {
    ...Typography.small,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.xxs,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xxs,
  },
  statValue: {
    ...Typography.bodySmallSemiBold,
  },
  statLabel: {
    ...Typography.caption,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xxs,
    marginTop: Spacing.xxs,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  tagText: {
    ...Typography.caption,
  },
  moreTag: {
    ...Typography.caption,
    paddingVertical: Spacing.micro,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  selectionButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingRight: Spacing.lg,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  athleteRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    paddingRight: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingAction: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    borderRadius: Radii.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
});
