import { useEffect } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Components, Radii, Spacing, Typography, withAlpha } from '@/constants/theme';

import { Confetti } from './confetti';
import { useTheme } from '@/hooks/useTheme';

export interface GoalCelebrationProps {
  visible: boolean;
  goalTitle: string;
  onShare?: () => void;
  onSetNewGoal?: () => void;
  onClose: () => void;
}

export function GoalCelebration({
  visible,
  goalTitle,
  onShare,
  onSetNewGoal,
  onClose,
}: GoalCelebrationProps) {
  const { colors: palette } = useTheme();
  const scaleAnim = useSharedValue(0);
  const progressAnim = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scaleAnim.value = 0;
      progressAnim.value = 0;

      // Sequence: spring scale in, then animate progress bar
      scaleAnim.value = withSpring(1, { damping: 12, stiffness: 150 }, (finished) => {
        if (finished) {
          progressAnim.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.quad) });
        }
      });
    }
  }, [visible, scaleAnim, progressAnim]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const progressAnimStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progressAnim.value * 100)}%`,
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <Confetti active={visible} />

        <Animated.View
          style={[
            styles.card,
            { backgroundColor: palette.surface },
            cardAnimStyle,
          ]}
        >
          {/* Target icon */}
          <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
            <Ionicons name="flag" size={48} color={palette.success} />
          </View>

          <ThemedText style={[Typography.display, { color: palette.text, textAlign: 'center' }]}>
            Goal Complete!
          </ThemedText>

          <ThemedText
            style={[Typography.bodySemiBold, { color: palette.text, textAlign: 'center' }]}
          >
            {goalTitle}
          </ThemedText>

          {/* Progress bar at 100% */}
          <View style={styles.progressContainer}>
            <View
              style={[styles.progressTrack, { backgroundColor: withAlpha(palette.success, 0.12) }]}
            >
              <Animated.View
                style={[
                  styles.progressFill,
                  { backgroundColor: palette.success },
                  progressAnimStyle,
                ]}
              />
            </View>
            <ThemedText style={[Typography.caption, { color: palette.success }]}>
              100%
            </ThemedText>
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            {onShare && (
              <Clickable
                onPress={onShare}
                style={[styles.primaryButton, { backgroundColor: palette.tint }]}
              >
                <Ionicons name="share-outline" size={Components.icon.md} color={palette.onPrimary} />
                <ThemedText style={[Typography.bodySemiBold, { color: palette.onPrimary }]}>
                  Share
                </ThemedText>
              </Clickable>
            )}

            {onSetNewGoal && (
              <Clickable
                onPress={onSetNewGoal}
                style={[styles.outlineButton, { borderColor: palette.tint }]}
              >
                <Ionicons name="add-outline" size={Components.icon.md} color={palette.tint} />
                <ThemedText style={[Typography.bodySemiBold, { color: palette.tint }]}>
                  Set New Goal
                </ThemedText>
              </Clickable>
            )}

            <Clickable
              onPress={onClose}
              style={[styles.secondaryButton, { borderColor: palette.border }]}
            >
              <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
                Close
              </ThemedText>
            </Clickable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: Components.modal.maxWidth,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  progressTrack: {
    flex: 1,
    height: Spacing.xs,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  buttonRow: {
    width: '100%',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: Components.button.height,
    borderRadius: Radii.button,
    gap: Spacing.xs,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: Components.button.height,
    borderRadius: Radii.button,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: Components.button.height,
    borderRadius: Radii.button,
    borderWidth: 1,
  },
});
