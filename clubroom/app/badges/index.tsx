/**
 * All Badges Screen
 *
 * Shows badge collection with filter tabs, section grids, and tier legend.
 * All state/logic in useBadgesScreen hook.
 */

import { View, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Row } from '@/components/primitives/row';
import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { BadgeSectionGrid, BadgeStats } from '@/components/badges/badge-grid';
import { useScreen } from '@/hooks/use-screen';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/screen-states';
import { ok } from '@/types/result';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useBadgesScreen, BADGE_TIER_COLORS, FILTER_TABS, SECTION_ORDER } from '@/hooks/use-badges-screen';

export default function AllBadgesScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const c = useBadgesScreen();

  if (!c.currentUser) return <EmptyState icon="person-outline" title="Not logged in" message="Please log in to view your badges" />;

  return (
    <PageContainer header={<PageHeader title="Achievements" subtitle="Track your badges and progress" showBack onBack={() => router.back()} />}
      gap={Spacing.md}>
      <BadgeStats totalBadges={c.stats.total} unlockedBadges={c.stats.unlocked} totalPoints={c.stats.points} />

      <SurfaceCard style={styles.filterCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTER_TABS.map((tab) => {
            const isActive = tab.key === c.activeFilter;
            const count = c.getFilterCount(tab.key);
            return (
              <Clickable key={tab.key} onPress={() => c.handleFilterChange(tab.key)}
                style={[styles.filterTab, isActive && { backgroundColor: withAlpha(palette.tint, 0.07), borderColor: palette.tint },
                  !isActive && { borderColor: palette.border }].filter(Boolean) as ViewStyle[]}>
                <Row align="center" gap="xxs">
                  <Ionicons name={tab.icon} size={16} color={isActive ? palette.tint : palette.muted} />
                  <ThemedText style={[styles.filterLabel, { color: isActive ? palette.tint : palette.muted }]}>{tab.label}</ThemedText>
                  <View style={[styles.filterCount, { backgroundColor: isActive ? withAlpha(palette.tint, 0.12) : withAlpha(palette.muted, 0.09) }]}>
                    <ThemedText style={[styles.filterCountText, { color: isActive ? palette.tint : palette.muted }]}>{count}</ThemedText>
                  </View>
                </Row>
              </Clickable>
            );
          })}
        </ScrollView>
      </SurfaceCard>

      {c.loading ? (
        <LoadingState variant="list" />
      ) : c.status === 'error' ? (
        <ErrorState message={c.error?.message ?? 'Failed to load badges.'} onRetry={c.retry} />
      ) : c.filteredBadges.length === 0 ? (
        <SurfaceCard style={styles.centeredCard}>
          <Ionicons name="ribbon-outline" size={40} color={palette.muted} />
          <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
            {c.activeFilter === 'unlocked' ? 'No badges earned yet' : c.activeFilter === 'in-progress' ? 'No badges in progress' : 'No badges found'}
          </ThemedText>
          <ThemedText style={[styles.emptySubtitle, { color: palette.muted }]}>
            {c.activeFilter === 'unlocked' ? 'Complete sessions and hit milestones to earn badges'
              : c.activeFilter === 'in-progress' ? 'Start working toward your first milestone' : 'Try a different filter'}
          </ThemedText>
        </SurfaceCard>
      ) : (
        SECTION_ORDER.filter((section) => c.filteredBySection.has(section)).map((section) => (
          <BadgeSectionGrid key={section} sectionKey={section} badges={c.filteredBySection.get(section) || []} onBadgePress={c.handleBadgePress} />
        ))
      )}

      <SurfaceCard style={styles.legendCard}>
        <ThemedText type="defaultSemiBold" style={styles.legendTitle}>Badge Tiers</ThemedText>
        <Row justify="between" style={styles.legendRow}>
          {(['bronze', 'silver', 'gold'] as const).map((tier) => (
            <Row key={tier} align="center" gap="xxs" style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: BADGE_TIER_COLORS[tier] }]} />
              <ThemedText style={[styles.legendText, { color: palette.muted }]}>
                {tier === 'bronze' ? 'Bronze (10 pts)' : tier === 'silver' ? 'Silver (25 pts)' : 'Gold (50 pts)'}
              </ThemedText>
            </Row>
          ))}
        </Row>
      </SurfaceCard>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  filterCard: { padding: Spacing.xs },
  filterScroll: { gap: Spacing.xs },
  filterTab: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, borderRadius: Radii.pill, borderWidth: 1 },
  filterLabel: { ...Typography.smallSemiBold },
  filterCount: { paddingHorizontal: Spacing.xxs, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  filterCountText: { ...Typography.caption },
  centeredCard: { padding: Spacing.xl, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  emptyTitle: { ...Typography.subheading, textAlign: 'center' },
  emptySubtitle: { ...Typography.small, textAlign: 'center', maxWidth: 260 },
  legendCard: { padding: Spacing.sm, gap: Spacing.sm },
  legendTitle: { ...Typography.small },
  legendRow: {},
  legendItem: {},
  legendDot: { width: 12, height: 12, borderRadius: Radii.sm },
  legendText: { ...Typography.caption },
});
