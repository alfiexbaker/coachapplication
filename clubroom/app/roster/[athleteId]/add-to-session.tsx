import { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { LoadingState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { groupSessionService } from '@/services/group-session-service';
import { rosterService } from '@/services/roster-service';
import type { GroupSession } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AddToSession');

export default function AddToSessionScreen() {
  const { athleteId, athleteName } = useLocalSearchParams<{ athleteId: string; athleteName: string }>();
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [athleteInfo, setAthleteInfo] = useState<{ parentId?: string }>({});

  const loadData = useCallback(async () => {
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
          setAthleteInfo({ parentId: athlete.parentId });
        }
      }
    } catch (error) {
      logger.error('Failed to load sessions', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, athleteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddToSession = async (session: GroupSession) => {
    if (!athleteId || !athleteName) return;

    setAdding(session.id);
    try {
      await groupSessionService.register(
        session.id,
        athleteId,
        athleteInfo.parentId || 'parent_unknown'
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
          <Row gap="md" style={styles.sessionHeader}>
            <View style={[styles.typeIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
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
              <Row align="center" gap="xxs" style={styles.sessionMeta}>
                <Ionicons name="calendar-outline" size={12} color={palette.muted} />
                <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                  {nextSchedule ? `${formatDate(nextSchedule.date)} at ${nextSchedule.startTime}` : 'No schedule'}
                </ThemedText>
              </Row>
              <Row align="center" gap="xxs" style={styles.sessionMeta}>
                <Ionicons name="location-outline" size={12} color={palette.muted} />
                <ThemedText style={[styles.metaText, { color: palette.muted }]} numberOfLines={1}>
                  {session.location}
                </ThemedText>
              </Row>
            </View>
          </Row>

          <Row align="center" justify="space-between" style={styles.sessionFooter}>
            <View style={[styles.spotsBadge, { backgroundColor: spotsLeft <= 3 ? withAlpha(palette.warning, 0.09) : withAlpha(palette.success, 0.09) }]}>
              <ThemedText style={[styles.spotsText, { color: spotsLeft <= 3 ? palette.warning : palette.success }]}>
                {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
              </ThemedText>
            </View>

            <Clickable
              style={[styles.addButton, { backgroundColor: palette.tint, opacity: isAdding ? 0.6 : 1 }]}
              onPress={() => handleAddToSession(session)}
              disabled={isAdding}
            >
              <Row align="center" gap="xxs">
                <Ionicons name={isAdding ? 'hourglass' : 'add'} size={16} color={palette.onPrimary} />
                <ThemedText style={[styles.addButtonText, { color: palette.onPrimary }]}>
                  {isAdding ? 'Adding...' : 'Add'}
                </ThemedText>
              </Row>
            </Clickable>
          </Row>
        </SurfaceCard>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <Row align="center" justify="space-between" style={[styles.header, { borderBottomColor: palette.border }]}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={24} color={palette.text} />
          </Clickable>
          <View style={styles.headerCenter}>
            <ThemedText type="defaultSemiBold">Add to Session</ThemedText>
            <ThemedText style={[styles.athleteLabel, { color: palette.muted }]}>{athleteName || 'Athlete'}</ThemedText>
          </View>
          <View style={{ width: 24 }} />
        </Row>
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={48} color={palette.muted} />
      <ThemedText type="defaultSemiBold" style={{ marginTop: Spacing.md }}>
        No upcoming sessions
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
        Create a session first, then you can add athletes to it.
      </ThemedText>
      <Clickable
        style={[styles.createButton, { backgroundColor: palette.tint }]}
        onPress={() => router.push(Routes.GROUP_SESSIONS_CREATE)}
      >
        <Row align="center" gap="xxs">
          <Ionicons name="add" size={18} color={palette.onPrimary} />
          <ThemedText style={[styles.createButtonText, { color: palette.onPrimary }]}>Create Session</ThemedText>
        </Row>
      </Clickable>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <Row align="center" justify="space-between" style={[styles.header, { borderBottomColor: palette.border }]}>
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
      </Row>

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
    flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1 },
  headerCenter: {
    alignItems: 'center' },
  athleteLabel: {
    ...Typography.small },
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
    flexGrow: 1 },
  sessionCard: {
    padding: Spacing.md,
    gap: Spacing.md },
  sessionHeader: {},
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center' },
  sessionInfo: {
    flex: 1,
    gap: Spacing.xxs },
  sessionMeta: {},
  metaText: {
    ...Typography.caption },
  sessionFooter: {},
  spotsBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm },
  spotsText: {
    ...Typography.caption },
  addButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill },
  addButtonText: {
    ...Typography.bodySmallSemiBold },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl },
  emptyText: {
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20 },
  createButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radii.pill,
    marginTop: Spacing.lg },
  createButtonText: {
    fontWeight: '600' } });
