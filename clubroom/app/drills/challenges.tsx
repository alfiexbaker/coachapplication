import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Platform } from 'react-native';
import { Row } from '@/components/primitives/row';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { ChallengeCard } from '@/components/drills/challenge-card';
import { ChallengeStatsBar } from '@/components/drills/challenge-stats-bar';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { useAuth } from '@/hooks/use-auth';
import { challengeService } from '@/services/challenge-service';
import type { Challenge, ChallengeSubmission } from '@/services/challenge-service';
import { Routes } from '@/navigation/routes';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError } from '@/types/result';

type TabFilter = 'active' | 'completed';

const logger = createLogger('ChallengesScreen');

interface ChallengesScreenData {
  challenges: Challenge[];
  submissions: ChallengeSubmission[];
}

export default function ChallengesScreen() {
  const { currentUser } = useAuth();
  const isCoach = currentUser?.role === 'COACH';

  const [activeTab, setActiveTab] = useState<TabFilter>('active');

  const loadData = useCallback(async () => {
    try {
      const challenges = await challengeService.getChallengesForSquad('squad_1');
      const submissionGroups = await Promise.all(
        challenges.map((challenge) => challengeService.getSubmissionsForChallenge(challenge.id)),
      );

      return ok<ChallengesScreenData>({
        challenges,
        submissions: submissionGroups.flat(),
      });
    } catch (loadError) {
      logger.error('Failed to load challenges', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load challenges.', loadError));
    }
  }, []);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    colors: palette,
  } = useScreen<ChallengesScreenData>({
    load: loadData,
    deps: [],
    isEmpty: (value) => value.challenges.length === 0,
    refetchOnFocus: true,
  });

  const challenges = useMemo(() => data?.challenges ?? [], [data?.challenges]);
  const submissions = useMemo(() => data?.submissions ?? [], [data?.submissions]);

  const handleTabChange = useCallback((tab: TabFilter) => {
    Platform.OS !== 'web' && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  }, []);
  const handleCreateChallenge = useCallback(() => {
    Platform.OS !== 'web' && void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(Routes.DRILLS_CREATE_CHALLENGE);
  }, []);
  const handleSubmitAttempt = useCallback((challengeId: string) => {
    router.push(Routes.drill(challengeId));
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    return challenges.filter((c) => {
      const expired = new Date(c.deadline).getTime() < now;
      return activeTab === 'active' ? !expired : expired;
    });
  }, [challenges, activeTab]);

  const activeCount = useMemo(() => {
    const now = Date.now();
    return challenges.filter((c) => new Date(c.deadline).getTime() >= now).length;
  }, [challenges]);
  const completedCount = challenges.length - activeCount;
  const badgesCount = submissions.filter((s) => s.awardedBadge).length;

  const getSubmissionsFor = useCallback(
    (challengeId: string) => submissions.filter((s) => s.challengeId === challengeId),
    [submissions],
  );

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <ErrorState message={error?.message ?? 'Failed to load challenges.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader
        title="Challenges"
        showBack
        backIcon="arrow-back"
        onBackPress={() => router.back()}
        centerTitle
        containerStyle={styles.header}
        right={
          isCoach && status !== 'empty' ? (
            <Clickable
              onPress={handleCreateChallenge}
              hitSlop={8}
              accessibilityLabel="Create challenge"
            >
              <Ionicons name="add-circle-outline" size={28} color={palette.tint} />
            </Clickable>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <ChallengeStatsBar
            activeCount={activeCount}
            completedCount={completedCount}
            badgesCount={badgesCount}
          />
        </Animated.View>

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
                      style={[
                        styles.tabText,
                        { color: isActive ? palette.onPrimary : palette.text },
                      ]}
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
                        style={[
                          styles.tabBadgeText,
                          { color: isActive ? palette.onPrimary : palette.muted },
                        ]}
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

        {status === 'empty' ? (
          <EmptyState
            icon="trophy-outline"
            title="No challenges yet"
            message={
              isCoach
                ? 'Create your first challenge for the squad.'
                : 'Challenges from your coach will appear here.'
            }
            actionLabel={isCoach ? 'Create challenge' : undefined}
            onPressAction={isCoach ? handleCreateChallenge : undefined}
          />
        ) : filtered.length === 0 ? (
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
              <Animated.View
                key={challenge.id}
                entering={FadeInDown.delay(200 + index * 50).springify()}
              >
                <ChallengeCard
                  challenge={challenge}
                  submissions={getSubmissionsFor(challenge.id)}
                  totalAthletes={challenge.totalParticipants}
                  onSubmitAttempt={() => handleSubmitAttempt(challenge.id)}
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
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  tabBadgeText: { ...Typography.caption },
  challengeList: { gap: Spacing.md },
});
