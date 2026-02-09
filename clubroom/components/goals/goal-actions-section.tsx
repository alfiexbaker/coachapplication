import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';
import { useTheme } from '@/hooks/useTheme';
import type { GoalStatus } from '@/constants/types';

interface GoalActionsSectionProps {
  status: GoalStatus;
  onStatusChange: (status: GoalStatus) => void;
}

export const GoalActionsSection = memo(function GoalActionsSection({ status, onStatusChange }: GoalActionsSectionProps) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.container}>
      {status === 'ACTIVE' && (
        <View style={styles.buttons}>
          <Button variant="outline" onPress={() => onStatusChange('PAUSED')} style={styles.button}>
            <View style={styles.buttonContent}>
              <Ionicons name="pause-outline" size={18} color={colors.text} />
              <ThemedText style={styles.buttonText}>Pause Goal</ThemedText>
            </View>
          </Button>
          <Button onPress={() => onStatusChange('COMPLETED')} style={[styles.button, { backgroundColor: colors.success }]}>
            <View style={styles.buttonContent}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.onPrimary} />
              <ThemedText style={[styles.buttonText, { color: colors.onPrimary }]}>Complete Goal</ThemedText>
            </View>
          </Button>
        </View>
      )}

      {status === 'PAUSED' && (
        <View style={styles.buttons}>
          <Button onPress={() => onStatusChange('ACTIVE')} style={styles.button}>
            <View style={styles.buttonContent}>
              <Ionicons name="play-outline" size={18} color={colors.onPrimary} />
              <ThemedText style={[styles.buttonText, { color: colors.onPrimary }]}>Resume Goal</ThemedText>
            </View>
          </Button>
          <Button variant="outline" onPress={() => onStatusChange('ABANDONED')} style={styles.button}>
            <View style={styles.buttonContent}>
              <Ionicons name="close-circle-outline" size={18} color={colors.error} />
              <ThemedText style={[styles.buttonText, { color: colors.error }]}>Abandon</ThemedText>
            </View>
          </Button>
        </View>
      )}

      {status === 'COMPLETED' && (
        <SurfaceCard style={styles.completedCard} outlineGradient={[colors.success, colors.tint]}>
          <View style={styles.completedContent}>
            <Ionicons name="trophy" size={32} color={colors.success} />
            <View style={styles.completedText}>
              <ThemedText type="defaultSemiBold" style={{ color: colors.success }}>Goal Achieved!</ThemedText>
              <ThemedText style={[styles.subtext, { color: colors.muted }]}>Congratulations on completing this goal!</ThemedText>
            </View>
          </View>
        </SurfaceCard>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  buttons: { flexDirection: 'row', gap: Spacing.sm },
  button: { flex: 1 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs },
  buttonText: { fontWeight: '600' },
  completedCard: { padding: Spacing.lg },
  completedContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  completedText: { flex: 1, gap: Spacing.micro },
  subtext: { ...Typography.small, fontSize: scaleFont(Typography.small.fontSize) },
});
