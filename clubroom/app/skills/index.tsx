/**
 * Skills Screen
 *
 * Displays all available skill trees with progress indicators.
 * Users can browse their skill progression across different categories.
 */

import { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { ProgressBadge } from '@/components/skills/ProgressBadge';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { skillTreeService } from '@/services/skills';
import { createLogger } from '@/utils/logger';
import type { SkillTreeCategory } from '@/constants/types';

const logger = createLogger('SkillsScreen');

// Decorative: badge tier colors (gold/silver/bronze medals) for skill levels
const BADGE_TIER_COLORS = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
} as const;

interface TreeSummary {
  treeId: string;
  category: SkillTreeCategory;
  name: string;
  icon: string;
  themeColor: string;
  totalNodes: number;
  unlockedNodes: number;
  percentComplete: number;
}

export default function SkillsScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [trees, setTrees] = useState<TreeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_isRefreshing, setIsRefreshing] = useState(false);

  const loadTrees = useCallback(async () => {
    if (!currentUser) return;

    try {
      const summary = await skillTreeService.getTreesSummary(currentUser.id);
      setTrees(summary);
      logger.info('skill_trees_loaded', { count: summary.length });
    } catch (error) {
      logger.error('skill_trees_load_failed', { error });
    }
  }, [currentUser]);

  useEffect(() => {
    setIsLoading(true);
    loadTrees().finally(() => setIsLoading(false));
  }, [loadTrees]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTrees();
    setIsRefreshing(false);
  };

  const handleTreePress = (tree: TreeSummary) => {
    logger.press('SkillTreeCard', { treeId: tree.treeId, category: tree.category });
    router.push(Routes.skillCategory(tree.category.toLowerCase()));
  };

  const handleInitializeMock = async () => {
    if (!currentUser) return;

    Alert.alert(
      'Initialize Demo Progress',
      'This will add some sample progress to your skill trees for demonstration.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Initialize',
          onPress: async () => {
            try {
              await skillTreeService.initializeMockProgress(currentUser.id);
              await loadTrees();
              Alert.alert('Success', 'Demo progress has been added!');
            } catch {
              Alert.alert('Error', 'Failed to initialize demo progress');
            }
          },
        },
      ]
    );
  };

  // Calculate overall stats
  const totalSkills = trees.reduce((sum, t) => sum + t.totalNodes, 0);
  const totalUnlocked = trees.reduce((sum, t) => sum + t.unlockedNodes, 0);
  const overallPercent = totalSkills > 0 ? Math.round((totalUnlocked / totalSkills) * 100) : 0;

  if (!currentUser) return null;

  return (
    <PageContainer
      header={
        <PageHeader
          title="Skill Trees"
          subtitle="Track your football progression"
          showBack
          onBack={() => router.back()}
        />
      }
      gap={Spacing.md}
    >
      {/* Overall Stats */}
      <SurfaceCard style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: palette.tint }]}>
              {totalUnlocked}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
              Skills Unlocked
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: palette.tint }]}>
              {totalSkills}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
              Total Skills
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: palette.success }]}>
              {overallPercent}%
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
              Complete
            </ThemedText>
          </View>
        </View>
      </SurfaceCard>

      {/* Tree Grid */}
      {isLoading ? (
        <SurfaceCard style={styles.loadingCard}>
          <ThemedText style={{ color: palette.muted }}>Loading skill trees...</ThemedText>
        </SurfaceCard>
      ) : (
        <View style={styles.treesGrid}>
          {trees.map((tree) => (
            <SurfaceCard
              key={tree.treeId}
              style={styles.treeCard}
              onPress={() => handleTreePress(tree)}
            >
              <ProgressBadge
                icon={tree.icon}
                label={tree.name}
                progress={tree.percentComplete}
                themeColor={tree.themeColor}
                totalNodes={tree.totalNodes}
                unlockedNodes={tree.unlockedNodes}
                size="large"
              />
            </SurfaceCard>
          ))}
        </View>
      )}

      {/* Info Card */}
      <SurfaceCard style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle-outline" size={20} color={palette.tint} />
          <ThemedText type="defaultSemiBold">How Skill Trees Work</ThemedText>
        </View>
        <ThemedText style={[styles.infoText, { color: palette.muted }]}>
          Complete training sessions and earn XP to unlock skills. Each skill has prerequisites
          that must be unlocked first. Unlocking skills awards badges and tracks your progression.
        </ThemedText>
        <View style={styles.infoList}>
          <View style={styles.infoItem}>
            <View style={[styles.levelDot, { backgroundColor: BADGE_TIER_COLORS.bronze }]} />
            <ThemedText style={[styles.infoItemText, { color: palette.muted }]}>
              Level 1: Foundation skills (100 XP)
            </ThemedText>
          </View>
          <View style={styles.infoItem}>
            <View style={[styles.levelDot, { backgroundColor: BADGE_TIER_COLORS.silver }]} />
            <ThemedText style={[styles.infoItemText, { color: palette.muted }]}>
              Level 2: Intermediate skills (250 XP)
            </ThemedText>
          </View>
          <View style={styles.infoItem}>
            <View style={[styles.levelDot, { backgroundColor: BADGE_TIER_COLORS.gold }]} />
            <ThemedText style={[styles.infoItemText, { color: palette.muted }]}>
              Level 3: Advanced skills (400-500 XP)
            </ThemedText>
          </View>
        </View>
      </SurfaceCard>

      {/* Demo button (for testing) */}
      {__DEV__ && (
        <Clickable
          style={[styles.demoButton, { borderColor: palette.border }]}
          onPress={handleInitializeMock}
        >
          <Ionicons name="flask-outline" size={18} color={palette.muted} />
          <ThemedText style={[styles.demoButtonText, { color: palette.muted }]}>
            Initialize Demo Progress
          </ThemedText>
        </Clickable>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    padding: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...Typography.display,
  },
  statLabel: {
    ...Typography.caption,
    marginTop: Spacing.micro,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  loadingCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  treesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  treeCard: {
    width: '47%',
    minWidth: 150,
    padding: Spacing.md,
    alignItems: 'center',
  },
  infoCard: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  infoText: {
    ...Typography.small,
  },
  infoList: {
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  levelDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.sm,
  },
  infoItemText: {
    ...Typography.caption,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.md,
    borderStyle: 'dashed',
  },
  demoButtonText: {
    ...Typography.small,
  },
});
