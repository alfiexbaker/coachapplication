/**
 * SkillTreeView Component
 *
 * Visual tree layout showing all skill nodes with connections.
 * Supports animations, touch interactions, and zoom.
 */

import { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import { SkillNode } from './SkillNode';
import { SkillConnection } from './SkillConnection';
import type { SkillTree, SkillNode as SkillNodeType } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import {
  type ConnectionData,
  TreeHeader,
  TreeProgressBar,
  TreeLegend,
  ResetButton,
  ZoomHint,
} from './skill-tree-sections';

export interface SkillTreeViewProps {
  tree: SkillTree;
  onNodePress?: (node: SkillNodeType) => void;
  canUnlockNodes?: Set<string>;
  animateUnlocks?: boolean;
}

export function SkillTreeView({
  tree,
  onNodePress,
  canUnlockNodes = new Set(),
  animateUnlocks = false,
}: SkillTreeViewProps) {
  const { colors: palette } = useTheme();

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  }, []);

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

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.max(0.5, Math.min(2, event.scale));
    })
    .onEnd(() => {
      if (scale.value < 0.8) scale.value = withSpring(0.8);
      else if (scale.value > 1.5) scale.value = withSpring(1.5);
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd(() => {
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

  const unlockedCount = tree.nodes.filter((n) => n.isUnlocked).length;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SurfaceCard style={styles.card}>
        <TreeHeader
          name={tree.name}
          description={tree.description}
          icon={tree.icon}
          themeColor={tree.themeColor}
          unlockedCount={unlockedCount}
          totalNodes={tree.totalNodes}
          palette={palette}
        />

        <TreeProgressBar
          progressPercent={tree.progressPercent}
          themeColor={tree.themeColor}
          palette={palette}
        />

        <GestureDetector gesture={composedGesture}>
          <View
            style={[styles.treeContainer, { backgroundColor: withAlpha(palette.background, 0.5) }]}
            onLayout={handleLayout}
          >
            {containerSize.width > 0 && (
              <Animated.View style={[styles.treeContent, animatedStyle]}>
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

                {tree.nodes.map((node) => {
                  const x = (node.position.x / 100) * containerSize.width;
                  const y = (node.position.y / 100) * containerSize.height;
                  return (
                    <View key={node.id} style={[styles.nodeWrapper, { left: x - 40, top: y - 30 }]}>
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

            <ResetButton onReset={handleReset} palette={palette} />
            <ZoomHint palette={palette} />
          </View>
        </GestureDetector>

        <TreeLegend themeColor={tree.themeColor} palette={palette} />
      </SurfaceCard>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: { gap: Spacing.sm, padding: Spacing.sm },
  treeContainer: {
    height: 380,
    borderRadius: Radii.md,
    overflow: 'hidden',
    position: 'relative',
  },
  treeContent: { flex: 1, position: 'relative' },
  nodeWrapper: { position: 'absolute', width: 80, alignItems: 'center' },
});
