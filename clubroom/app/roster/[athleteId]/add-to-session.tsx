import { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { groupSessionService } from '@/services/group-session-service';
import { rosterService } from '@/services/roster-service';
import type { GroupSession } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AddToSession');

export default function AddToSessionScreen() {
  const { athleteId, athleteName } = useLocalSearchParams<{ athleteId: string; athleteName: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [athleteInfo, setAthleteInfo] = useState<{ parentId?: string; parentName?: string }>({});

  useEffect(() => {
    loadData();
  }, [currentUser?.id, athleteId]);

  const loadData = async () => {
    if (!currentUser?.id) return;
    try {
      // Load coach's upcoming sessions
      const coachSessions = await groupSessionService.getCoachSessions(currentUser.id);
      // Filter to only published/available sessions
      const available = coachSessions.filter(
        (s) => s.status === 'PUBLISHED' && s.currentParticipants < s.maxParticipants
      );
      setSessions(available);

      // Load athlete info for parent details
      if (athleteId) {
        const roster = await rosterService.getRoster(currentUser.id);
        const athlete = roster.find((r) => r.athleteId === athleteId);
        if (athlete) {
          setAthleteInfo({ parentId: athlete.parentId, parentName: athlete.parentName });
        }
      }
    } catch (error) {
      logger.error('Failed to load sessions', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToSession = async (session: GroupSession) => {
    if (!athleteId || !athleteName) return;

    setAdding(session.id);
    try {
      await groupSessionService.register(
        session.id,
        athleteId,
        athleteName as string,
        athleteInfo.parentId || 'parent_unknown',
        athleteInfo.parentName || 'Parent'
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Added!',
        `${athleteName} has been added to ${session.title}`,
        [{ text: 'Done', onPress: () => router.back() }]
      );
      logger.info('athlete_added_to_session', { athleteId, sessionId: session.id });
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to add athlete to session');
      logger.error('add_to_session_failed', error);
    } finally {
      setAdding(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return date.toLocaleDateString('en-GB', { weekday: 'long' });
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const renderSession = ({ item: session, index }: { item: GroupSession; index: number }) => {
    const nextSchedule = session.schedule[0];
    const spotsLeft = session.maxParticipants - session.currentParticipants;
    const isAdding = adding === session.id;

    return (
      <Animated.View entering={FadeInDown.delay(index * 50)}>
        <SurfaceCard style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <View style={[styles.typeIcon, { backgroundColor: `${palette.tint}15` }]}>
              <Ionicons
                name={session.sessionType === 'TEAM_TRAINING' ? 'fitness' : 'people'}
                size={20}
                color={palette.tint}
              />
            </View>
            <View style={styles.sessionInfo}>
              <ThemedText type="defaultSemiBold" numberOfLines={1}>
                {session.title}
              </ThemedText>
              <View style={styles.sessionMeta}>
                <Ionicons name="calendar-outline" size={12} color={palette.muted} />
                <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                  {nextSchedule ? `${formatDate(nextSchedule.date)} at ${nextSchedule.startTime}` : 'No schedule'}
                </ThemedText>
              </View>
              <View style={styles.sessionMeta}>
                <Ionicons name="location-outline" size={12} color={palette.muted} />
                <ThemedText style={[styles.metaText, { color: palette.muted }]} numberOfLines={1}>
                  {session.location}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.sessionFooter}>
            <View style={[styles.spotsBadge, { backgroundColor: spotsLeft <= 3 ? `${palette.warning}15` : `${palette.success}15` }]}>
              <ThemedText style={[styles.spotsText, { color: spotsLeft <= 3 ? palette.warning : palette.success }]}>
                {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
              </ThemedText>
            </View>

            <Pressable
              style={[styles.addButton, { backgroundColor: palette.tint, opacity: isAdding ? 0.6 : 1 }]}
              onPress={() => handleAddToSession(session)}
              disabled={isAdding}
            >
              <Ionicons name={isAdding ? 'hourglass' : 'add'} size={16} color="#fff" />
              <ThemedText style={styles.addButtonText}>
                {isAdding ? 'Adding...' : 'Add'}
              </ThemedText>
            </Pressable>
          </View>
        </SurfaceCard>
      </Animated.View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={48} color={palette.muted} />
      <ThemedText type="defaultSemiBold" style={{ marginTop: Spacing.md }}>
        No upcoming sessions
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
        Create a session first, then you can add athletes to it.
      </ThemedText>
      <Pressable
        style={[styles.createButton, { backgroundColor: palette.tint }]}
        onPress={() => router.push('/group-sessions/create')}
      >
        <Ionicons name="add" size={18} color="#fff" />
        <ThemedText style={styles.createButtonText}>Create Session</ThemedText>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerCenter}>
          <ThemedText type="defaultSemiBold">Add to Session</ThemedText>
          <ThemedText style={[styles.athleteLabel, { color: palette.muted }]}>
            {athleteName || 'Athlete'}
          </ThemedText>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerCenter: {
    alignItems: 'center',
  },
  athleteLabel: {
    fontSize: 13,
  },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
    flexGrow: 1,
  },
  sessionCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
    gap: 4,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  sessionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spotsBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  spotsText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radii.pill,
    marginTop: Spacing.lg,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
