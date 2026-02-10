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
import { Row } from '@/components/primitives';

interface GoalActionsSectionProps {
  status: GoalStatus;
  onStatusChange: (status: GoalStatus) => void;
}

export const GoalActionsSection = memo(function GoalActionsSection({ status, onStatusChange }: GoalActionsSectionProps) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.container}>
      {status === 'ACTIVE' && (
        <Row style={styles.buttons}>
          <Button variant="outline" onPress={() => onStatusChange('PAUSED')} style={styles.button}>
            <Row style={styles.buttonContent}>
              <Ionicons name="pause-outline" size={18} color={colors.text} />
              <ThemedText style={styles.buttonText}>Pause Goal</ThemedText>
            </Row>
          </Button>
          <Button onPress={() => onStatusChange('COMPLETED')} style={[styles.button, { backgroundColor: colors.success }]}>
            <Row style={styles.buttonContent}>
              <Ionicons name="checkmark-circle-outline" size={18} color={colors.onPrimary} />
              <ThemedText style={[styles.buttonText, { color: colors.onPrimary }]}>Complete Goal</ThemedText>
            </Row>
          </Button>
        </Row>
      )}

      {status === 'PAUSED' && (
        <Row style={styles.buttons}>
          <Button onPress={() => onStatusChange('ACTIVE')} style={styles.button}>
            <Row style={styles.buttonContent}>
              <Ionicons name="play-outline" size={18} color={colors.onPrimary} />
              <ThemedText style={[styles.buttonText, { color: colors.onPrimary }]}>Resume Goal</ThemedText>
            </Row>
          </Button>
          <Button variant="outline" onPress={() => onStatusChange('ABANDONED')} style={styles.button}>
            <Row style={styles.buttonContent}>
              <Ionicons name="close-circle-outline" size={18} color={colors.error} />
              <ThemedText style={[styles.buttonText, { color: colors.error }]}>Abandon</ThemedText>
            </Row>
          </Button>
        </Row>
      )}

      {status === 'COMPLETED' && (
        <SurfaceCard style={styles.completedCard} outlineGradient={[colors.success, colors.tint]}>
          <Row style={styles.completedContent}>
            <Ionicons name="trophy" size={32} color={colors.success} />
            <View style={styles.completedText}>
              <ThemedText type="defaultSemiBold" style={{ color: colors.success }}>Goal Achieved!</ThemedText>
              <ThemedText style={[styles.subtext, { color: colors.muted }]}>Congratulations on completing this goal!</ThemedText>
            </View>
          </Row>
        </SurfaceCard>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  buttons: { gap: Spacing.sm },
  button: { flex: 1 },
  buttonContent: { alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs },
  buttonText: { fontWeight: '600' },
  completedCard: { padding: Spacing.lg },
  completedContent: { alignItems: 'center', gap: Spacing.md },
  completedText: { flex: 1, gap: Spacing.micro },
  subtext: { ...Typography.small, fontSize: scaleFont(Typography.small.fontSize) },
});
