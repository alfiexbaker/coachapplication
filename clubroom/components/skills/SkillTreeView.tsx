/**
 * SkillTreeView Component
 *
 * Visual tree layout showing all skill nodes with connections.
 * Supports animations, touch interactions, and zoom.
 */

import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SkillNode } from './SkillNode';
import { SkillConnection } from './SkillConnection';
import type { SkillTree, SkillNode as SkillNodeType } from '@/constants/types';

export interface SkillTreeViewProps {
  tree: SkillTree;
  onNodePress?: (node: SkillNodeType) => void;
  canUnlockNodes?: Set<string>;
  animateUnlocks?: boolean;
}

interface ConnectionData {
  from: { x: number; y: number };
  to: { x: number; y: number };
  isUnlocked: boolean;
  key: string;
}

export function SkillTreeView({
  tree,
  onNodePress,
  canUnlockNodes = new Set(),
  animateUnlocks = false,
}: SkillTreeViewProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  }, []);

  // Generate connections based on prerequisites
  const connections = useMemo<ConnectionData[]>(() => {
    const conns: ConnectionData[] = [];
    const nodeMap = new Map(tree.nodes.map((n) => [n.id, n]));

    tree.nodes.forEach((node) => {
      node.prerequisites.forEach((prereqId) => {
        const prereqNode = nodeMap.get(prereqId);
        if (prereqNode) {
          conns.push({
            from: prereqNode.position,
            to: node.position,
            isUnlocked: prereqNode.isUnlocked && node.isUnlocked,
            key: `${prereqId}-${node.id}`,
          });
        }
      });
    });

    return conns;
  }, [tree.nodes]);

  // Pinch zoom gesture
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.max(0.5, Math.min(2, event.scale));
    })
    .onEnd(() => {
      if (scale.value < 0.8) {
        scale.value = withSpring(0.8);
      } else if (scale.value > 1.5) {
        scale.value = withSpring(1.5);
      }
    });

  // Pan gesture
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd(() => {
      // Snap back with spring if out of bounds
      const maxOffset = 100;
      if (Math.abs(translateX.value) > maxOffset) {
        translateX.value = withSpring(translateX.value > 0 ? maxOffset : -maxOffset);
      }
      if (Math.abs(translateY.value) > maxOffset) {
        translateY.value = withSpring(translateY.value > 0 ? maxOffset : -maxOffset);
      }
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleReset = () => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  };

  // Calculate stats
  const unlockedCount = tree.nodes.filter((n) => n.isUnlocked).length;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SurfaceCard style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconContainer, { backgroundColor: `${tree.themeColor}15` }]}>
              <Ionicons
                name={tree.icon as keyof typeof Ionicons.glyphMap}
                size={24}
                color={tree.themeColor}
              />
            </View>
            <View>
              <ThemedText type="defaultSemiBold" style={styles.treeName}>
                {tree.name}
              </ThemedText>
              <ThemedText style={[styles.treeDesc, { color: palette.muted }]}>
                {tree.description}
              </ThemedText>
            </View>
          </View>
          <View style={styles.statsContainer}>
            <View style={[styles.statBadge, { backgroundColor: `${tree.themeColor}15` }]}>
              <ThemedText style={[styles.statValue, { color: tree.themeColor }]}>
                {unlockedCount}/{tree.totalNodes}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
                Skills
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBg, { backgroundColor: palette.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: tree.themeColor,
                  width: `${tree.progressPercent}%`,
                },
              ]}
            />
          </View>
          <ThemedText style={[styles.progressLabel, { color: palette.muted }]}>
            {tree.progressPercent}% Complete
          </ThemedText>
        </View>

        {/* Tree visualization */}
        <GestureDetector gesture={composedGesture}>
          <View
            style={[styles.treeContainer, { backgroundColor: `${palette.background}80` }]}
            onLayout={handleLayout}
          >
            {containerSize.width > 0 && (
              <Animated.View style={[styles.treeContent, animatedStyle]}>
                {/* Render connections first (behind nodes) */}
                {connections.map((conn, index) => (
                  <SkillConnection
                    key={conn.key}
                    from={conn.from}
                    to={conn.to}
                    isUnlocked={conn.isUnlocked}
                    themeColor={tree.themeColor}
                    animationDelay={index * 50}
                    containerWidth={containerSize.width}
                    containerHeight={containerSize.height}
                  />
                ))}

                {/* Render nodes */}
                {tree.nodes.map((node) => {
                  const x = (node.position.x / 100) * containerSize.width;
                  const y = (node.position.y / 100) * containerSize.height;

                  return (
                    <View
                      key={node.id}
                      style={[
                        styles.nodeWrapper,
                        {
                          left: x - 40,
                          top: y - 30,
                        },
                      ]}
                    >
                      <SkillNode
                        node={node}
                        themeColor={tree.themeColor}
                        onPress={onNodePress}
                        canUnlock={canUnlockNodes.has(node.id)}
                        animateUnlock={animateUnlocks}
                        size="medium"
                      />
                    </View>
                  );
                })}
              </Animated.View>
            )}

            {/* Reset button */}
            <View style={styles.resetButton}>
              <SurfaceCard
                style={styles.resetButtonInner}
                onPress={handleReset}
              >
                <Ionicons name="refresh" size={16} color={palette.icon} />
              </SurfaceCard>
            </View>

            {/* Zoom indicator */}
            <View style={[styles.zoomHint, { backgroundColor: `${palette.surface}90` }]}>
              <Ionicons name="expand-outline" size={14} color={palette.muted} />
              <ThemedText style={[styles.zoomText, { color: palette.muted }]}>
                Pinch to zoom
              </ThemedText>
            </View>
          </View>
        </GestureDetector>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: tree.themeColor },
              ]}
            />
            <ThemedText style={[styles.legendText, { color: palette.muted }]}>
              Unlocked
            </ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                {
                  backgroundColor: 'transparent',
                  borderWidth: 2,
                  borderColor: `${tree.themeColor}60`,
                },
              ]}
            />
            <ThemedText style={[styles.legendText, { color: palette.muted }]}>
              Available
            </ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: palette.border },
              ]}
            />
            <ThemedText style={[styles.legendText, { color: palette.muted }]}>
              Locked
            </ThemedText>
          </View>
        </View>
      </SurfaceCard>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  card: {
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  treeName: {
    fontSize: 16,
  },
  treeDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  statsContainer: {
    alignItems: 'flex-end',
  },
  statBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
  },
  progressContainer: {
    gap: 4,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    textAlign: 'right',
  },
  treeContainer: {
    height: 380,
    borderRadius: Radii.md,
    overflow: 'hidden',
    position: 'relative',
  },
  treeContent: {
    flex: 1,
    position: 'relative',
  },
  nodeWrapper: {
    position: 'absolute',
    width: 80,
    alignItems: 'center',
  },
  resetButton: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
  },
  resetButtonInner: {
    width: 32,
    height: 32,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.md,
  },
  zoomHint: {
    position: 'absolute',
    bottom: Spacing.xs,
    left: Spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  zoomText: {
    fontSize: 10,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 11,
  },
});
