import { useEffect, useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { skillTreeService } from '@/services/skills';
import { createLogger } from '@/utils/logger';
import type { SkillTreeCategory } from '@/constants/types';

const logger = createLogger('SkillsScreen');

// Decorative: badge tier colors (gold/silver/bronze medals) for skill levels
export const BADGE_TIER_COLORS = {
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
} as const;

export interface TreeSummary {
  treeId: string;
  category: SkillTreeCategory;
  name: string;
  icon: string;
  themeColor: string;
  totalNodes: number;
  unlockedNodes: number;
  percentComplete: number;
}

export function useSkillsScreen() {
  const { currentUser } = useAuth();

  const [trees, setTrees] = useState<TreeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleTreePress = useCallback((tree: TreeSummary) => {
    logger.press('SkillTreeCard', { treeId: tree.treeId, category: tree.category });
    router.push(Routes.skillCategory(tree.category.toLowerCase()));
  }, []);

  const handleInitializeMock = useCallback(async () => {
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
  }, [currentUser, loadTrees]);

  const overallStats = useMemo(() => {
    const totalSkills = trees.reduce((sum, t) => sum + t.totalNodes, 0);
    const totalUnlocked = trees.reduce((sum, t) => sum + t.unlockedNodes, 0);
    const overallPercent = totalSkills > 0 ? Math.round((totalUnlocked / totalSkills) * 100) : 0;
    return { totalSkills, totalUnlocked, overallPercent };
  }, [trees]);

  return {
    currentUser, trees, isLoading,
    overallStats,
    handleTreePress, handleInitializeMock,
  };
}
