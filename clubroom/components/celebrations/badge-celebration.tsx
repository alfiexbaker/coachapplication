import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Components, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { Confetti } from './confetti';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 12,
          stiffness: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

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

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <Confetti active={visible} />

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: palette.surface,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
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
                <Ionicons name="share-outline" size={Components.icon.md} color="#FFFFFF" />
                <ThemedText style={[Typography.bodySemiBold, { color: '#FFFFFF' }]}>
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
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: Components.button.height,
    borderRadius: Radii.button,
    borderWidth: 1,
  },
});
