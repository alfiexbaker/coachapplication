import React, { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { HapticPatterns } from '@/utils/haptics';

export type CelebrationVariant =
  | 'badge_earned'
  | 'skill_level_up'
  | 'goal_completed'
  | 'challenge_complete'
  | 'streak_milestone'
  | 'level_up'
  | 'default';

export interface CelebrationOverlayRef {
  celebrate: (options?: CelebrationOptions) => void;
}

export interface CelebrationOptions {
  variant?: CelebrationVariant;
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

interface VariantConfig {
  icon: keyof typeof Ionicons.glyphMap;
  confettiCount: number;
  duration: number;
  haptic: () => Promise<void>;
  confettiColors: string[];
}

const VARIANT_CONFIGS: Record<CelebrationVariant, VariantConfig> = {
  badge_earned: {
    icon: 'ribbon',
    confettiCount: 80,
    duration: 2000,
    haptic: HapticPatterns.success,
    confettiColors: ['#0EA5E9', '#22C55E', '#F59E0B', '#EF4444'],
  },
  skill_level_up: {
    icon: 'trending-up',
    confettiCount: 60,
    duration: 1500,
    haptic: HapticPatterns.tap,
    confettiColors: ['#0EA5E9', '#22C55E', '#A855F7', '#FACC15'],
  },
  goal_completed: {
    icon: 'checkmark-circle',
    confettiCount: 100,
    duration: 2000,
    haptic: HapticPatterns.success,
    confettiColors: ['#22C55E', '#16A34A', '#86EFAC', '#4ADE80'],
  },
  challenge_complete: {
    icon: 'trophy',
    confettiCount: 120,
    duration: 2500,
    haptic: HapticPatterns.challengeComplete,
    confettiColors: ['#F59E0B', '#EAB308', '#F97316', '#EF4444'],
  },
  streak_milestone: {
    icon: 'flame',
    confettiCount: 100,
    duration: 2000,
    haptic: HapticPatterns.milestone,
    confettiColors: ['#F97316', '#EF4444', '#FB923C', '#FDBA74'],
  },
  level_up: {
    icon: 'trophy',
    confettiCount: 200,
    duration: 3000,
    haptic: HapticPatterns.levelUp,
    confettiColors: ['#F59E0B', '#A855F7', '#60A5FA', '#34D399'],
  },
  default: {
    icon: 'sparkles',
    confettiCount: 90,
    duration: 2000,
    haptic: HapticPatterns.success,
    confettiColors: ['#F59E0B', '#60A5FA', '#34D399', '#F472B6'],
  },
};

export const CelebrationOverlay = forwardRef<CelebrationOverlayRef, CelebrationOverlayProps>(
  ({ onComplete }, ref) => {
    const { colors } = useTheme();
    const confettiRef = useRef<ConfettiCannon>(null);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const overlayOpacity = useSharedValue(0);
    const iconScale = useSharedValue(0.6);
    const titleScale = useSharedValue(0.7);
    const subtitleOpacity = useSharedValue(0);

    const [visible, setVisible] = useState(false);
    const [options, setOptions] = useState<CelebrationOptions>({});

    const clearHideTimeout = useCallback(() => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    }, []);

    const hide = useCallback(() => {
      clearHideTimeout();
      overlayOpacity.value = withTiming(0, { duration: 180 });
      iconScale.value = withTiming(0.9, { duration: 160 });
      titleScale.value = withTiming(0.9, { duration: 160 });
      subtitleOpacity.value = withTiming(0, { duration: 150 });

      setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 190);
    }, [clearHideTimeout, iconScale, onComplete, overlayOpacity, subtitleOpacity, titleScale]);

    const celebrate = useCallback(
      (opts: CelebrationOptions = {}) => {
        clearHideTimeout();
        const variant = opts.variant ?? 'default';
        const config = VARIANT_CONFIGS[variant];
        setOptions(opts);
        setVisible(true);

        overlayOpacity.value = 0;
        iconScale.value = 0.6;
        titleScale.value = 0.7;
        subtitleOpacity.value = 0;

        overlayOpacity.value = withTiming(1, { duration: 160 });
        iconScale.value = withSpring(1, { damping: 11, stiffness: 130 });
        titleScale.value = withDelay(80, withSpring(1, { damping: 10, stiffness: 110 }));
        subtitleOpacity.value = withDelay(180, withTiming(1, { duration: 160 }));

        void config.haptic();
        setTimeout(() => {
          confettiRef.current?.start();
        }, 120);

        const duration = opts.duration ?? config.duration;
        hideTimeoutRef.current = setTimeout(hide, duration);
      },
      [
        clearHideTimeout,
        hide,
        iconScale,
        overlayOpacity,
        subtitleOpacity,
        titleScale,
      ],
    );

    useImperativeHandle(ref, () => ({ celebrate }), [celebrate]);

    const variant = options.variant ?? 'default';
    const config = VARIANT_CONFIGS[variant];
    const icon = options.icon ?? config.icon;
    const iconColor = options.iconColor ?? colors.tint;
    const title = options.title ?? 'Achievement Unlocked';
    const subtitle = options.subtitle;
    const confettiCount = options.confettiCount ?? config.confettiCount;

    const overlayStyle = useAnimatedStyle(() => ({
      opacity: overlayOpacity.value,
    }));
    const iconStyle = useAnimatedStyle(() => ({
      transform: [{ scale: iconScale.value }],
    }));
    const titleStyle = useAnimatedStyle(() => ({
      transform: [{ scale: titleScale.value }],
    }));
    const subtitleStyle = useAnimatedStyle(() => ({
      opacity: subtitleOpacity.value,
    }));

    return (
      <Modal transparent visible={visible} animationType="none">
        <Animated.View
          style={[
            styles.overlay,
            { backgroundColor: withAlpha(colors.text, 0.82) },
            overlayStyle,
          ]}
        >
          <View style={styles.content}>
            <Animated.View style={[styles.iconContainer, iconStyle]}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: withAlpha(iconColor, 0.14),
                    borderColor: withAlpha(iconColor, 0.35),
                  },
                ]}
              >
                <Ionicons name={icon} size={58} color={iconColor} />
              </View>
            </Animated.View>

            <Animated.View style={titleStyle}>
              <ThemedText style={[styles.title, { color: colors.onPrimary }]}>{title}</ThemedText>
            </Animated.View>

            {subtitle ? (
              <Animated.View style={subtitleStyle}>
                <ThemedText style={[styles.subtitle, { color: withAlpha(colors.onPrimary, 0.88) }]}>
                  {subtitle}
                </ThemedText>
              </Animated.View>
            ) : null}
          </View>

          <ConfettiCannon
            ref={confettiRef}
            count={confettiCount}
            origin={{ x: -10, y: 0 }}
            autoStart={false}
            fadeOut
            fallSpeed={3000}
            explosionSpeed={350}
            colors={config.confettiColors}
          />
        </Animated.View>
      </Modal>
    );
  },
);

CelebrationOverlay.displayName = 'CelebrationOverlay';

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 124,
    height: 124,
    borderRadius: Radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...Typography.display,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  subtitle: {
    ...Typography.subheading,
    textAlign: 'center',
    maxWidth: 290,
  },
});
