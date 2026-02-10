/**
 * Skills Screen
 *
 * Displays all available skill trees with progress indicators.
 * Users can browse their skill progression across different categories.
 */

import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { ProgressBadge } from '@/components/skills/ProgressBadge';
import { Row } from '@/components/primitives/row';
import { LoadingState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useSkillsScreen, BADGE_TIER_COLORS } from '@/hooks/use-skills-screen';

export default function SkillsScreen() {
  const { colors: palette } = useTheme();
  const {
    currentUser, trees, isLoading,
    overallStats,
    handleTreePress, handleInitializeMock,
  } = useSkillsScreen();

  if (!currentUser) return null;

  return (
    <PageContainer
      header={<PageHeader title="Skill Trees" subtitle="Track your football progression" showBack onBack={() => router.back()} />}
      gap={Spacing.md}
    >
      {/* Overall Stats */}
      <SurfaceCard style={styles.statsCard}>
        <Row align="center" justify="around">
          <View style={styles.statItem}>
            <ThemedText style={[Typography.display, { color: palette.tint }]}>{overallStats.totalUnlocked}</ThemedText>
            <ThemedText style={[Typography.caption, { color: palette.muted, marginTop: Spacing.micro }]}>Skills Unlocked</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          <View style={styles.statItem}>
            <ThemedText style={[Typography.display, { color: palette.tint }]}>{overallStats.totalSkills}</ThemedText>
            <ThemedText style={[Typography.caption, { color: palette.muted, marginTop: Spacing.micro }]}>Total Skills</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          <View style={styles.statItem}>
            <ThemedText style={[Typography.display, { color: palette.success }]}>{overallStats.overallPercent}%</ThemedText>
            <ThemedText style={[Typography.caption, { color: palette.muted, marginTop: Spacing.micro }]}>Complete</ThemedText>
          </View>
        </Row>
      </SurfaceCard>

      {/* Tree Grid */}
      {isLoading ? (
        <LoadingState variant="card" />
      ) : (
        <Row gap="sm" wrap style={styles.treesGrid}>
          {trees.map((tree) => (
            <SurfaceCard key={tree.treeId} style={styles.treeCard} onPress={() => handleTreePress(tree)}>
              <ProgressBadge icon={tree.icon} label={tree.name} progress={tree.percentComplete} themeColor={tree.themeColor} totalNodes={tree.totalNodes} unlockedNodes={tree.unlockedNodes} size="large" />
            </SurfaceCard>
          ))}
        </Row>
      )}

      {/* Info Card */}
      <SurfaceCard style={styles.infoCard}>
        <Row gap="xs" align="center">
          <Ionicons name="information-circle-outline" size={20} color={palette.tint} />
          <ThemedText type="defaultSemiBold">How Skill Trees Work</ThemedText>
        </Row>
        <ThemedText style={[Typography.small, { color: palette.muted }]}>
          Complete training sessions and earn XP to unlock skills. Each skill has prerequisites
          that must be unlocked first. Unlocking skills awards badges and tracks your progression.
        </ThemedText>
        <View style={styles.infoList}>
          {([
            { color: BADGE_TIER_COLORS.bronze, text: 'Level 1: Foundation skills (100 XP)' },
            { color: BADGE_TIER_COLORS.silver, text: 'Level 2: Intermediate skills (250 XP)' },
            { color: BADGE_TIER_COLORS.gold, text: 'Level 3: Advanced skills (400-500 XP)' },
          ] as const).map((item) => (
            <Row key={item.text} gap="xs" align="center">
              <View style={[styles.levelDot, { backgroundColor: item.color }]} />
              <ThemedText style={[Typography.caption, { color: palette.muted }]}>{item.text}</ThemedText>
            </Row>
          ))}
        </View>
      </SurfaceCard>

      {/* Demo button (for testing) */}
      {__DEV__ && (
        <Clickable style={[styles.demoButton, { borderColor: palette.border }]} onPress={handleInitializeMock}>
          <Row align="center" justify="center" gap="xs">
            <Ionicons name="flask-outline" size={18} color={palette.muted} />
            <ThemedText style={[Typography.small, { color: palette.muted }]}>Initialize Demo Progress</ThemedText>
          </Row>
        </Clickable>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  statsCard: { padding: Spacing.sm },
  statsRow: {},
  statItem: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, height: 40 },
  loadingCard: { padding: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  treesGrid: {},
  treeCard: { width: '47%', minWidth: 150, padding: Spacing.md, alignItems: 'center' },
  infoCard: { padding: Spacing.sm, gap: Spacing.sm },
  infoList: { gap: Spacing.xs, paddingTop: Spacing.xs },
  levelDot: { width: 10, height: 10, borderRadius: Radii.sm },
  demoButton: { padding: Spacing.sm, borderWidth: 1, borderRadius: Radii.md, borderStyle: 'dashed' },
});
