import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';
import { useTheme } from '@/hooks/useTheme';
import { progressService } from '@/services/progress-service';
import type { Goal } from '@/constants/types';
import { Row } from '@/components/primitives';

interface GoalMetaCardProps {
  goal: Goal;
}

export const GoalMetaCard = memo(function GoalMetaCard({ goal }: GoalMetaCardProps) {
  const { colors } = useTheme();
  const { label: statusLabel, color: statusColor } = progressService.getStatusInfo(goal.status);
  const isOverdue = progressService.isOverdue(goal);
  const completedMilestones = goal.milestones.filter((m) => m.isCompleted).length;

  return (
    <Animated.View entering={FadeInDown.delay(150).springify()}>
      <SurfaceCard style={styles.card}>
        <Row style={styles.row}>
          <Row style={styles.item}>
            <Ionicons name="flag-outline" size={20} color={colors.icon} />
            <View>
              <ThemedText style={[styles.label, { color: colors.muted }]}>Milestones</ThemedText>
              <ThemedText type="defaultSemiBold">
                {completedMilestones} / {goal.milestones.length}
              </ThemedText>
            </View>
          </Row>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Row style={styles.item}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={isOverdue ? colors.error : colors.icon}
            />
            <View>
              <ThemedText style={[styles.label, { color: colors.muted }]}>
                {isOverdue ? 'Overdue' : 'Target'}
              </ThemedText>
              <ThemedText
                type="defaultSemiBold"
                style={{ color: isOverdue ? colors.error : colors.text }}
              >
                {progressService.formatTargetDate(goal.targetDate)}
              </ThemedText>
            </View>
          </Row>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Row style={styles.item}>
            <Ionicons
              name={goal.status === 'COMPLETED' ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={statusColor}
            />
            <View>
              <ThemedText style={[styles.label, { color: colors.muted }]}>Status</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: statusColor }}>
                {statusLabel}
              </ThemedText>
            </View>
          </Row>
        </Row>
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: { padding: Spacing.md, marginBottom: Spacing.md },
  row: { alignItems: 'center' },
  item: { flex: 1, alignItems: 'center', gap: Spacing.xs },
  label: {
    ...Typography.caption,
    fontSize: scaleFont(Typography.caption.fontSize),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: { width: 1, height: 32, marginHorizontal: Spacing.sm },
});
