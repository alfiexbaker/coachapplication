import { memo, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { CORNER_COLORS } from '@/constants/four-corner-mapping';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { DailyChallengeDefinition } from '@/constants/daily-challenges';
import { HapticPatterns } from '@/utils/haptics';

interface DailyChallengeBannerProps {
  challenge: DailyChallengeDefinition | null;
  isCompleted: boolean;
  onMarkComplete: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  technical: 'football-outline',
  physical: 'fitness-outline',
  psychological: 'bulb-outline',
  social: 'people-outline',
};

const DIFFICULTY_XP_LABEL: Record<string, string> = {
  easy: 'Quick',
  medium: 'Standard',
  hard: 'Challenge',
};

export const DailyChallengeBanner = memo(function DailyChallengeBanner({
  challenge,
  isCompleted,
  onMarkComplete,
}: DailyChallengeBannerProps) {
  const { colors } = useTheme();
  const pulseScale = useSharedValue(1);
  const checkScale = useSharedValue(0);

  const categoryColor = challenge ? (CORNER_COLORS[challenge.category as keyof typeof CORNER_COLORS] ?? colors.tint) : colors.tint;
  const categoryIcon = challenge ? (CATEGORY_ICONS[challenge.category] ?? 'flash-outline') : 'flash-outline';

  useEffect(() => {
    if (!isCompleted) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
      checkScale.value = withSequence(
        withTiming(1.3, { duration: 180, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 120 }),
      );
    }
  }, [checkScale, isCompleted, pulseScale]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isCompleted ? checkScale.value : pulseScale.value }],
  }));

  const handleComplete = useCallback(() => {
    if (isCompleted) return;
    void HapticPatterns.dailyChallengeComplete();
    onMarkComplete();
  }, [isCompleted, onMarkComplete]);

  const difficultyLabel = useMemo(
    () => (challenge ? DIFFICULTY_XP_LABEL[challenge.difficulty] ?? challenge.difficulty : ''),
    [challenge],
  );

  if (!challenge) return null;

  return (
    <Animated.View entering={FadeInDown.duration(400).springify()}>
      <Clickable
        onPress={handleComplete}
        disabled={isCompleted}
        accessibilityRole="button"
        accessibilityLabel={
          isCompleted
            ? `Daily challenge completed: ${challenge.title}`
            : `Complete daily challenge: ${challenge.title}`
        }
        style={[
          styles.banner,
          {
            backgroundColor: isCompleted
              ? withAlpha(colors.success, 0.1)
              : withAlpha(categoryColor, 0.08),
            borderColor: isCompleted
              ? withAlpha(colors.success, 0.3)
              : withAlpha(categoryColor, 0.25),
          },
        ]}
      >
        <Row align="center" gap="sm">
          <Animated.View
            style={[
              styles.iconWrap,
              { backgroundColor: withAlpha(isCompleted ? colors.success : categoryColor, 0.15) },
              iconStyle,
            ]}
          >
            <Ionicons
              name={
                isCompleted
                  ? 'checkmark-circle'
                  : (categoryIcon as React.ComponentProps<typeof Ionicons>['name'])
              }
              size={22}
              color={isCompleted ? colors.success : categoryColor}
            />
          </Animated.View>

          <Column gap="micro" style={styles.textWrap}>
            <Row align="center" gap="xxs">
              <ThemedText style={styles.label}>Today's Practice</ThemedText>
              <View
                style={[
                  styles.difficultyPill,
                  { backgroundColor: withAlpha(categoryColor, 0.15) },
                ]}
              >
                <ThemedText style={[styles.difficultyText, { color: categoryColor }]}>
                  {difficultyLabel}
                </ThemedText>
              </View>
            </Row>

            <ThemedText
              style={[
                styles.title,
                isCompleted && { textDecorationLine: 'line-through', color: colors.muted },
              ]}
              numberOfLines={1}
            >
              {challenge.title}
            </ThemedText>

            <ThemedText style={[styles.description, { color: colors.muted }]} numberOfLines={2}>
              {challenge.description}
            </ThemedText>
          </Column>
        </Row>

        {isCompleted ? (
          <View style={[styles.completedStrip, { backgroundColor: withAlpha(colors.success, 0.12) }]}>
            <Ionicons name="checkmark" size={12} color={colors.success} />
            <ThemedText style={[styles.completedText, { color: colors.success }]}>
              Completed today
            </ThemedText>
          </View>
        ) : null}
      </Clickable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    overflow: 'hidden',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  label: {
    ...Typography.micro,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    ...Typography.bodySmallSemiBold,
  },
  description: {
    ...Typography.caption,
  },
  difficultyPill: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.xs,
  },
  difficultyText: {
    ...Typography.micro,
    fontWeight: '600',
  },
  completedStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.xs,
    marginHorizontal: -Spacing.sm,
    marginBottom: -Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  completedText: {
    ...Typography.micro,
    fontWeight: '600',
  },
});
