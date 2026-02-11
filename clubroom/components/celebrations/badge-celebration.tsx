import { useEffect, useRef } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Components, Radii, Spacing, Typography, withAlpha } from '@/constants/theme';

import { Confetti } from './confetti';
import { useTheme } from '@/hooks/useTheme';

export interface BadgeCelebrationProps {
  visible: boolean;
  athleteName: string;
  coachName: string;
  reason: string;
  onShareWithFamily?: () => void;
  onClose: () => void;
}

export function BadgeCelebration({
  visible,
  athleteName,
  coachName,
  reason,
  onShareWithFamily,
  onClose,
}: BadgeCelebrationProps) {
  const { colors: palette } = useTheme();
  const scaleAnim = useSharedValue(0);
  const opacityAnim = useSharedValue(0);
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      scaleAnim.value = 0;
      opacityAnim.value = 0;

      scaleAnim.value = withSpring(1, { damping: 12, stiffness: 150 });
      opacityAnim.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });

      autoDismissTimer.current = setTimeout(() => {
        onClose();
      }, 5000);
    }

    return () => {
      if (autoDismissTimer.current) {
        clearTimeout(autoDismissTimer.current);
      }
    };
  }, [visible, scaleAnim, opacityAnim, onClose]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
    opacity: opacityAnim.value,
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.overlay, { backgroundColor: withAlpha(palette.text, 0.6) }]}>
        <Confetti active={visible} />

        <Animated.View
          style={[
            styles.card,
            { backgroundColor: palette.surface },
            cardAnimStyle,
          ]}
        >
          {/* Trophy icon */}
          <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
            <Ionicons name="trophy" size={48} color={palette.warning} />
          </View>

          <ThemedText style={[Typography.display, { color: palette.text, textAlign: 'center' }]}>
            Badge Earned!
          </ThemedText>

          <ThemedText style={[Typography.body, { color: palette.muted, textAlign: 'center' }]}>
            {athleteName}
          </ThemedText>

          <ThemedText
            style={[Typography.bodySemiBold, { color: palette.text, textAlign: 'center' }]}
          >
            {reason}
          </ThemedText>

          <ThemedText style={[Typography.small, { color: palette.muted, textAlign: 'center' }]}>
            Awarded by Coach {coachName}
          </ThemedText>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            {onShareWithFamily && (
              <Clickable
                onPress={onShareWithFamily}
                style={[styles.primaryButton, { backgroundColor: palette.tint }]}
              >
                <Ionicons name="share-outline" size={Components.icon.md} color={palette.onPrimary} />
                <ThemedText style={[Typography.bodySemiBold, { color: palette.onPrimary }]}>
                  Share with Family
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
  buttonRow: {
    width: '100%',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: Components.button.height,
    borderRadius: Radii.button,
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
