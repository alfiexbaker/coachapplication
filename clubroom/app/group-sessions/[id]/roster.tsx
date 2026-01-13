import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ParticipantCard } from '@/components/group/participant-card';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { groupSessionService } from '@/services/group-session-service';
import type { GroupSession, GroupRegistration } from '@/constants/types';

type FilterType = 'all' | 'registered' | 'waitlisted' | 'attended';
type AttendanceStatus = 'present' | 'absent' | 'late' | 'unmarked';

export default function SessionRosterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [session, setSession] = useState<GroupSession | null>(null);
  const [roster, setRoster] = useState<GroupRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showRollCall, setShowRollCall] = useState(false);
  const [rollCallAttendance, setRollCallAttendance] = useState<Record<string, AttendanceStatus>>({});

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [sessionData, rosterData] = await Promise.all([
        groupSessionService.getSession(id),
        groupSessionService.getSessionRoster(id),
      ]);
      setSession(sessionData);
      setRoster(rosterData);
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

  // Roll Call Functions
  const startRollCall = () => {
    // Initialize roll call attendance from current roster
    const initialAttendance: Record<string, AttendanceStatus> = {};
    roster
      .filter(r => r.status === 'REGISTERED' || r.status === 'ATTENDED')
      .forEach(r => {
        initialAttendance[r.id] = r.status === 'ATTENDED' ? 'present' : 'unmarked';
      });
    setRollCallAttendance(initialAttendance);
    setShowRollCall(true);
  };

  const markRollCallStatus = (registrationId: string, status: AttendanceStatus) => {
    setRollCallAttendance(prev => ({
      ...prev,
      [registrationId]: status,
    }));
  };

  const saveRollCall = async () => {
    if (!session) return;
    const date = session.schedule[0]?.date;
    if (!date) return;

    try {
      // Mark each participant's attendance
      for (const [registrationId, status] of Object.entries(rollCallAttendance)) {
        if (status === 'present' || status === 'late') {
          await groupSessionService.markAttendance(registrationId, date, true);
        } else if (status === 'absent') {
          await groupSessionService.markAttendance(registrationId, date, false);
        }
      }
      await loadData();
      setShowRollCall(false);
      Alert.alert('Success', 'Roll call saved successfully!');
    } catch (error) {
      console.error('Failed to save roll call:', error);
      Alert.alert('Error', 'Failed to save roll call. Please try again.');
    }
  };

  // Calculate roll call stats
  const rollCallStats = useMemo(() => {
    const entries = Object.entries(rollCallAttendance);
    return {
      total: entries.length,
      present: entries.filter(([, s]) => s === 'present').length,
      late: entries.filter(([, s]) => s === 'late').length,
      absent: entries.filter(([, s]) => s === 'absent').length,
      unmarked: entries.filter(([, s]) => s === 'unmarked').length,
    };
  }, [rollCallAttendance]);

  // Get registered participants for roll call
  const rollCallParticipants = roster.filter(r => r.status === 'REGISTERED' || r.status === 'ATTENDED');

  const filteredRoster = roster.filter((r) => {
    switch (filter) {
      case 'registered':
        return r.status === 'REGISTERED';
      case 'waitlisted':
        return r.status === 'WAITLISTED';
      case 'attended':
        return r.status === 'ATTENDED';
      default:
        return true;
    }
  });

  const registeredCount = roster.filter((r) => r.status === 'REGISTERED' || r.status === 'ATTENDED').length;
  const waitlistedCount = roster.filter((r) => r.status === 'WAITLISTED').length;

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: roster.length },
    { key: 'registered', label: 'Registered', count: registeredCount },
    { key: 'waitlisted', label: 'Waitlist', count: waitlistedCount },
    { key: 'attended', label: 'Attended' },
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
      {/* Header */}
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
        {registeredCount > 0 && (
          <TouchableOpacity
            style={[styles.rollCallButton, { backgroundColor: palette.success }]}
            onPress={startRollCall}
          >
            <Ionicons name="clipboard-outline" size={18} color="#fff" />
            <ThemedText style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Roll Call</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
          <ThemedText type="heading" style={{ color: palette.tint }}>
            {registeredCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Registered</ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
          <ThemedText type="heading" style={{ color: palette.warning }}>
            {waitlistedCount}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Waitlist</ThemedText>
        </View>
        <View style={[styles.statCard, { backgroundColor: palette.surface }]}>
          <ThemedText type="heading" style={{ color: palette.success }}>
            {session?.maxParticipants || 0}
          </ThemedText>
          <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Capacity</ThemedText>
        </View>
      </View>

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
              {f.count !== undefined && ` (${f.count})`}
            </ThemedText>
          </Clickable>
        ))}
      </ScrollView>

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
          />
        ) : (
          <View style={styles.list}>
            {filteredRoster.map((registration, index) => (
              <Animated.View key={registration.id} entering={FadeInDown.delay(index * 50).springify()}>
                <ParticipantCard
                  registration={registration}
                  onMarkAttendance={(attended) => handleMarkAttendance(registration, attended)}
                  onCancel={() => handleCancelRegistration(registration)}
                />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Roll Call Modal */}
      <Modal
        visible={showRollCall}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRollCall(false)}
      >
        <SafeAreaView style={[styles.rollCallContainer, { backgroundColor: palette.background }]} edges={['top']}>
          {/* Roll Call Header */}
          <View style={[styles.rollCallHeader, { borderBottomColor: palette.border }]}>
            <TouchableOpacity onPress={() => setShowRollCall(false)}>
              <Ionicons name="close" size={24} color={palette.text} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 17 }}>Roll Call</ThemedText>
              <ThemedText style={{ color: palette.muted, fontSize: 13 }}>{session?.title}</ThemedText>
            </View>
            <TouchableOpacity
              style={[
                styles.saveRollCallButton,
                { backgroundColor: rollCallStats.unmarked === 0 ? palette.success : palette.border },
              ]}
              onPress={saveRollCall}
              disabled={rollCallStats.unmarked > 0}
            >
              <ThemedText style={{ color: rollCallStats.unmarked === 0 ? '#fff' : palette.muted, fontWeight: '600' }}>
                Save
              </ThemedText>
            </TouchableOpacity>
          </View>

          {/* Roll Call Stats */}
          <Animated.View entering={FadeIn.delay(100)} style={[styles.rollCallStats, { backgroundColor: palette.surface }]}>
            <View style={styles.rollCallStatItem}>
              <View style={[styles.rollCallStatDot, { backgroundColor: palette.success }]} />
              <ThemedText style={{ fontSize: 13 }}>Present</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: palette.success }}>
                {rollCallStats.present}
              </ThemedText>
            </View>
            <View style={styles.rollCallStatItem}>
              <View style={[styles.rollCallStatDot, { backgroundColor: palette.warning }]} />
              <ThemedText style={{ fontSize: 13 }}>Late</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: palette.warning }}>
                {rollCallStats.late}
              </ThemedText>
            </View>
            <View style={styles.rollCallStatItem}>
              <View style={[styles.rollCallStatDot, { backgroundColor: palette.error }]} />
              <ThemedText style={{ fontSize: 13 }}>Absent</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: palette.error }}>
                {rollCallStats.absent}
              </ThemedText>
            </View>
            <View style={styles.rollCallStatItem}>
              <View style={[styles.rollCallStatDot, { backgroundColor: palette.muted }]} />
              <ThemedText style={{ fontSize: 13 }}>Remaining</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: palette.muted }}>
                {rollCallStats.unmarked}
              </ThemedText>
            </View>
          </Animated.View>

          {/* Roll Call List */}
          <ScrollView style={styles.rollCallList} showsVerticalScrollIndicator={false}>
            {rollCallParticipants.map((registration, index) => {
              const status = rollCallAttendance[registration.id] || 'unmarked';
              return (
                <Animated.View
                  key={registration.id}
                  entering={FadeInDown.delay(index * 30).springify()}
                  style={[styles.rollCallItem, { backgroundColor: palette.surface }]}
                >
                  <View style={styles.rollCallItemInfo}>
                    <View style={[styles.rollCallAvatar, { backgroundColor: `${palette.tint}20` }]}>
                      <ThemedText style={{ color: palette.tint, fontWeight: '700', fontSize: 14 }}>
                        {registration.athleteName.split(' ').map(n => n[0]).join('')}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="defaultSemiBold">{registration.athleteName}</ThemedText>
                      {registration.parentName && (
                        <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                          Parent: {registration.parentName}
                        </ThemedText>
                      )}
                    </View>
                  </View>
                  <View style={styles.rollCallActions}>
                    <TouchableOpacity
                      style={[
                        styles.rollCallActionButton,
                        {
                          backgroundColor: status === 'present' ? palette.success : 'transparent',
                          borderColor: status === 'present' ? palette.success : palette.border,
                        },
                      ]}
                      onPress={() => markRollCallStatus(registration.id, 'present')}
                    >
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={status === 'present' ? '#fff' : palette.success}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.rollCallActionButton,
                        {
                          backgroundColor: status === 'late' ? palette.warning : 'transparent',
                          borderColor: status === 'late' ? palette.warning : palette.border,
                        },
                      ]}
                      onPress={() => markRollCallStatus(registration.id, 'late')}
                    >
                      <Ionicons
                        name="time"
                        size={18}
                        color={status === 'late' ? '#fff' : palette.warning}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.rollCallActionButton,
                        {
                          backgroundColor: status === 'absent' ? palette.error : 'transparent',
                          borderColor: status === 'absent' ? palette.error : palette.border,
                        },
                      ]}
                      onPress={() => markRollCallStatus(registration.id, 'absent')}
                    >
                      <Ionicons
                        name="close"
                        size={20}
                        color={status === 'absent' ? '#fff' : palette.error}
                      />
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              );
            })}
            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Quick Actions */}
          <View style={[styles.rollCallQuickActions, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: `${palette.success}15` }]}
              onPress={() => {
                const updated = { ...rollCallAttendance };
                rollCallParticipants.forEach(r => { updated[r.id] = 'present'; });
                setRollCallAttendance(updated);
              }}
            >
              <Ionicons name="checkmark-done" size={18} color={palette.success} />
              <ThemedText style={{ color: palette.success, fontWeight: '600', fontSize: 13 }}>All Present</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: `${palette.muted}15` }]}
              onPress={() => {
                const updated = { ...rollCallAttendance };
                rollCallParticipants.forEach(r => { updated[r.id] = 'unmarked'; });
                setRollCallAttendance(updated);
              }}
            >
              <Ionicons name="refresh" size={18} color={palette.muted} />
              <ThemedText style={{ color: palette.muted, fontWeight: '600', fontSize: 13 }}>Reset</ThemedText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  list: {
    gap: Spacing.sm,
  },
  // Roll Call Button
  rollCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  // Roll Call Modal Styles
  rollCallContainer: {
    flex: 1,
  },
  rollCallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  saveRollCallButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  rollCallStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  rollCallStatItem: {
    alignItems: 'center',
    gap: 4,
  },
  rollCallStatDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rollCallList: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  rollCallItem: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.sm,
  },
  rollCallItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rollCallAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rollCallActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  rollCallActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rollCallQuickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: Spacing.md,
    borderTopWidth: 1,
    paddingBottom: Spacing.lg,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
});
