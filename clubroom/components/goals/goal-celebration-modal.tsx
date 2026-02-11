import { memo, type RefObject } from 'react';
import { StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';
import { useTheme } from '@/hooks/useTheme';

interface GoalCelebrationModalProps {
  visible: boolean;
  title: string;
  confettiRef: RefObject<ConfettiCannon | null>;
  celebrationStyle: Record<string, unknown>;
}

export const GoalCelebrationModal = memo(function GoalCelebrationModal({
  visible, title, confettiRef, celebrationStyle,
}: GoalCelebrationModalProps) {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.overlay, { backgroundColor: withAlpha(colors.text, 0.5) }]}>
        <Animated.View style={[styles.content, { backgroundColor: colors.surface }, celebrationStyle]}>
          <Animated.View style={[styles.icon, { backgroundColor: colors.success }]}>
            <Ionicons name="trophy" size={48} color={colors.onPrimary} />
          </Animated.View>
          <ThemedText type="title" style={styles.title}>Goal Achieved!</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.muted }]}>
            Congratulations on completing &quot;{title}&quot;
          </ThemedText>
        </Animated.View>
        <ConfettiCannon
          ref={confettiRef}
          count={100}
          origin={{ x: -10, y: 0 }}
          autoStart={false}
          fadeOut
          explosionSpeed={350}
          fallSpeed={3000}
        />
      </Animated.View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', gap: Spacing.md, padding: Spacing.xl, borderRadius: Radii.xl, marginHorizontal: Spacing.xl },
  icon: { width: 80, height: 80, borderRadius: Radii['2xl'], alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', ...Typography.body, fontSize: scaleFont(Typography.body.fontSize) },
});
