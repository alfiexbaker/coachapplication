/**
 * DiscoverReviewPrompt — Review prompt cards for completed sessions.
 */
import { memo, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Row } from '@/components/primitives/row';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Routes } from '@/navigation/routes';
import { createLogger } from '@/utils/logger';
import type { Booking } from '@/constants/app-types';

const logger = createLogger('DiscoverReviewPrompt');

interface DiscoverReviewPromptProps {
  sessions: Booking[];
  onDismiss: (bookingId: string) => void;
}

function DiscoverReviewPromptInner({ sessions, onDismiss }: DiscoverReviewPromptProps) {
  const { colors: palette } = useTheme();

  if (sessions.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.section}>
      {sessions.map((session, index) => {
        const sessionDate = new Date(session.scheduledAt);
        const isToday = sessionDate.toDateString() === new Date().toDateString();
        const timeStr = sessionDate.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true });
        const dateStr = isToday
          ? `Today ${timeStr}`
          : `${sessionDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} ${timeStr}`;

        return (
          <Animated.View key={session.id} entering={FadeInDown.delay(index * 80).springify()}>
            <SurfaceCard style={[styles.card, { borderLeftColor: palette.warning }]}>
              <View style={styles.cardContent}>
                <View style={styles.info}>
                  <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={1}>
                    How was {session.athleteId ? `${session.athleteId}'s` : 'the'} session?
                  </ThemedText>
                  <ThemedText style={[styles.meta, { color: palette.muted }]} numberOfLines={1}>
                    with Coach {session.coachName || 'Coach'} -- {dateStr}
                  </ThemedText>
                </View>
                <Row gap="sm">
                  <Pressable
                    accessibilityLabel="Rate session now"
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.rateButton,
                      { backgroundColor: palette.tint, opacity: pressed ? 0.8 : 1 },
                    ]}
                    onPress={() => {
                      logger.press('RateNow', { bookingId: session.id });
                      router.push(Routes.reviewCreate(session.id, session.coachId));
                    }}
                  >
                    <Row align="center" gap="xs">
                      <Ionicons name="star" size={14} color={palette.surface} />
                      <ThemedText style={[styles.rateText, { color: palette.surface }]}>Rate Now</ThemedText>
                    </Row>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Rate later"
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.laterButton,
                      { borderColor: palette.border, opacity: pressed ? 0.7 : 1 },
                    ]}
                    onPress={() => onDismiss(session.id)}
                  >
                    <ThemedText style={[styles.laterText, { color: palette.muted }]}>Later</ThemedText>
                  </Pressable>
                </Row>
              </View>
            </SurfaceCard>
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

export const DiscoverReviewPrompt = memo(DiscoverReviewPromptInner);

const styles = StyleSheet.create({
  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.sm },
  card: { padding: Spacing.md, borderLeftWidth: 3 },
  cardContent: { gap: Spacing.sm },
  info: { gap: Spacing.xs / 2 },
  title: { ...Typography.subheading, letterSpacing: -0.2 },
  meta: { ...Typography.small },
  rateButton: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.sm, minHeight: 44,
  },
  rateText: { ...Typography.bodySmallSemiBold },
  laterButton: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.sm, borderWidth: 1, minHeight: 44,
  },
  laterText: { ...Typography.bodySmallSemiBold },
});
