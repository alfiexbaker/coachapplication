import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { skillTreeService } from '@/services/skills';
import { createLogger } from '@/utils/logger';
import type { SkillTreeCategory } from '@/constants/types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

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

  const loadTrees = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<{ trees: TreeSummary[] }>({ trees: [] });
    }

    try {
      const summaryResult = await skillTreeService.getTreesSummary(currentUser.id);
      if (!summaryResult.success) {
        logger.error('skill_trees_load_failed', summaryResult.error);
        return err(summaryResult.error);
      }
      const summary = summaryResult.data;
      logger.info('skill_trees_loaded', { count: summary.length });
      return ok<{ trees: TreeSummary[] }>({ trees: summary });
    } catch (error) {
      logger.error('skill_trees_load_failed', { error });
      return err(serviceError('UNKNOWN', 'Failed to load skill trees.', error));
    }
  }, [currentUser]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<{ trees: TreeSummary[] }>({
    load: loadTrees,
    deps: [currentUser?.id],
    isEmpty: (value) => value.trees.length === 0,
    refetchOnFocus: true,
  });

  const trees = data?.trees ?? [];

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
              const result = await skillTreeService.initializeMockProgress(currentUser.id);
              if (!result.success) {
                Alert.alert('Error', result.error.message);
                return;
              }
              onRefresh();
              Alert.alert('Success', 'Demo progress has been added!');
            } catch {
              Alert.alert('Error', 'Failed to initialize demo progress');
            }
          },
        },
      ]
    );
  }, [currentUser, onRefresh]);

  const overallStats = useMemo(() => {
    const totalSkills = trees.reduce((sum, t) => sum + t.totalNodes, 0);
    const totalUnlocked = trees.reduce((sum, t) => sum + t.unlockedNodes, 0);
    const overallPercent = totalSkills > 0 ? Math.round((totalUnlocked / totalSkills) * 100) : 0;
    return { totalSkills, totalUnlocked, overallPercent };
  }, [trees]);

  return {
    currentUser,
    trees,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    overallStats,
    handleTreePress, handleInitializeMock,
  } satisfies {
    currentUser: typeof currentUser;
    trees: TreeSummary[];
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    overallStats: { totalSkills: number; totalUnlocked: number; overallPercent: number };
    handleTreePress: (tree: TreeSummary) => void;
    handleInitializeMock: () => Promise<void>;
  };
}
