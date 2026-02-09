import { useEffect, useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/hooks/use-auth';
import { skillTreeService } from '@/services/skills';
import { createLogger } from '@/utils/logger';
import type { SkillTree, SkillNode, SkillTreeCategory } from '@/constants/types';

const logger = createLogger('SkillTreeDetailScreen');

export function useSkillCategory() {
  const { currentUser } = useAuth();
  const { category } = useLocalSearchParams<{ category: string }>();

  const [tree, setTree] = useState<SkillTree | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [canUnlockNodes, setCanUnlockNodes] = useState<Set<string>>(new Set());
  const [animateUnlocks, setAnimateUnlocks] = useState(false);

  const modalScale = useSharedValue(0.9);
  const modalOpacity = useSharedValue(0);

  const categoryUpper = (category?.toUpperCase() ?? 'DRIBBLING') as SkillTreeCategory;

  const loadTree = useCallback(async () => {
    if (!currentUser) return;

    try {
      const loadedTree = await skillTreeService.getSkillTreeWithProgress(currentUser.id, categoryUpper);
      setTree(loadedTree);

      if (loadedTree) {
        const canUnlock = new Set<string>();
        for (const node of loadedTree.nodes) {
          if (!node.isUnlocked) {
            const canUnlockNode = await skillTreeService.canUnlockNode(currentUser.id, node.id);
            if (canUnlockNode) canUnlock.add(node.id);
          }
        }
        setCanUnlockNodes(canUnlock);
      }

      logger.info('skill_tree_loaded', { category: categoryUpper, nodes: loadedTree?.nodes.length ?? 0 });
    } catch (error) {
      logger.error('skill_tree_load_failed', { error });
    }
  }, [currentUser, categoryUpper]);

  useEffect(() => {
    setIsLoading(true);
    loadTree().finally(() => setIsLoading(false));
  }, [loadTree]);

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

  const handleAddXp = useCallback(async (amount: number) => {
    if (!currentUser || !selectedNode) return;

    try {
      const result = await skillTreeService.addXpToNode(currentUser.id, selectedNode.id, amount);
      if (result) {
        if (result.justUnlocked) {
          setAnimateUnlocks(true);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Skill Unlocked!', `You have unlocked "${result.node.name}"!${result.badgeAwarded ? '\n\nYou also earned a badge!' : ''}`, [{ text: 'Awesome!', style: 'default' }]);
        }
        await loadTree();
        setSelectedNode(result.node);
        setTimeout(() => setAnimateUnlocks(false), 1000);
      }
    } catch (error) {
      logger.error('add_xp_failed', { error });
      Alert.alert('Error', 'Failed to add XP');
    }
  }, [currentUser, selectedNode, loadTree]);

  const handleUnlockNode = useCallback(async () => {
    if (!currentUser || !selectedNode) return;

    Alert.alert('Unlock Skill', `Are you sure you want to unlock "${selectedNode.name}"? This requires ${selectedNode.xpRequired} XP.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unlock',
        onPress: async () => {
          try {
            const result = await skillTreeService.unlockNode(currentUser.id, selectedNode.id);
            if (result) {
              setAnimateUnlocks(true);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('Skill Unlocked!', `You have unlocked "${result.node.name}"!${result.badgeAwarded ? '\n\nYou also earned a badge!' : ''}`);
              await loadTree();
              handleCloseModal();
              setTimeout(() => setAnimateUnlocks(false), 1000);
            }
          } catch (error) {
            logger.error('unlock_node_failed', { error });
            Alert.alert('Error', 'Failed to unlock skill');
          }
        },
      },
    ]);
  }, [currentUser, selectedNode, loadTree, handleCloseModal]);

  const canUnlockSelected = useMemo(() => {
    if (!selectedNode) return false;
    return canUnlockNodes.has(selectedNode.id);
  }, [selectedNode, canUnlockNodes]);

  const prereqNames = useMemo(() => {
    if (!selectedNode || !tree) return [];
    return selectedNode.prerequisites.map((prereqId) => {
      const prereqNode = tree.nodes.find((n) => n.id === prereqId);
      return { id: prereqId, name: prereqNode?.name ?? prereqId, isUnlocked: prereqNode?.isUnlocked ?? false };
    });
  }, [selectedNode, tree]);

  return {
    tree, isLoading, selectedNode, canUnlockNodes, animateUnlocks,
    category, categoryUpper, currentUser, animatedModalStyle,
    canUnlockSelected, prereqNames,
    handleNodePress, handleCloseModal, handleAddXp, handleUnlockNode,
  };
}
