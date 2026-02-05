/**
 * Skill Tree Detail Screen
 *
 * Displays a single skill tree with full visualization.
 * Users can view node details and track progress.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { SkillTreeView } from '@/components/skills/SkillTreeView';
import { SkillNode as SkillNodeComponent } from '@/components/skills/SkillNode';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { skillTreeService } from '@/services/skills';
import { createLogger } from '@/utils/logger';
import type { SkillTree, SkillNode, SkillTreeCategory } from '@/constants/types';

const logger = createLogger('SkillTreeDetailScreen');

export default function SkillTreeDetailScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
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
      const loadedTree = await skillTreeService.getSkillTreeWithProgress(
        currentUser.id,
        categoryUpper
      );
      setTree(loadedTree);

      // Calculate which nodes can be unlocked
      if (loadedTree) {
        const canUnlock = new Set<string>();
        for (const node of loadedTree.nodes) {
          if (!node.isUnlocked) {
            const canUnlockNode = await skillTreeService.canUnlockNode(
              currentUser.id,
              node.id
            );
            if (canUnlockNode) {
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

  const handleNodePress = (node: SkillNode) => {
    logger.press('SkillNode', { nodeId: node.id, nodeName: node.name });
    setSelectedNode(node);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCloseModal = () => {
    setSelectedNode(null);
  };

  const handleAddXp = async (amount: number) => {
    if (!currentUser || !selectedNode) return;

    try {
      const result = await skillTreeService.addXpToNode(
        currentUser.id,
        selectedNode.id,
        amount
      );

      if (result) {
        if (result.justUnlocked) {
          setAnimateUnlocks(true);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            'Skill Unlocked!',
            `You have unlocked "${result.node.name}"!${
              result.badgeAwarded ? '\n\nYou also earned a badge!' : ''
            }`,
            [{ text: 'Awesome!', style: 'default' }]
          );
        }

        // Refresh tree
        await loadTree();
        setSelectedNode(result.node);

        // Reset animation flag after a delay
        setTimeout(() => setAnimateUnlocks(false), 1000);
      }
    } catch (error) {
      logger.error('add_xp_failed', { error });
      Alert.alert('Error', 'Failed to add XP');
    }
  };

  const handleUnlockNode = async () => {
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
              const result = await skillTreeService.unlockNode(
                currentUser.id,
                selectedNode.id
              );

              if (result) {
                setAnimateUnlocks(true);
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                  'Skill Unlocked!',
                  `You have unlocked "${result.node.name}"!${
                    result.badgeAwarded ? '\n\nYou also earned a badge!' : ''
                  }`
                );
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
      ]
    );
  };

  // Check if selected node can be unlocked
  const canUnlockSelected = useMemo(() => {
    if (!selectedNode) return false;
    return canUnlockNodes.has(selectedNode.id);
  }, [selectedNode, canUnlockNodes]);

  // Get prerequisite names
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

  if (!currentUser) return null;

  return (
    <>
      <PageContainer
        header={
          <PageHeader
            title={tree?.name ?? 'Skill Tree'}
            subtitle={tree?.description}
            showBack
            onBack={() => router.back()}
          />
        }
        gap={Spacing.md}
        scrollable={false}
      >
        {isLoading ? (
          <SurfaceCard style={styles.loadingCard}>
            <ThemedText style={{ color: palette.muted }}>Loading...</ThemedText>
          </SurfaceCard>
        ) : tree ? (
          <View style={styles.treeWrapper}>
            <SkillTreeView
              tree={tree}
              onNodePress={handleNodePress}
              canUnlockNodes={canUnlockNodes}
              animateUnlocks={animateUnlocks}
            />
          </View>
        ) : (
          <SurfaceCard style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={40} color={palette.error} />
            <ThemedText type="defaultSemiBold">Tree Not Found</ThemedText>
            <ThemedText style={{ color: palette.muted }}>
              Could not load the skill tree for &quot;{category}&quot;
            </ThemedText>
          </SurfaceCard>
        )}
      </PageContainer>

      {/* Node Detail Modal */}
      <Modal
        visible={selectedNode !== null}
        transparent
        animationType="none"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <Clickable
            style={styles.modalBackdrop}
            onPress={handleCloseModal}
          />
          <Animated.View style={[styles.modalContent, animatedModalStyle]}>
            <SurfaceCard style={styles.modalCard}>
              {selectedNode && tree && (
                <>
                  {/* Header */}
                  <View style={styles.modalHeader}>
                    <SkillNodeComponent
                      node={selectedNode}
                      themeColor={tree.themeColor}
                      size="large"
                      showLabel={false}
                    />
                    <View style={styles.modalTitleContainer}>
                      <ThemedText type="title" style={styles.modalTitle}>
                        {selectedNode.name}
                      </ThemedText>
                      <View
                        style={[
                          styles.levelPill,
                          { backgroundColor: `${tree.themeColor}15` },
                        ]}
                      >
                        <ThemedText
                          style={[styles.levelPillText, { color: tree.themeColor }]}
                        >
                          Level {selectedNode.level}
                        </ThemedText>
                      </View>
                    </View>
                    <Clickable
                      style={[styles.closeButton, { backgroundColor: palette.surfaceSecondary }]}
                      onPress={handleCloseModal}
                    >
                      <Ionicons name="close" size={20} color={palette.icon} />
                    </Clickable>
                  </View>

                  {/* Description */}
                  <ThemedText style={[styles.description, { color: palette.muted }]}>
                    {selectedNode.description}
                  </ThemedText>

                  {/* Progress */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                      <ThemedText type="defaultSemiBold">Progress</ThemedText>
                      <ThemedText style={{ color: tree.themeColor }}>
                        {selectedNode.xpCurrent}/{selectedNode.xpRequired} XP
                      </ThemedText>
                    </View>
                    <View style={[styles.progressBg, { backgroundColor: palette.border }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: tree.themeColor,
                            width: `${selectedNode.progress}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Prerequisites */}
                  {prereqNames.length > 0 && (
                    <View style={styles.prereqSection}>
                      <ThemedText type="defaultSemiBold">Prerequisites</ThemedText>
                      <View style={styles.prereqList}>
                        {prereqNames.map((prereq) => (
                          <View
                            key={prereq.id}
                            style={[
                              styles.prereqItem,
                              {
                                backgroundColor: prereq.isUnlocked
                                  ? `${palette.success}15`
                                  : `${palette.error}15`,
                              },
                            ]}
                          >
                            <Ionicons
                              name={prereq.isUnlocked ? 'checkmark-circle' : 'lock-closed'}
                              size={14}
                              color={prereq.isUnlocked ? palette.success : palette.error}
                            />
                            <ThemedText
                              style={[
                                styles.prereqText,
                                {
                                  color: prereq.isUnlocked
                                    ? palette.success
                                    : palette.error,
                                },
                              ]}
                            >
                              {prereq.name}
                            </ThemedText>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Badge reward */}
                  {selectedNode.badgeId && (
                    <View style={[styles.badgeReward, { backgroundColor: `${palette.warning}15` }]}>
                      <Ionicons name="ribbon" size={18} color={palette.warning} />
                      <ThemedText style={{ color: palette.warning }}>
                        Unlocking awards a badge!
                      </ThemedText>
                    </View>
                  )}

                  {/* Status */}
                  {selectedNode.isUnlocked ? (
                    <View style={[styles.unlockedBanner, { backgroundColor: `${palette.success}15` }]}>
                      <Ionicons name="checkmark-circle" size={20} color={palette.success} />
                      <ThemedText style={[styles.unlockedText, { color: palette.success }]}>
                        Skill Unlocked!
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={styles.actionsRow}>
                      {/* Demo XP buttons for development */}
                      {__DEV__ && canUnlockSelected && (
                        <View style={styles.xpButtons}>
                          <Clickable
                            style={[styles.xpButton, { borderColor: tree.themeColor }]}
                            onPress={() => handleAddXp(50)}
                          >
                            <ThemedText style={{ color: tree.themeColor }}>+50 XP</ThemedText>
                          </Clickable>
                          <Clickable
                            style={[styles.xpButton, { borderColor: tree.themeColor }]}
                            onPress={() => handleAddXp(100)}
                          >
                            <ThemedText style={{ color: tree.themeColor }}>+100 XP</ThemedText>
                          </Clickable>
                        </View>
                      )}

                      {canUnlockSelected ? (
                        <Button onPress={handleUnlockNode}>
                          Unlock Skill ({selectedNode.xpRequired} XP)
                        </Button>
                      ) : (
                        <View style={[styles.lockedBanner, { backgroundColor: `${palette.muted}15` }]}>
                          <Ionicons name="lock-closed" size={16} color={palette.muted} />
                          <ThemedText style={{ color: palette.muted }}>
                            Complete prerequisites to unlock
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
            </SurfaceCard>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  loadingCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  treeWrapper: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
  },
  modalCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  modalTitleContainer: {
    flex: 1,
    gap: 4,
  },
  modalTitle: {
    fontSize: 18,
  },
  levelPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  levelPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressSection: {
    gap: Spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  prereqSection: {
    gap: Spacing.xs,
  },
  prereqList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  prereqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  prereqText: {
    fontSize: 12,
    fontWeight: '500',
  },
  badgeReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  unlockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  unlockedText: {
    fontSize: 16,
    fontWeight: '600',
  },
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  actionsRow: {
    gap: Spacing.sm,
  },
  xpButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
    justifyContent: 'center',
  },
  xpButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radii.pill,
  },
});
