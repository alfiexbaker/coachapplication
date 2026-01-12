/**
 * CelebrationOverlay - Reusable celebration component with confetti and haptics
 *
 * Use this for WOW moments: badge awards, goal completions, streaks, first bookings, etc.
 */
import { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface CelebrationOverlayRef {
  celebrate: (options?: CelebrationOptions) => void;
}

export interface CelebrationOptions {
  title?: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  duration?: number;
  confettiCount?: number;
}

interface CelebrationOverlayProps {
  onComplete?: () => void;
}

export const CelebrationOverlay = forwardRef<CelebrationOverlayRef, CelebrationOverlayProps>(
  ({ onComplete }, ref) => {
    const scheme = useColorScheme() ?? 'light';
    const palette = Colors[scheme];
    const confettiRef = useRef<ConfettiCannon>(null);

    const visible = useSharedValue(false);
    const scale = useSharedValue(0);
    const opacity = useSharedValue(0);
    const titleOpacity = useSharedValue(0);

    const [showModal, setShowModal] = React.useState(false);
    const [options, setOptions] = React.useState<CelebrationOptions>({});

    const hide = useCallback(() => {
      opacity.value = withSpring(0, { damping: 15 }, () => {
        runOnJS(setShowModal)(false);
        if (onComplete) {
          runOnJS(onComplete)();
        }
      });
    }, [opacity, onComplete]);

    const celebrate = useCallback((opts: CelebrationOptions = {}) => {
      setOptions(opts);
      setShowModal(true);
      visible.value = true;

      // Trigger haptics - celebratory pattern
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 100);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 200);

      // Animate in
      opacity.value = withSpring(1, { damping: 12 });
      scale.value = withSequence(
        withSpring(1.3, { damping: 8 }),
        withSpring(1, { damping: 10 })
      );
      titleOpacity.value = withDelay(300, withSpring(1, { damping: 12 }));

      // Fire confetti
      setTimeout(() => {
        confettiRef.current?.start();
      }, 100);

      // Auto-hide after duration
      const duration = opts.duration ?? 3000;
      setTimeout(hide, duration);
    }, [opacity, scale, titleOpacity, hide]);

    useImperativeHandle(ref, () => ({ celebrate }), [celebrate]);

    const containerStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
    }));

    const iconStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const titleStyle = useAnimatedStyle(() => ({
      opacity: titleOpacity.value,
      transform: [{ translateY: withSpring(titleOpacity.value > 0 ? 0 : 20) }],
    }));

    const icon = options.icon ?? 'ribbon';
    const iconColor = options.iconColor ?? '#FFD700';
    const title = options.title ?? 'Amazing!';
    const subtitle = options.subtitle;

    return (
      <Modal visible={showModal} transparent animationType="none">
        <Animated.View style={[styles.overlay, containerStyle]}>
          <View style={styles.content}>
            <Animated.View style={[styles.iconContainer, iconStyle]}>
              <View style={[styles.iconCircle, { backgroundColor: `${iconColor}20` }]}>
                <Ionicons name={icon} size={64} color={iconColor} />
              </View>
            </Animated.View>

            <Animated.View style={[styles.textContainer, titleStyle]}>
              <ThemedText style={[styles.title, { color: '#fff' }]}>{title}</ThemedText>
              {subtitle && (
                <ThemedText style={[styles.subtitle, { color: 'rgba(255,255,255,0.8)' }]}>
                  {subtitle}
                </ThemedText>
              )}
            </Animated.View>
          </View>

          <ConfettiCannon
            ref={confettiRef}
            count={options.confettiCount ?? 150}
            origin={{ x: -10, y: 0 }}
            autoStart={false}
            fadeOut
            fallSpeed={3000}
            explosionSpeed={350}
            colors={['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']}
          />
        </Animated.View>
      </Modal>
    );
  }
);

// Need to import React for useState
import React from 'react';

CelebrationOverlay.displayName = 'CelebrationOverlay';

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    maxWidth: 280,
  },
});
