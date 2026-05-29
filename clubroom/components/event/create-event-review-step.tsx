import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';
import type { ClubEventType, EventTargetAudience } from '@/constants/types';
import { Row } from '@/components/primitives';

interface CreateEventReviewStepProps {
  eventType: ClubEventType;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  isVirtual: boolean;
  venue: string;
  targetAudience: EventTargetAudience | 'SQUADS' | 'SPECIFIC_ATHLETES';
  selectedSquadIds: string[];
  selectedAthleteIds: string[];
  price: string;
}

function CreateEventReviewStepInner({
  eventType,
  title,
  description,
  date,
  startTime,
  endTime,
  isVirtual,
  venue,
  targetAudience,
  selectedSquadIds,
  selectedAthleteIds,
  price,
}: CreateEventReviewStepProps) {
  const { colors: palette } = useTheme();
  const typeColor = eventService.getEventTypeColor(eventType);

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>
        Review your event
      </ThemedText>

      <SurfaceCard style={styles.reviewCard}>
        <Row style={[styles.reviewTypeBadge, { backgroundColor: withAlpha(typeColor, 0.12) }]}>
          <Ionicons
            name={eventService.getEventTypeIcon(eventType) as keyof typeof Ionicons.glyphMap}
            size={16}
            color={typeColor}
          />
          <ThemedText style={[styles.reviewTypeText, { color: typeColor }]}>
            {eventService.formatEventType(eventType)}
          </ThemedText>
        </Row>

        <ThemedText type="subtitle" style={styles.reviewTitle}>
          {title}
        </ThemedText>

        {description ? (
          <ThemedText style={[styles.reviewDescription, { color: palette.muted }]}>
            {description}
          </ThemedText>
        ) : null}

        <View style={[styles.reviewDivider, { backgroundColor: palette.border }]} />

        <Row style={styles.reviewRow}>
          <Ionicons name="calendar-outline" size={18} color={palette.icon} />
          <ThemedText>
            {date} at {startTime}
            {endTime && ` - ${endTime}`}
          </ThemedText>
        </Row>

        <Row style={styles.reviewRow}>
          <Ionicons name="location-outline" size={18} color={palette.icon} />
          <ThemedText>{isVirtual ? 'Online (Virtual)' : venue}</ThemedText>
        </Row>

        <Row style={styles.reviewRow}>
          <Ionicons name="people-outline" size={18} color={palette.icon} />
          <ThemedText>
            {targetAudience === 'SQUADS'
              ? `Specific Squads (${selectedSquadIds.length} selected)`
              : targetAudience === 'SPECIFIC_ATHLETES'
                ? `Specific Athletes (${selectedAthleteIds.length} selected)`
                : eventService.formatAudience(targetAudience as EventTargetAudience)}
          </ThemedText>
        </Row>

        <Row style={styles.reviewRow}>
          <Ionicons name="cash-outline" size={18} color={palette.icon} />
          <ThemedText>{eventService.formatPrice(parseFloat(price) || 0, 'GBP')}</ThemedText>
        </Row>
      </SurfaceCard>
    </Animated.View>
  );
}

export const CreateEventReviewStep = CreateEventReviewStepInner;

const styles = StyleSheet.create({
  stepContent: {
    gap: Spacing.lg,
  },
  stepTitle: {
    textAlign: 'center',
  },
  reviewCard: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  reviewTypeBadge: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  reviewTypeText: {
    ...Typography.smallSemiBold,
    fontSize: scaleFont(Typography.smallSemiBold.fontSize),
  },
  reviewTitle: {
    marginTop: Spacing.xs,
  },
  reviewDescription: {
    ...Typography.bodySmall,
    fontSize: scaleFont(Typography.bodySmall.fontSize),
    lineHeight: scaleFont(20),
  },
  reviewDivider: {
    height: 1,
    // backgroundColor set inline for dynamic theming
    marginVertical: Spacing.sm,
  },
  reviewRow: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
});
