/**
 * ParentDevelopmentScreen — Composition root for child development tracking.
 * Sub-components: DevChildSelector, DevProfileCard, DevProgressTab, DevBadgesTab, DevGoalsTab
 * Hook: useParentDevelopment
 */
import { View, StyleSheet, ScrollView } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { EmptyMetrics } from '@/components/analytics/enhanced-stats';
import { useParentDevelopment, type DevTabType } from '@/hooks/use-parent-development';
import { DevChildSelector } from './dev-child-selector';
import { DevProfileCard } from './dev-profile-card';
import { DevProgressTab } from './dev-progress-tab';
import { DevBadgesTab } from './dev-badges-tab';
import { DevGoalsTab } from './dev-goals-tab';

const TABS: { key: DevTabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'progress', label: 'Progress', icon: 'stats-chart' },
  { key: 'badges', label: 'Badges', icon: 'ribbon' },
  { key: 'goals', label: 'Goals', icon: 'flag' },
];

export function ParentDevelopmentScreen() {
  const { colors: palette } = useTheme();
  const {
    currentUser,
    children,
    selectedChildId,
    selectedChild,
    sessions,
    sortedSessions,
    skills,
    activeGoals,
    completedGoals,
    awards,
    sharedBadges,
    coachOnlyCount,
    activeTab,
    avgRating,
    trend,
    handleSelectChild,
    handleSelectTab,
  } = useParentDevelopment();

  if (!currentUser) return null;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Development
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            {children.length === 1
              ? `Tracking ${children[0].name}\u2019s progress`
              : children.length > 1
                ? 'Track your children\u2019s progress'
                : 'Add children to track their progress'}
          </ThemedText>
        </View>

        <DevChildSelector
          childOptions={children}
          selectedChildId={selectedChildId}
          onSelectChild={handleSelectChild}
        />

        {children.length === 0 && (
          <EmptyMetrics
            icon="people-outline"
            title="No Children Added"
            description="Add children to your account to track their development and progress"
          />
        )}

        {selectedChild && (
          <>
            <DevProfileCard
              childName={selectedChild.name}
              sessionCount={sessions.length}
              avgRating={avgRating}
              badgeCount={awards.length}
              trend={trend}
            />

            {/* Tab Selector */}
            <Row style={[styles.tabContainer, { backgroundColor: palette.surface }]} gap="xxs">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <Clickable
                    key={tab.key}
                    onPress={() => handleSelectTab(tab.key)}
                    style={[
                      styles.tab,
                      isActive ? [styles.tabActive, { backgroundColor: palette.tint }] : undefined,
                    ]}
                    accessibilityRole="tab"
                    accessibilityLabel={tab.label}
                    accessibilityState={{ selected: isActive }}
                  >
                    <Row align="center" justify="center" gap="xxs" flex>
                      <Ionicons
                        name={tab.icon}
                        size={16}
                        color={isActive ? palette.onPrimary : palette.muted}
                      />
                      <ThemedText
                        style={[
                          styles.tabLabel,
                          { color: isActive ? palette.onPrimary : palette.muted },
                          isActive && styles.tabLabelActive,
                        ]}
                      >
                        {tab.label}
                      </ThemedText>
                    </Row>
                  </Clickable>
                );
              })}
            </Row>

            {activeTab === 'progress' && (
              <DevProgressTab skills={skills} sessions={sessions} sortedSessions={sortedSessions} />
            )}
            {activeTab === 'badges' && (
              <DevBadgesTab
                awards={awards}
                sharedBadges={sharedBadges}
                coachOnlyCount={coachOnlyCount}
                selectedChildId={selectedChildId}
              />
            )}
            {activeTab === 'goals' && (
              <DevGoalsTab activeGoals={activeGoals} completedGoals={completedGoals} />
            )}
          </>
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
  tabContainer: { borderRadius: Radii.md, padding: Spacing.xxs },
  tab: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radii.sm },
  tabActive: {},
  tabLabel: { ...Typography.smallSemiBold },
  tabLabelActive: { ...Typography.bodySmallSemiBold },
});
