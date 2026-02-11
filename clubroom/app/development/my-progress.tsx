import { useState, useCallback, useEffect } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, ViewStyle, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ProgressDashboard, SkillLevelGrid, FeedbackList } from '@/components/progress';
import { ProgressLevelBanner } from '@/components/progress/progress-level-banner';
import { ProgressGoalsTab } from '@/components/progress/progress-goals-tab';
import { ProgressBadgesTab } from '@/components/progress/progress-badges-tab';
import { SkillRadar } from '@/components/analytics/skill-radar';
import { SessionJournal } from '@/components/development/session-journal';
import type { JournalEntry } from '@/components/development/session-journal';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useMyProgress, PROGRESS_TABS } from '@/hooks/use-my-progress';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { SESSION_JOURNAL_SEEDS } from '@/constants/session-journal-seeds';
import * as Haptics from 'expo-haptics';

export default function MyProgressScreen() {
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    currentUser, loading, status, error, refreshing, progress, feedback, badges,
    activeTab, setActiveTab, trendInfo,
    showGoalForm, setShowGoalForm, newGoalTitle, setNewGoalTitle,
    handleRefresh, handleCreateGoal, retry,
  } = useMyProgress();

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);

  // Load journal entries
  useEffect(() => {
    const loadJournal = async () => {
      const stored = await apiClient.get<JournalEntry[]>(STORAGE_KEYS.SESSION_JOURNAL, []);
      const userId = currentUser?.id ?? 'user2';
      const data = stored.length > 0
        ? stored.filter((e) => e.athleteId === userId)
        : SESSION_JOURNAL_SEEDS.filter((e) => e.athleteId === userId);
      setJournalEntries(data);
    };
    loadJournal();
  }, [currentUser?.id]);

  const handleSaveJournal = useCallback(
    async (entry: { personalNotes: string; mood: number; energyLevel: number }) => {
      const userId = currentUser?.id ?? 'user2';
      const newEntry: JournalEntry = {
        id: `journal_${Date.now()}`,
        sessionId: `session_${Date.now()}`,
        athleteId: userId,
        personalNotes: entry.personalNotes,
        mood: entry.mood,
        energyLevel: entry.energyLevel,
        createdAt: new Date().toISOString(),
      };
      const stored = await apiClient.get<JournalEntry[]>(STORAGE_KEYS.SESSION_JOURNAL, []);
      await apiClient.set(STORAGE_KEYS.SESSION_JOURNAL, [newEntry, ...stored]);
      Platform.OS !== 'web' && void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setJournalEntries((prev) => [newEntry, ...prev]);
    },
    [currentUser?.id]
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorState message={error?.message ?? 'Unable to load progress.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (!currentUser || status === 'empty' || !progress) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState icon="analytics-outline" title="No progress yet" message="Complete sessions to start tracking your progress." />
      </SafeAreaView>
    );
  }

  const trendColor = trendInfo ? colors[trendInfo.color] : colors.muted;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Row align="center" justify="space-between" style={styles.header}>
        <Clickable onPress={() => router.back()} style={{ padding: Spacing.xs }}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Clickable>
        <View style={styles.headerCenter}>
          <ThemedText type="title" style={Typography.heading}>My Progress</ThemedText>
          {trendInfo && (
            <Row align="center" gap="xxs" style={[styles.trendBadge, { backgroundColor: withAlpha(trendColor, 0.09) }]}>
              <Ionicons name={trendInfo.icon as keyof typeof Ionicons.glyphMap} size={12} color={trendColor} />
              <ThemedText style={[Typography.caption, { color: trendColor }]}>{trendInfo.label}</ThemedText>
            </Row>
          )}
        </View>
        <View style={{ width: 24 }} />
      </Row>

      <ProgressLevelBanner progress={progress} colors={colors} />

      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <Row justify="space-between">
          {PROGRESS_TABS.map((tab) => (
            <Clickable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tab, activeTab === tab.id && [styles.activeTab, { borderBottomColor: colors.tint }]].filter(Boolean) as ViewStyle[]}
            >
              <View style={[styles.tabIcon, activeTab === tab.id && { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
                <Ionicons name={tab.icon as keyof typeof Ionicons.glyphMap} size={20} color={activeTab === tab.id ? colors.tint : colors.muted} />
              </View>
              <ThemedText style={[Typography.caption, { color: activeTab === tab.id ? colors.tint : colors.muted }]} numberOfLines={1}>
                {tab.shortLabel}
              </ThemedText>
            </Clickable>
          ))}
        </Row>
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {activeTab === 'overview' && (
          <ProgressDashboard progress={progress} athleteName="My" viewerRole="athlete"
            onViewAllSkills={() => setActiveTab('skills')} onViewAllFeedback={() => setActiveTab('feedback')} onViewBadges={() => setActiveTab('badges')} />
        )}
        {activeTab === 'skills' && (
          <View style={styles.section}>
            <Row justify="space-between" align="center" style={styles.sectionHeader}>
              <ThemedText type="heading" style={Typography.heading}>My Skills</ThemedText>
              <ThemedText style={[Typography.small, { color: colors.muted }]}>Based on coach assessments</ThemedText>
            </Row>
            {progress.skills.length > 0 ? (
              <SkillLevelGrid skills={progress.skills} groupByCategory showUpdatedBy />
            ) : (
              <SurfaceCard style={styles.empty}>
                <Ionicons name="analytics-outline" size={32} color={colors.muted} />
                <ThemedText style={[Typography.bodySemiBold, { color: colors.muted }]}>No skill ratings yet</ThemedText>
                <ThemedText style={[Typography.small, { color: colors.muted, textAlign: 'center' }]}>Complete sessions to get skill ratings from coaches</ThemedText>
              </SurfaceCard>
            )}
          </View>
        )}
        {activeTab === 'goals' && (
          <ProgressGoalsTab progress={progress} showGoalForm={showGoalForm} newGoalTitle={newGoalTitle} colors={colors}
            onToggleForm={() => setShowGoalForm(!showGoalForm)} onGoalTitleChange={setNewGoalTitle}
            onCreateGoal={handleCreateGoal} onCancelForm={() => setShowGoalForm(false)} />
        )}
        {activeTab === 'feedback' && (
          <View style={styles.section}>
            <Row justify="space-between" align="center" style={styles.sectionHeader}>
              <ThemedText type="heading" style={Typography.heading}>Coach Feedback</ThemedText>
              <ThemedText style={[Typography.small, { color: colors.muted }]}>Notes from your coaches</ThemedText>
            </Row>
            <FeedbackList feedback={feedback} showCoachName emptyMessage="No feedback yet. Complete sessions to receive feedback from coaches." />
          </View>
        )}
        {activeTab === 'badges' && <ProgressBadgesTab badges={badges} colors={colors} />}
        {activeTab === 'journal' && (
          <View style={styles.section}>
            <SessionJournal
              coachNotes={journalEntries[0]?.coachNotes}
              pastEntries={journalEntries}
              onSave={handleSaveJournal}
            />
          </View>
        )}
        {activeTab === 'radar' && (
          <View style={styles.section}>
            <Row justify="space-between" align="center" style={styles.sectionHeader}>
              <ThemedText type="heading" style={Typography.heading}>Skills Radar</ThemedText>
              <ThemedText style={[Typography.small, { color: colors.muted }]}>Visual breakdown of skill levels</ThemedText>
            </Row>
            <SkillRadar skills={(progress?.skills ?? []).map((s) => ({
              skillName: s.skill, category: '', currentLevel: s.level,
              previousLevel: s.previousLevel ?? s.level, changePercent: 0, history: s.history.map((h) => ({ date: h.date, level: h.level })),
            }))} showDetailedList />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  headerCenter: { alignItems: 'center', gap: Spacing.xxs },
  trendBadge: { paddingHorizontal: Spacing.xs, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  tabBar: { borderBottomWidth: 1, paddingHorizontal: Spacing.sm },
  tab: { flex: 1, alignItems: 'center', gap: Spacing.xxs, paddingVertical: Spacing.sm, marginBottom: -1, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomWidth: 2 },
  tabIcon: { width: 36, height: 36, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.md, gap: Spacing.lg, paddingBottom: Spacing['2xl'] },
  section: { gap: Spacing.md },
  sectionHeader: {},
  empty: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
});
