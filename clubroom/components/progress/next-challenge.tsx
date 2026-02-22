import { memo, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { calculateDaysRemaining } from '@/constants/challenge-definitions';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ProgressChallenge } from '@/types/progress-types';
import { HapticPatterns } from '@/utils/haptics';

interface NextChallengeProps {
  challenge: ProgressChallenge | null;
  isNewUser: boolean;
}

function challengeProgressLabel(challenge: ProgressChallenge): string {
  return `${challenge.currentValue}/${challenge.targetValue}`;
}

export const NextChallenge = memo(function NextChallenge({
  challenge,
  isNewUser,
}: NextChallengeProps) {
  const { colors } = useTheme();
  const progress = challenge ? Math.max(0, Math.min(100, challenge.progress)) : 0;
  const progressRatio = useSharedValue(progress / 100);
  const metricPop = useSharedValue(0);
  const completeGlow = useSharedValue(0);
  const previousProgress = useRef(progress);
  const daysRemaining = useMemo(
    () => (challenge ? calculateDaysRemaining(challenge.expiresAt) : 0),
    [challenge],
  );

  useEffect(() => {
    progressRatio.value = withSpring(progress / 100, {
      damping: 16,
      stiffness: 110,
    });

    if (progress > previousProgress.current) {
      metricPop.value = withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(0, { duration: 140 }),
      );
    }
    if (progress >= 100 && previousProgress.current < 100) {
      completeGlow.value = withSequence(
        withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 260, easing: Easing.inOut(Easing.quad) }),
      );
      void HapticPatterns.challengeComplete();
    }
    previousProgress.current = progress;
  }, [completeGlow, metricPop, progress, progressRatio]);

  const progressFillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progressRatio.value)) * 100}%`,
  }));

  const metricStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + metricPop.value * 0.18 }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: completeGlow.value * 0.55,
  }));

  if (isNewUser) {
    return (
      <SurfaceCard
        style={[
          styles.card,
          {
            borderColor: withAlpha(colors.tint, 0.2),
            backgroundColor: withAlpha(colors.tint, 0.06),
          },
        ]}
      >
        <Column gap="xs">
          <Row align="center" gap="xxs">
            <Ionicons name="sparkles-outline" size={16} color={colors.tint} />
            <ThemedText style={styles.title}>Your First Challenge</ThemedText>
          </Row>
          <ThemedText style={[styles.body, { color: colors.muted }]}>
            Complete your first session to unlock weekly challenges and bonus badges.
          </ThemedText>
        </Column>
      </SurfaceCard>
    );
  }

  if (!challenge) {
    return (
      <SurfaceCard
        style={[
          styles.card,
          {
            borderColor: withAlpha(colors.tint, 0.2),
            backgroundColor: withAlpha(colors.tint, 0.06),
          },
        ]}
      >
        <Column gap="xs">
          <Row align="center" gap="xxs">
            <Ionicons name="flag-outline" size={16} color={colors.tint} />
            <ThemedText style={styles.title}>Next Challenge</ThemedText>
          </Row>
          <ThemedText style={[styles.body, { color: colors.muted }]}>
            We&apos;re preparing your next challenge.
          </ThemedText>
        </Column>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard
      style={[
        styles.card,
        {
          borderColor: withAlpha(colors.tint, 0.2),
          backgroundColor: withAlpha(colors.tint, 0.06),
        },
      ]}
    >
      <Column gap="sm">
        <Row align="center" gap="xxs">
          <Ionicons name="flag-outline" size={16} color={colors.tint} />
          <ThemedText style={styles.title}>Next Challenge</ThemedText>
        </Row>

        <Column gap="xxs">
          <ThemedText style={styles.challengeTitle}>{challenge.title}</ThemedText>
          <ThemedText style={[styles.body, { color: colors.muted }]}>{challenge.description}</ThemedText>
        </Column>

        <Column gap="micro">
          <View style={[styles.progressTrack, { backgroundColor: withAlpha(colors.tint, 0.14) }]}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.progressGlow,
                glowStyle,
                { backgroundColor: withAlpha(colors.tint, 0.35) },
              ]}
            />
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.tint,
                },
                progressFillStyle,
              ]}
            />
          </View>
          <Row align="center" justify="between">
            <ThemedText style={[styles.meta, { color: colors.muted }]}>
              {challengeProgressLabel(challenge)}
            </ThemedText>
            <Animated.View style={metricStyle}>
              <ThemedText style={[styles.meta, { color: colors.muted }]}>{progress}%</ThemedText>
            </Animated.View>
          </Row>
        </Column>

        <Row align="center" justify="between" wrap gap="xxs">
          <Row align="center" gap="xxs">
            <Ionicons name="ribbon-outline" size={14} color={colors.tint} />
            <ThemedText style={[styles.meta, { color: colors.muted }]}>
              Reward: {challenge.rewardLabel}
            </ThemedText>
          </Row>
          <Row align="center" gap="xxs">
            <Ionicons name="time-outline" size={14} color={colors.muted} />
            <ThemedText style={[styles.meta, { color: colors.muted }]}>
              {daysRemaining} day{daysRemaining === 1 ? '' : 's'} left
            </ThemedText>
          </Row>
        </Row>
      </Column>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    gap: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
    fontWeight: '700',
  },
  challengeTitle: {
    ...Typography.bodySemiBold,
  },
  body: {
    ...Typography.bodySmall,
  },
  progressTrack: {
    height: 8,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  progressGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radii.pill,
  },
  meta: {
    ...Typography.caption,
  },
});
