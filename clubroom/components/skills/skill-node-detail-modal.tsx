import { memo } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { SkillNode as SkillNodeComponent } from '@/components/skills/SkillNode';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SkillTree, SkillNode } from '@/constants/types';

interface SkillNodeDetailModalProps {
  selectedNode: SkillNode | null;
  tree: SkillTree | null;
  canUnlockSelected: boolean;
  prereqNames: { id: string; name: string; isUnlocked: boolean }[];
  animatedModalStyle: Record<string, unknown>;
  onClose: () => void;
  onAddXp: (amount: number) => void;
  onUnlock: () => void;
}

export const SkillNodeDetailModal = memo(function SkillNodeDetailModal({
  selectedNode, tree, canUnlockSelected, prereqNames,
  animatedModalStyle, onClose, onAddXp, onUnlock,
}: SkillNodeDetailModalProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={selectedNode !== null} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Clickable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[styles.content, animatedModalStyle]}>
          <SurfaceCard style={styles.card}>
            {selectedNode && tree && (
              <>
                {/* Header */}
                <Row gap="sm" align="flex-start">
                  <SkillNodeComponent node={selectedNode} themeColor={tree.themeColor} size="large" showLabel={false} />
                  <View style={styles.titleContainer}>
                    <ThemedText type="title" style={Typography.heading}>{selectedNode.name}</ThemedText>
                    <View style={[styles.levelPill, { backgroundColor: withAlpha(tree.themeColor, 0.09) }]}>
                      <ThemedText style={[Typography.caption, { color: tree.themeColor }]}>Level {selectedNode.level}</ThemedText>
                    </View>
                  </View>
                  <Clickable accessibilityLabel="Close" style={[styles.closeButton, { backgroundColor: colors.surfaceSecondary }]} onPress={onClose}>
                    <Ionicons name="close" size={20} color={colors.icon} />
                  </Clickable>
                </Row>

                {/* Description */}
                <ThemedText style={[Typography.bodySmall, { color: colors.muted }]}>{selectedNode.description}</ThemedText>

                {/* Progress */}
                <View style={styles.progressSection}>
                  <Row justify="space-between" align="center">
                    <ThemedText type="defaultSemiBold">Progress</ThemedText>
                    <ThemedText style={{ color: tree.themeColor }}>{selectedNode.xpCurrent}/{selectedNode.xpRequired} XP</ThemedText>
                  </Row>
                  <View style={[styles.progressBg, { backgroundColor: colors.border }]}>
                    <View style={[styles.progressFill, { backgroundColor: tree.themeColor, width: `${selectedNode.progress}%` }]} />
                  </View>
                </View>

                {/* Prerequisites */}
                {prereqNames.length > 0 && (
                  <View style={styles.prereqSection}>
                    <ThemedText type="defaultSemiBold">Prerequisites</ThemedText>
                    <Row wrap gap="xs">
                      {prereqNames.map((prereq) => (
                        <Row key={prereq.id} align="center" gap="xxs" style={[styles.prereqItem, { backgroundColor: prereq.isUnlocked ? withAlpha(colors.success, 0.09) : withAlpha(colors.error, 0.09) }]}>
                          <Ionicons name={prereq.isUnlocked ? 'checkmark-circle' : 'lock-closed'} size={14} color={prereq.isUnlocked ? colors.success : colors.error} />
                          <ThemedText style={[Typography.caption, { color: prereq.isUnlocked ? colors.success : colors.error }]}>{prereq.name}</ThemedText>
                        </Row>
                      ))}
                    </Row>
                  </View>
                )}

                {/* Badge reward */}
                {selectedNode.badgeId && (
                  <Row gap="xs" align="center" style={[styles.badgeReward, { backgroundColor: withAlpha(colors.warning, 0.09) }]}>
                    <Ionicons name="ribbon" size={18} color={colors.warning} />
                    <ThemedText style={{ color: colors.warning }}>Unlocking awards a badge!</ThemedText>
                  </Row>
                )}

                {/* Status */}
                {selectedNode.isUnlocked ? (
                  <Row gap="xs" align="center" justify="center" style={[styles.banner, { backgroundColor: withAlpha(colors.success, 0.09) }]}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <ThemedText style={[Typography.subheading, { color: colors.success }]}>Skill Unlocked!</ThemedText>
                  </Row>
                ) : (
                  <View style={styles.actionsRow}>
                    {__DEV__ && canUnlockSelected && (
                      <Row gap="xs" justify="center">
                        <Clickable style={[styles.xpButton, { borderColor: tree.themeColor }]} onPress={() => onAddXp(50)}>
                          <ThemedText style={{ color: tree.themeColor }}>+50 XP</ThemedText>
                        </Clickable>
                        <Clickable style={[styles.xpButton, { borderColor: tree.themeColor }]} onPress={() => onAddXp(100)}>
                          <ThemedText style={{ color: tree.themeColor }}>+100 XP</ThemedText>
                        </Clickable>
                      </Row>
                    )}
                    {canUnlockSelected ? (
                      <Button onPress={onUnlock}>Unlock Skill ({selectedNode.xpRequired} XP)</Button>
                    ) : (
                      <Row gap="xs" align="center" justify="center" style={[styles.banner, { backgroundColor: withAlpha(colors.muted, 0.09) }]}>
                        <Ionicons name="lock-closed" size={16} color={colors.muted} />
                        <ThemedText style={{ color: colors.muted }}>Complete prerequisites to unlock</ThemedText>
                      </Row>
                    )}
                  </View>
                )}
              </>
            )}
          </SurfaceCard>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  content: { width: '90%', maxWidth: 400 },
  card: { padding: Spacing.md, gap: Spacing.md },
  titleContainer: { flex: 1, gap: Spacing.xxs },
  levelPill: { alignSelf: 'flex-start', paddingHorizontal: Spacing.xs, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  closeButton: { width: 44, height: 44, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center' },
  progressSection: { gap: Spacing.xs },
  progressBg: { height: 8, borderRadius: Radii.xs, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radii.xs },
  prereqSection: { gap: Spacing.xs },
  prereqList: { /* layout moved to Row */ },
  prereqItem: { paddingHorizontal: Spacing.xs, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  badgeReward: { padding: Spacing.sm, borderRadius: Radii.md },
  banner: { padding: Spacing.md, borderRadius: Radii.md },
  actionsRow: { gap: Spacing.sm },
  xpButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderWidth: 1, borderRadius: Radii.pill },
});
