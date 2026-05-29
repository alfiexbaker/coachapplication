import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { MomentData } from '@/types/progress-types';

interface MomentHeroProps {
  moment: MomentData;
  athleteName: string;
  isParentView?: boolean;
  onOpenUpcomingSessions?: () => void;
}

// ─── Floating ambient particle ───
interface ParticleProps {
  size: number;
  color: string;
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  duration: number;
  delay: number;
}

const Particle = function Particle({
  size,
  color,
  startX,
  startY,
  driftX,
  driftY,
  duration,
  delay: delayMs,
}: ParticleProps) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.set(withTiming(1, { duration: 600 }));
    progress.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, [delayMs, duration, opacity, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value * 0.12,
    transform: [
      { translateX: startX + progress.value * driftX },
      { translateY: startY + progress.value * driftY },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
};

// ─── Pulsing icon ───
const PulsingIcon = function PulsingIcon({
  name,
  color,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.set(
      withRepeat(
        withSequence(
          withTiming(1.12, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      ),
    );
  }, [pulse]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View style={style}>
      <Ionicons name={name} size={28} color={color} />
    </Animated.View>
  );
};

function getHeroCopy(
  moment: MomentData,
  athleteName: string,
  isParentView: boolean,
): {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  accentKey: 'tint' | 'warning' | 'success' | 'info';
} {
  switch (moment.type) {
    case 'feedback_received': {
      const coachFirstName = moment.feedback?.coachName?.split(' ')[0];
      return {
        icon: 'chatbubble-ellipses',
        title:
          isParentView && coachFirstName
            ? `Coach ${coachFirstName} just rated ${athleteName}`
            : 'New Feedback',
        subtitle: moment.feedback?.publicSummary || `Coach feedback is ready for ${athleteName}.`,
        accentKey: 'tint',
      };
    }
    case 'badge_earned':
      return {
        icon: 'ribbon',
        title: isParentView
          ? `${athleteName} earned: ${moment.badge?.badgeLabel ?? 'New Badge'}`
          : 'Badge Unlocked!',
        subtitle: moment.badge?.badgeLabel || `${athleteName} earned a new badge.`,
        accentKey: 'warning',
      };
    case 'goal_completed':
      return {
        icon: 'checkmark-circle',
        title: isParentView ? `${athleteName} completed a goal` : 'Goal Completed',
        subtitle: moment.goal?.title || `${athleteName} completed a training goal.`,
        accentKey: 'success',
      };
    case 'skill_level_up':
      return {
        icon: 'trending-up',
        title: isParentView ? `${athleteName} levelled up` : 'Skill Level Up',
        subtitle: `${athleteName} moved up a level in training this week.`,
        accentKey: 'info',
      };
    case 'streak_milestone':
      return {
        icon: 'flame',
        title: isParentView
          ? `${athleteName} hit ${moment.streakWeeks} weeks`
          : `${moment.streakWeeks} Week Milestone`,
        subtitle: isParentView
          ? 'Amazing consistency — the habit is sticking.'
          : 'Consistency is building real momentum.',
        accentKey: 'warning',
      };
    case 'session_upcoming':
      return {
        icon: 'calendar',
        title: 'Session Upcoming',
        subtitle: moment.nextSession
          ? `${moment.nextSession.coachName} • ${new Date(moment.nextSession.date).toLocaleString()}`
          : 'Next training session is within 24 hours.',
        accentKey: 'tint',
      };
    case 'welcome':
      return {
        icon: 'sparkles',
        title: isParentView
          ? `Welcome to ${athleteName}'s Progress`
          : 'Welcome to Your Progress Journey',
        subtitle: isParentView
          ? `Once ${athleteName} completes a session, you'll see skills, badges, and coach feedback here.`
          : 'Complete your first session to start tracking skills, badges, and coach feedback.',
        accentKey: 'tint',
      };
    case 'challenge_completed':
      return {
        icon: 'trophy',
        title: isParentView ? `${athleteName} completed a challenge` : 'Challenge Complete!',
        subtitle: 'A challenge was completed recently.',
        accentKey: 'success',
      };
    case 'media_captured': {
      const mediaCount = moment.media?.length ?? 0;
      return {
        icon: 'camera',
        title: isParentView ? `New photos from ${athleteName}'s session` : 'New Session Media',
        subtitle:
          mediaCount > 0
            ? `${mediaCount} new ${mediaCount === 1 ? 'photo' : 'photos'} from training.`
            : 'Fresh training media has been captured.',
        accentKey: 'info',
      };
    }
    case 'weekly_recap':
      return {
        icon: 'newspaper',
        title: isParentView ? `${athleteName}'s week in review` : 'Your Weekly Recap',
        subtitle: `${athleteName} had a productive week of training.`,
        accentKey: 'info',
      };
    case 'streak_active':
    default:
      return {
        icon: 'flame',
        title: `${moment.streakWeeks} Week Streak`,
        subtitle: isParentView
          ? `${athleteName} is keeping the rhythm going.`
          : 'Keep the rhythm going this week.',
        accentKey: 'warning',
      };
  }
}

// ─── Particle config ───
const PARTICLES: Omit<ParticleProps, 'color'>[] = [
  { size: 6, startX: 20, startY: 10, driftX: 15, driftY: -10, duration: 3400, delay: 0 },
  { size: 4, startX: 80, startY: 60, driftX: -10, driftY: 12, duration: 4200, delay: 200 },
  { size: 8, startX: 200, startY: 20, driftX: -20, driftY: -8, duration: 3800, delay: 400 },
  { size: 5, startX: 260, startY: 80, driftX: 12, driftY: -15, duration: 3600, delay: 100 },
  { size: 7, startX: 140, startY: 100, driftX: -8, driftY: 10, duration: 4000, delay: 300 },
  { size: 4, startX: 310, startY: 40, driftX: -15, driftY: -5, duration: 3200, delay: 500 },
];

export const MomentHero = function MomentHero({
  moment,
  athleteName,
  isParentView = false,
  onOpenUpcomingSessions,
}: MomentHeroProps) {
  const { colors } = useTheme();
  const copy = getHeroCopy(moment, athleteName, isParentView);
  const accent = colors[copy.accentKey];

  // Entry animation: spring scale 0.95→1
  const entryScale = useSharedValue(0.95);
  const entryOpacity = useSharedValue(0);

  useEffect(() => {
    entryOpacity.set(withTiming(1, { duration: 300 }));
    entryScale.set(withSpring(1, { damping: 14, stiffness: 120 }));
  }, [entryOpacity, entryScale]);

  const entryStyle = useAnimatedStyle(() => ({
    opacity: entryOpacity.value,
    transform: [{ scale: entryScale.value }],
  }));

  return (
    <Animated.View style={entryStyle}>
      <View
        style={[
          styles.card,
          {
            borderColor: withAlpha(accent, 0.25),
            backgroundColor: withAlpha(accent, 0.07),
          },
        ]}
      >
        {/* Floating ambient particles */}
        {PARTICLES.map((p) => (
          <Particle key={`${p.startX}:${p.startY}:${p.delay}`} {...p} color={accent} />
        ))}

        <Column gap="sm" style={styles.content}>
          <Row align="center" gap="xs">
            <View style={[styles.iconWrap, { backgroundColor: withAlpha(accent, 0.2) }]}>
              <PulsingIcon name={copy.icon} color={accent} />
            </View>
            <Column gap="xxs" style={styles.textBlock}>
              <ThemedText style={styles.title}>{copy.title}</ThemedText>
              <ThemedText style={[styles.subtitle, { color: colors.muted }]}>
                {copy.subtitle}
              </ThemedText>
            </Column>
          </Row>

          {moment.type === 'welcome' ? (
            <Clickable
              style={[styles.ctaButton, { backgroundColor: colors.tint }]}
              onPress={onOpenUpcomingSessions}
              accessibilityLabel="View upcoming sessions"
              accessibilityRole="button"
            >
              <Row align="center" justify="center" gap="xxs">
                <ThemedText style={[styles.ctaText, { color: colors.onPrimary }]}>
                  View Upcoming Sessions
                </ThemedText>
                <Ionicons name="arrow-forward" size={16} color={colors.onPrimary} />
              </Row>
            </Clickable>
          ) : null}
        </Column>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radii.card,
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    padding: Spacing.sm,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    ...Typography.heading,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.bodySmall,
  },
  ctaButton: {
    minHeight: 44,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  ctaText: {
    ...Typography.bodySmallSemiBold,
  },
});
