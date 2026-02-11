import { useEffect, useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { skillTreeService } from '@/services/skills';
import { createLogger } from '@/utils/logger';
import type { SkillTree, SkillNode, SkillTreeCategory } from '@/constants/types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('SkillTreeDetailScreen');

export function useSkillCategory() {
  const { currentUser } = useAuth();
  const { category } = useLocalSearchParams<{ category: string }>();

  const [tree, setTree] = useState<SkillTree | null>(null);
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [canUnlockNodes, setCanUnlockNodes] = useState<Set<string>>(new Set());
  const [animateUnlocks, setAnimateUnlocks] = useState(false);

  const modalScale = useSharedValue(0.9);
  const modalOpacity = useSharedValue(0);

  const categoryUpper = (category?.toUpperCase() ?? 'DRIBBLING') as SkillTreeCategory;

  const loadTree = useCallback(async () => {
    if (!currentUser?.id) {
      setTree(null);
      setCanUnlockNodes(new Set());
      return ok<{ hasTree: boolean }>({ hasTree: false });
    }

    try {
      const loadedTreeResult = await skillTreeService.getSkillTreeWithProgress(
        currentUser.id,
        categoryUpper,
      );
      if (!loadedTreeResult.success) {
        logger.error('skill_tree_load_failed', loadedTreeResult.error);
        setTree(null);
        return err(loadedTreeResult.error);
      }
      const loadedTree = loadedTreeResult.data;
      setTree(loadedTree);

      if (loadedTree) {
        const canUnlock = new Set<string>();
        for (const node of loadedTree.nodes) {
          if (!node.isUnlocked) {
            const canUnlockNodeResult = await skillTreeService.canUnlockNode(
              currentUser.id,
              node.id,
            );
            if (canUnlockNodeResult.success && canUnlockNodeResult.data) {
              canUnlock.add(node.id);
            }
          }
        }
        setCanUnlockNodes(canUnlock);
      }

      logger.info('skill_tree_loaded', {
        category: categoryUpper,
        nodes: loadedTree?.nodes.length ?? 0,
      });
      return ok<{ hasTree: boolean }>({ hasTree: Boolean(loadedTree) });
    } catch (error) {
      logger.error('skill_tree_load_failed', { error });
      setTree(null);
      setCanUnlockNodes(new Set());
      return err(serviceError('UNKNOWN', 'Failed to load skill tree.', error));
    }
  }, [currentUser, categoryUpper]);

  const { status, error, refreshing, onRefresh, retry } = useScreen<{ hasTree: boolean }>({
    load: loadTree,
    deps: [currentUser?.id, categoryUpper],
    isEmpty: (value) => !value.hasTree,
    refetchOnFocus: true,
  });

  // Modal animation
  useEffect(() => {
    if (selectedNode) {
      modalOpacity.value = withTiming(1, { duration: 200 });
      modalScale.value = withSpring(1, { damping: 15, stiffness: 200 });
    } else {
      modalOpacity.value = withTiming(0, { duration: 150 });
      modalScale.value = withTiming(0.9, { duration: 150 });
    }
  }, [selectedNode, modalOpacity, modalScale]);

  const animatedModalStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
    transform: [{ scale: modalScale.value }],
  }));

  const handleNodePress = useCallback((node: SkillNode) => {
    logger.press('SkillNode', { nodeId: node.id, nodeName: node.name });
    setSelectedNode(node);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleAddXp = useCallback(
    async (amount: number) => {
      if (!currentUser || !selectedNode) return;

      try {
        const result = await skillTreeService.addXpToNode(currentUser.id, selectedNode.id, amount);
        if (result.success) {
          if (result.data.justUnlocked) {
            setAnimateUnlocks(true);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              'Skill Unlocked!',
              `You have unlocked "${result.data.node.name}"!${result.data.badgeAwarded ? '\n\nYou also earned a badge!' : ''}`,
              [{ text: 'Awesome!', style: 'default' }],
            );
          }
          onRefresh();
          setSelectedNode(result.data.node);
          setTimeout(() => setAnimateUnlocks(false), 1000);
        } else {
          Alert.alert('Error', result.error.message);
        }
      } catch (error) {
        logger.error('add_xp_failed', { error });
        Alert.alert('Error', 'Failed to add XP');
      }
    },
    [currentUser, selectedNode, onRefresh],
  );

  const handleUnlockNode = useCallback(async () => {
    if (!currentUser || !selectedNode) return;

    Alert.alert(
      'Unlock Skill',
      `Are you sure you want to unlock "${selectedNode.name}"? This requires ${selectedNode.xpRequired} XP.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: async () => {
            try {
              const result = await skillTreeService.unlockNode(currentUser.id, selectedNode.id);
              if (!result.success) {
                Alert.alert('Error', result.error.message);
                return;
              }
              setAnimateUnlocks(true);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                'Skill Unlocked!',
                `You have unlocked "${result.data.node.name}"!${result.data.badgeAwarded ? '\n\nYou also earned a badge!' : ''}`,
              );
              onRefresh();
              handleCloseModal();
              setTimeout(() => setAnimateUnlocks(false), 1000);
            } catch (error) {
              logger.error('unlock_node_failed', { error });
              Alert.alert('Error', 'Failed to unlock skill');
            }
          },
        },
      ],
    );
  }, [currentUser, selectedNode, onRefresh, handleCloseModal]);

  const canUnlockSelected = useMemo(() => {
    if (!selectedNode) return false;
    return canUnlockNodes.has(selectedNode.id);
  }, [selectedNode, canUnlockNodes]);

  const prereqNames = useMemo(() => {
    if (!selectedNode || !tree) return [];
    return selectedNode.prerequisites.map((prereqId) => {
      const prereqNode = tree.nodes.find((n) => n.id === prereqId);
      return {
        id: prereqId,
        name: prereqNode?.name ?? prereqId,
        isUnlocked: prereqNode?.isUnlocked ?? false,
      };
    });
  }, [selectedNode, tree]);

  return {
    tree,
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    selectedNode,
    canUnlockNodes,
    animateUnlocks,
    category,
    categoryUpper,
    currentUser,
    animatedModalStyle,
    canUnlockSelected,
    prereqNames,
    handleNodePress,
    handleCloseModal,
    handleAddXp,
    handleUnlockNode,
  } satisfies {
    tree: SkillTree | null;
    loading: boolean;
    status: ScreenStatus;
    error: ServiceError | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    selectedNode: SkillNode | null;
    canUnlockNodes: Set<string>;
    animateUnlocks: boolean;
    category: string | undefined;
    categoryUpper: SkillTreeCategory;
    currentUser: typeof currentUser;
    animatedModalStyle: ReturnType<typeof useAnimatedStyle>;
    canUnlockSelected: boolean;
    prereqNames: { id: string; name: string; isUnlocked: boolean }[];
    handleNodePress: (node: SkillNode) => void;
    handleCloseModal: () => void;
    handleAddXp: (amount: number) => Promise<void>;
    handleUnlockNode: () => Promise<void>;
  };
}
