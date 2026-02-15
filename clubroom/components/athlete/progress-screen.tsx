/**
 * AthleteProgressScreen — Composition root for athlete progress tracking.
 * Sub-components: ProgressProfileCard, ProgressSkillsTab, ProgressBadgesTab, ProgressGoalsTab
 * Hook: useAthleteProgress
 */
import { View, StyleSheet, ScrollView } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAthleteProgress, type ProgressTabType } from '@/hooks/use-athlete-progress';
import { ProgressProfileCard } from './progress-profile-card';
import { ProgressSkillsTab } from './progress-skills-tab';
import { ProgressBadgesTab } from './progress-badges-tab';
import { ProgressGoalsTab } from './progress-goals-tab';
import { Row } from '@/components/primitives';

const TABS: { key: ProgressTabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'progress', label: 'Progress', icon: 'stats-chart' },
  { key: 'badges', label: 'Badges', icon: 'ribbon' },
  { key: 'goals', label: 'Goals', icon: 'flag' },
];

export function AthleteProgressScreen() {
  const { colors: palette } = useTheme();
  const {
    currentUser,
    athlete,
    sessions,
    skills,
    skillsByCategory,
    awards,
    activeGoals,
    completedGoals,
    activeTab,
    trend,
    level,
    sortedSessions,
    avgRating,
    handleSelectTab,
  } = useAthleteProgress();

  if (!currentUser || !athlete) return null;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            My Progress
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Track your football development
          </ThemedText>
        </View>

        <ProgressProfileCard
          athleteName={athlete.name}
          avatar={athlete.avatar || athlete.name.charAt(0)}
          sessionCount={sessions.length}
          avgRating={avgRating}
          badgeCount={awards.length}
          activeGoalCount={activeGoals.length}
          level={level}
          trend={trend}
        />

        {/* Tab Selector */}
        <Row style={[styles.tabContainer, { backgroundColor: palette.surface }]}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Clickable
                key={tab.key}
                onPress={() => handleSelectTab(tab.key)}
                style={[
                  styles.tab,
                  isActive && [styles.tabActive, { backgroundColor: palette.tint }],
                ]}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: isActive }}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={isActive ? palette.onPrimary : palette.muted}
                />
                <ThemedText
                  style={[
                    styles.tabLabel,
                    { color: isActive ? palette.onPrimary : palette.muted },
                    isActive ? styles.tabLabelActive : undefined,
                  ]}
                >
                  {tab.label}
                </ThemedText>
              </Clickable>
            );
          })}
        </Row>

        {activeTab === 'progress' && (
          <ProgressSkillsTab
            skills={skills}
            skillsByCategory={skillsByCategory}
            sortedSessions={sortedSessions}
          />
        )}
        {activeTab === 'badges' && <ProgressBadgesTab awards={awards} />}
        {activeTab === 'goals' && (
          <ProgressGoalsTab activeGoals={activeGoals} completedGoals={completedGoals} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  header: { gap: Spacing.xs },
  title: { ...Typography.display, letterSpacing: -0.6 },
  subtitle: { ...Typography.bodySmall, lineHeight: 20 },
  tabContainer: { borderRadius: Radii.md, padding: Spacing.xxs, gap: Spacing.xxs },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
  },
  tabActive: {},
  tabLabel: { ...Typography.smallSemiBold },
  tabLabelActive: { fontWeight: '700' },
});
