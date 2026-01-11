import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ParticipantCard } from '@/components/group/participant-card';
import { AddAttendeeModal } from '@/components/group/add-attendee-modal';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { groupSessionService } from '@/services/group-session-service';
import type { GroupSession, GroupRegistration } from '@/constants/types';

type FilterType = 'all' | 'registered' | 'waitlisted' | 'attended' | 'noshow';

// TODO: Replace with actual coach ID from auth context
const CURRENT_COACH_ID = 'coach_1';

export default function SessionRosterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [session, setSession] = useState<GroupSession | null>(null);
  const [roster, setRoster] = useState<GroupRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Add attendee modal
  const [showAddModal, setShowAddModal] = useState(false);

  // Feedback status tracking
  const [feedbackStatus, setFeedbackStatus] = useState<{
    total: number;
    completed: number;
    pending: number;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [sessionData, rosterData, feedbackData] = await Promise.all([
        groupSessionService.getSession(id),
        groupSessionService.getSessionRoster(id),
        groupSessionService.getFeedbackCompletionStatus(id),
      ]);
      setSession(sessionData);
      setRoster(rosterData);
      setFeedbackStatus({
        total: feedbackData.total,
        completed: feedbackData.completed,
        pending: feedbackData.pending,
      });
    } catch (error) {
      console.error('Failed to load roster:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (registration: GroupRegistration, attended: boolean) => {
    if (!session) return;

    const date = session.schedule[0]?.date;
    if (!date) return;

    try {
      await groupSessionService.markAttendance(registration.id, date, attended);
      await loadData();
    } catch (error) {
      console.error('Failed to mark attendance:', error);
      Alert.alert('Error', 'Failed to update attendance.');
    }
  };

  const handleCancelRegistration = async (registration: GroupRegistration) => {
    Alert.alert(
      'Cancel Registration',
      `Remove ${registration.athleteName} from this session?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupSessionService.cancelRegistration(registration.id);
              await loadData();
            } catch (error) {
              console.error('Failed to cancel registration:', error);
            }
          },
        },
      ]
    );
  };

  // Selection mode handlers
  const enterSelectionMode = useCallback((initialId?: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    setSelectionMode(true);
    if (initialId) {
      setSelectedIds(new Set([initialId]));
    }
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelection = useCallback((regId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(regId)) {
        next.delete(regId);
      } else {
        next.add(regId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    const allIds = filteredRoster
      .filter((r) => r.status !== 'WAITLISTED')
      .map((r) => r.id);
    setSelectedIds(new Set(allIds));
  }, [roster, filter]);

  // Bulk attendance actions
  const handleBulkMarkAttendance = async (attended: boolean) => {
    if (!session || selectedIds.size === 0) return;

    const date = session.schedule[0]?.date;
    if (!date) return;

    try {
      await groupSessionService.markBulkAttendance(
        session.id,
        Array.from(selectedIds),
        attended,
        date
      );
      exitSelectionMode();
      await loadData();
    } catch (error) {
      console.error('Failed to bulk mark attendance:', error);
      Alert.alert('Error', 'Failed to update attendance.');
    }
  };

  const handleMarkAllPresent = async () => {
    if (!session) return;

    const date = session.schedule[0]?.date;
    if (!date) return;

    // Get all registered (non-waitlisted) attendees
    const allIds = roster
      .filter((r) => r.status === 'REGISTERED' || r.status === 'NO_SHOW')
      .map((r) => r.id);

    if (allIds.length === 0) {
      Alert.alert('No Attendees', 'There are no registered attendees to mark present.');
      return;
    }

    Alert.alert(
      'Mark All Present',
      `Mark all ${allIds.length} registered attendees as present?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Present',
          onPress: async () => {
            try {
              await groupSessionService.markBulkAttendance(session.id, allIds, true, date);
              await loadData();
            } catch (error) {
              console.error('Failed to mark all present:', error);
              Alert.alert('Error', 'Failed to update attendance.');
            }
          },
        },
      ]
    );
  };

  const handleMarkAllAbsent = async () => {
    if (!session) return;

    const date = session.schedule[0]?.date;
    if (!date) return;

    // Get all attended members
    const attendedIds = roster.filter((r) => r.status === 'ATTENDED').map((r) => r.id);

    if (attendedIds.length === 0) {
      Alert.alert('No Attendees', 'There are no attended members to mark absent.');
      return;
    }

    Alert.alert(
      'Mark All Absent',
      `Reset attendance for ${attendedIds.length} attendees?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await groupSessionService.markBulkAttendance(session.id, attendedIds, false, date);
              await loadData();
            } catch (error) {
              console.error('Failed to reset attendance:', error);
              Alert.alert('Error', 'Failed to update attendance.');
            }
          },
        },
      ]
    );
  };

  // Add attendee handler
  const handleAddAttendee = async (attendee: {
    athleteId?: string;
    athleteName: string;
    parentId?: string;
    parentName?: string;
    isWalkIn: boolean;
    overrideCapacity?: boolean;
  }) => {
    if (!session) return;

    await groupSessionService.addAttendee(session.id, attendee);
    await loadData();
  };

  // Mark no-shows (after session ends)
  const handleMarkNoShows = async () => {
    if (!session) return;

    const date = session.schedule[0]?.date;
    if (!date) return;

    Alert.alert(
      'Mark No-Shows',
      'This will mark all registered (not yet attended) participants as no-shows. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark No-Shows',
          style: 'destructive',
          onPress: async () => {
            try {
              const count = await groupSessionService.autoMarkNoShows(session.id, date);
              Alert.alert('Done', `${count} participant(s) marked as no-show.`);
              await loadData();
            } catch (error) {
              console.error('Failed to mark no-shows:', error);
              Alert.alert('Error', 'Failed to mark no-shows.');
            }
          },
        },
      ]
    );
  };

  const filteredRoster = roster.filter((r) => {
    switch (filter) {
      case 'registered':
        return r.status === 'REGISTERED';
      case 'waitlisted':
        return r.status === 'WAITLISTED';
      case 'attended':
        return r.status === 'ATTENDED';
      case 'noshow':
        return r.status === 'NO_SHOW';
      default:
        return true;
    }
  });

  const registeredCount = roster.filter((r) => r.status === 'REGISTERED').length;
  const waitlistedCount = roster.filter((r) => r.status === 'WAITLISTED').length;
  const attendedCount = roster.filter((r) => r.status === 'ATTENDED').length;
  const noShowCount = roster.filter((r) => r.status === 'NO_SHOW').length;

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: roster.length },
    { key: 'registered', label: 'Pending', count: registeredCount },
    { key: 'attended', label: 'Attended', count: attendedCount },
    { key: 'noshow', label: 'No Show', count: noShowCount },
    { key: 'waitlisted', label: 'Waitlist', count: waitlistedCount },
  ];

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title">Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header - Normal or Selection Mode */}
      {selectionMode ? (
        <View style={[styles.header, styles.selectionHeader, { backgroundColor: palette.tint }]}>
          <Clickable onPress={exitSelectionMode} hitSlop={8}>
            <Ionicons name="close" size={24} color="#fff" />
          </Clickable>
          <ThemedText type="title" style={styles.selectionTitle}>
            {selectedIds.size} selected
          </ThemedText>
          <View style={styles.selectionActions}>
            <Clickable onPress={selectAll} hitSlop={8} style={styles.selectionActionBtn}>
              <ThemedText style={styles.selectionActionText}>All</ThemedText>
            </Clickable>
          </View>
        </View>
      ) : (
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <View style={styles.headerTitle}>
            <ThemedText type="title">Roster</ThemedText>
            <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
              {session?.title}
            </ThemedText>
          </View>
          <Clickable onPress={() => setShowAddModal(true)} hitSlop={8} style={[styles.addButton, { backgroundColor: palette.tint }]}>
            <Ionicons name="add" size={22} color="#fff" />
          </Clickable>
        </View>
      )}

      {/* Selection Mode Bulk Actions */}
      {selectionMode && selectedIds.size > 0 && (
        <View style={[styles.bulkActions, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
          <Clickable
            onPress={() => handleBulkMarkAttendance(true)}
            style={[styles.bulkActionButton, { backgroundColor: palette.success }]}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <ThemedText style={styles.bulkActionText}>Present</ThemedText>
          </Clickable>
          <Clickable
            onPress={() => handleBulkMarkAttendance(false)}
            style={[styles.bulkActionButton, { backgroundColor: palette.error }]}
          >
            <Ionicons name="close-circle" size={18} color="#fff" />
            <ThemedText style={styles.bulkActionText}>Absent</ThemedText>
          </Clickable>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
          <ThemedText type="title" style={[styles.statValue, { color: palette.success }]}>
            {attendedCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Attended</ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
          <ThemedText type="title" style={[styles.statValue, { color: palette.error }]}>
            {noShowCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>No Show</ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
          <ThemedText type="title" style={[styles.statValue, { color: palette.tint }]}>
            {(session?.currentParticipants || 0)}/{session?.maxParticipants || 0}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Capacity</ThemedText>
        </View>
      </View>

      {/* Quick Actions Bar */}
      {!selectionMode && roster.length > 0 && (
        <View style={styles.quickActionsBar}>
          <Clickable
            onPress={handleMarkAllPresent}
            style={[styles.quickAction, { backgroundColor: `${palette.success}15`, borderColor: palette.success }]}
          >
            <Ionicons name="checkmark-done" size={16} color={palette.success} />
            <ThemedText style={[styles.quickActionText, { color: palette.success }]}>
              All Present
            </ThemedText>
          </Clickable>
          <Clickable
            onPress={handleMarkAllAbsent}
            style={[styles.quickAction, { backgroundColor: `${palette.error}15`, borderColor: palette.error }]}
          >
            <Ionicons name="refresh" size={16} color={palette.error} />
            <ThemedText style={[styles.quickActionText, { color: palette.error }]}>
              Reset
            </ThemedText>
          </Clickable>
          <Clickable
            onPress={handleMarkNoShows}
            style={[styles.quickAction, { backgroundColor: `${palette.warning}15`, borderColor: palette.warning }]}
          >
            <Ionicons name="alert-circle" size={16} color={palette.warning} />
            <ThemedText style={[styles.quickActionText, { color: palette.warning }]}>
              No-Shows
            </ThemedText>
          </Clickable>
        </View>
      )}

      {/* Feedback Card - Show when there are attended athletes */}
      {attendedCount > 0 && (
        <View style={[styles.feedbackCard, { backgroundColor: `${palette.tint}08`, borderColor: palette.border }]}>
          <View style={styles.feedbackInfo}>
            <View style={styles.feedbackHeader}>
              <Ionicons name="clipboard-outline" size={20} color={palette.tint} />
              <ThemedText type="defaultSemiBold" style={{ color: palette.tint }}>
                Session Feedback
              </ThemedText>
            </View>
            {feedbackStatus && (
              <ThemedText style={[styles.feedbackSubtext, { color: palette.muted }]}>
                {feedbackStatus.completed === feedbackStatus.total
                  ? 'All feedback complete'
                  : `${feedbackStatus.completed} of ${feedbackStatus.total} reviewed`}
              </ThemedText>
            )}
          </View>
          <Button
            onPress={() => router.push(`/group-sessions/${id}/feedback`)}
            variant={feedbackStatus?.completed === feedbackStatus?.total ? 'secondary' : 'primary'}
          >
            {feedbackStatus?.completed === feedbackStatus?.total ? 'View/Edit' : 'Start Feedback'}
          </Button>
        </View>
      )}

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersScroll}
      >
        {filters.map((f) => (
          <Clickable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === f.key ? palette.tint : palette.surface,
                borderColor: filter === f.key ? palette.tint : palette.border,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.filterText,
                { color: filter === f.key ? '#fff' : palette.text },
              ]}
            >
              {f.label}
              {f.count !== undefined && f.count > 0 && ` (${f.count})`}
            </ThemedText>
          </Clickable>
        ))}
      </ScrollView>

      {/* Swipe Hint */}
      {!selectionMode && filteredRoster.length > 0 && (
        <View style={styles.swipeHint}>
          <Ionicons name="swap-horizontal" size={14} color={palette.muted} />
          <ThemedText style={[styles.swipeHintText, { color: palette.muted }]}>
            Swipe right = Present, Swipe left = Absent, Long press = Select
          </ThemedText>
        </View>
      )}

      {/* Roster List */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filteredRoster.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No participants"
            message={
              filter !== 'all'
                ? `No ${filter} participants yet`
                : 'No one has registered for this session yet'
            }
            actionLabel="Add Attendee"
            onPressAction={() => setShowAddModal(true)}
          />
        ) : (
          <View style={styles.list}>
            {filteredRoster.map((registration, index) => (
              <Animated.View key={registration.id} entering={FadeInDown.delay(index * 30).springify()}>
                <ParticipantCard
                  registration={registration}
                  onMarkAttendance={(attended) => handleMarkAttendance(registration, attended)}
                  onCancel={() => handleCancelRegistration(registration)}
                  selectionMode={selectionMode}
                  isSelected={selectedIds.has(registration.id)}
                  onSelect={() => toggleSelection(registration.id)}
                  onLongPress={() => enterSelectionMode(registration.id)}
                  enableSwipe={!selectionMode}
                />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Attendee Modal */}
      <AddAttendeeModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddAttendee}
        session={session}
        existingRegistrations={roster}
        coachId={CURRENT_COACH_ID}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Selection mode header
  selectionHeader: {
    justifyContent: 'space-between',
  },
  selectionTitle: {
    color: '#fff',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  selectionActionBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  selectionActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Bulk actions bar
  bulkActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  bulkActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  bulkActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Quick actions bar
  quickActionsBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  statValue: {
    fontSize: 20,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  filtersScroll: {
    flexGrow: 0,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  swipeHintText: {
    fontSize: 11,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  list: {
    gap: Spacing.sm,
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  feedbackInfo: {
    flex: 1,
    gap: 2,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  feedbackSubtext: {
    fontSize: 12,
    marginLeft: 24,
  },
});
