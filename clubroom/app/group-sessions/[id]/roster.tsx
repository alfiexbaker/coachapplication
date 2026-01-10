import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { ParticipantCard } from '@/components/group/participant-card';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { groupSessionService } from '@/services/group-session-service';
import type { GroupSession, GroupRegistration } from '@/constants/types';

type FilterType = 'all' | 'registered' | 'waitlisted' | 'attended';

export default function SessionRosterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [session, setSession] = useState<GroupSession | null>(null);
  const [roster, setRoster] = useState<GroupRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

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
});
