import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { groupSessionService } from '@/services/group-session-service';
import type { GroupSession, FootballObjective, SessionInviteType } from '@/constants/types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const INVITE_TYPE_LABELS: Record<SessionInviteType, string> = {
  OPEN: 'Open — Anyone can join',
  CLOSED: 'Invite Only',
  SQUAD_ONLY: 'Squad Members Only',
};

interface CreateSessionReviewStepProps {
  sessionType: GroupSession['sessionType'];
  inviteType: SessionInviteType;
  title: string;
  location: string;
  scheduleDate: string;
  scheduleStartTime: string;
  scheduleEndTime: string;
  maxParticipants: string;
  price: string;
  focus: FootballObjective[];
  isRecurring?: boolean;
  recurringDayOfWeek?: number;
  recurringUntil?: string;
}

function CreateSessionReviewStepInner({
  sessionType,
  inviteType,
  title,
  location,
  scheduleDate,
  scheduleStartTime,
  scheduleEndTime,
  maxParticipants,
  price,
  focus,
  isRecurring,
  recurringDayOfWeek,
  recurringUntil,
}: CreateSessionReviewStepProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>
        Review & Create
      </ThemedText>

      <SurfaceCard style={styles.reviewCard}>
        <View style={styles.reviewRow}>
          <ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Type</ThemedText>
          <ThemedText type="defaultSemiBold">
            {groupSessionService.formatSessionType(sessionType)}
          </ThemedText>
        </View>
        <View style={styles.reviewRow}>
          <ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Visibility</ThemedText>
          <ThemedText type="defaultSemiBold">{INVITE_TYPE_LABELS[inviteType]}</ThemedText>
        </View>
        <View style={styles.reviewRow}>
          <ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Title</ThemedText>
          <ThemedText type="defaultSemiBold">{title}</ThemedText>
        </View>
        <View style={styles.reviewRow}>
          <ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Location</ThemedText>
          <ThemedText>{location}</ThemedText>
        </View>
        <View style={styles.reviewRow}>
          <ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>
            {isRecurring ? 'Schedule' : 'Date'}
          </ThemedText>
          <View style={{ alignItems: 'flex-end' }}>
            {isRecurring && recurringDayOfWeek != null && recurringDayOfWeek >= 0 ? (
              <>
                <ThemedText type="defaultSemiBold">
                  Every {DAY_NAMES[recurringDayOfWeek]}
                </ThemedText>
                <ThemedText>{scheduleStartTime} - {scheduleEndTime}</ThemedText>
                {recurringUntil ? (
                  <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
                    Until {recurringUntil}
                  </ThemedText>
                ) : null}
              </>
            ) : (
              <ThemedText>{scheduleDate} ({scheduleStartTime} - {scheduleEndTime})</ThemedText>
            )}
          </View>
        </View>
        <View style={styles.reviewRow}>
          <ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Capacity</ThemedText>
          <ThemedText>{maxParticipants} participants</ThemedText>
        </View>
        <View style={styles.reviewRow}>
          <ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Price</ThemedText>
          <ThemedText type="defaultSemiBold">
            {groupSessionService.formatPrice(parseFloat(price) || 0, 'GBP')}
          </ThemedText>
        </View>
        {focus.length > 0 && (
          <View style={styles.reviewRow}>
            <ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Focus</ThemedText>
            <ThemedText>{focus.join(', ')}</ThemedText>
          </View>
        )}
      </SurfaceCard>
    </Animated.View>
  );
}

export const CreateSessionReviewStep = React.memo(CreateSessionReviewStepInner);

const styles = StyleSheet.create({
  stepContent: {
    gap: Spacing.lg,
  },
  stepTitle: {
    textAlign: 'center',
  },
  reviewCard: {
    gap: Spacing.sm,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  reviewLabel: {
    ...Typography.small,
    flex: 1,
  },
});
