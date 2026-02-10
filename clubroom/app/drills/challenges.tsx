/**
 * Challenges Screen
 *
 * Lists active and completed video challenges for the athlete's squad.
 * Coach role sees a "Create Challenge" CTA. Athletes can view and
 * submit attempts via the ChallengeCard component.
 */

import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Platform } from 'react-native';
import { Row } from '@/components/primitives/row';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { ChallengeCard } from '@/components/drills/challenge-card';
import { ChallengeStatsBar } from '@/components/drills/challenge-stats-bar';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useAuth } from '@/hooks/use-auth';
import { challengeService } from '@/services/challenge-service';
import type { Challenge, ChallengeSubmission } from '@/services/challenge-service';
import { Routes } from '@/navigation/routes';
import { MOCK_CHALLENGES, MOCK_CHALLENGE_SUBMISSIONS } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';

type TabFilter = 'active' | 'completed';

const logger = createLogger('ChallengesScreen');

export default function ChallengesScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { currentUser } = useAuth();
  const isCoach = currentUser?.role === 'COACH';

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<ChallengeSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('active');

  const loadData = useCallback(async () => {
    try {
      setError(false);
      const [challengeData, submissionData] = await Promise.all([
        challengeService.getChallengesForSquad('squad_1'),
        Promise.resolve(MOCK_CHALLENGE_SUBMISSIONS),
      ]);
      // Use mock data as fallback if no challenges in storage
      setChallenges(challengeData.length > 0 ? challengeData : MOCK_CHALLENGES);
      setSubmissions(submissionData);
    } catch (err) {
      logger.error('Failed to load challenges', err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleTabChange = useCallback((tab: TabFilter) => {
    Platform.OS !== 'web' && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  }, []);

  const now = Date.now();
  const filtered = useMemo(() => {
    return challenges.filter((c) => {
      const expired = new Date(c.deadline).getTime() < now;
      return activeTab === 'active' ? !expired : expired;
    });
  }, [challenges, activeTab, now]);

  const activeCount = useMemo(
    () => challenges.filter((c) => new Date(c.deadline).getTime() >= now).length,
    [challenges, now]
  );
  const completedCount = challenges.length - activeCount;
  const badgesCount = submissions.filter((s) => s.awardedBadge).length;

  const getSubmissionsFor = useCallback(
    (challengeId: string) => submissions.filter((s) => s.challengeId === challengeId),
    [submissions]
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <ErrorState message="Failed to load challenges" onRetry={loadData} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <Row align="center" justify="space-between" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title" style={styles.headerTitle}>
          Challenges
        </ThemedText>
        {isCoach ? (
          <Clickable
            onPress={() => {
              Platform.OS !== 'web' && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(Routes.DRILLS_CREATE_CHALLENGE);
            }}
            hitSlop={8}
            accessibilityLabel="Create challenge"
          >
            <Ionicons name="add-circle-outline" size={28} color={palette.tint} />
          </Clickable>
        ) : (
          <View style={{ width: 28 }} />
        )}
      </Row>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <ChallengeStatsBar activeCount={activeCount} completedCount={completedCount} badgesCount={badgesCount} />
        </Animated.View>

        {/* Tabs */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <Row gap="xs" style={styles.tabRow}>
            {(['active', 'completed'] as TabFilter[]).map((tab) => {
              const count = tab === 'active' ? activeCount : completedCount;
              const isActive = activeTab === tab;
              return (
                <Clickable
                  key={tab}
                  onPress={() => handleTabChange(tab)}
                  style={[
                    styles.tab,
                    {
                      backgroundColor: isActive ? palette.tint : 'transparent',
                      borderColor: isActive ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <Row align="center" justify="center" gap="xs">
                    <ThemedText
                      style={[styles.tabText, { color: isActive ? palette.onPrimary : palette.text }]}
                    >
                      {tab === 'active' ? 'Active' : 'Completed'}
                    </ThemedText>
                    <View
                      style={[
                        styles.tabBadge,
                        {
                          backgroundColor: isActive
                            ? withAlpha(palette.onPrimary, 0.2)
                            : palette.surfaceSecondary,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[styles.tabBadgeText, { color: isActive ? palette.onPrimary : palette.muted }]}
                      >
                        {count}
                      </ThemedText>
                    </View>
                  </Row>
                </Clickable>
              );
            })}
          </Row>
        </Animated.View>

        {/* Challenge List */}
        {filtered.length === 0 ? (
          <EmptyState
            icon="trophy-outline"
            title={activeTab === 'active' ? 'No active challenges' : 'No completed challenges yet'}
            message={
              activeTab === 'active'
                ? isCoach
                  ? 'Create your first challenge for the squad'
                  : 'New challenges will appear here when your coach creates them'
                : 'Complete challenges to see them here'
            }
          />
        ) : (
          <View style={styles.challengeList}>
            {filtered.map((challenge, index) => (
              <Animated.View key={challenge.id} entering={FadeInDown.delay(200 + index * 50).springify()}>
                <ChallengeCard
                  challenge={challenge}
                  submissions={getSubmissionsFor(challenge.id)}
                  totalAthletes={challenge.totalParticipants}
                  onSubmitAttempt={() => router.push(Routes.drill(challenge.id))}
                  onPlayDemo={() => {}}
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
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerTitle: { flex: 1, marginLeft: Spacing.md },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.md },
  tabRow: {},
  tab: { flex: 1, height: 44, borderRadius: Radii.md, borderWidth: 1 },
  tabText: { ...Typography.bodySmallSemiBold },
  tabBadge: { minWidth: 20, height: 20, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxs },
  tabBadgeText: { ...Typography.caption },
  challengeList: { gap: Spacing.md },
});
