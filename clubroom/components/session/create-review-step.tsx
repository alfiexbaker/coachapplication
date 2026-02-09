/**
 * CreateReviewStep — Step 3 of session creation wizard.
 *
 * Shows a summary card with all session details for final review.
 */

import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row, Column } from '@/components/primitives';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { FootballObjective, SessionInviteType } from '@/constants/types';
import {
  type SessionType,
  type RecurrenceType,
  SESSION_TYPES,
  DURATION_OPTIONS,
  RECURRENCE_OPTIONS,
} from './create-session-types';

// ============================================================================
// PROPS
// ============================================================================

interface CreateReviewStepProps {
  colors: ThemeColors;
  sessionType: SessionType;
  title: string;
  description: string;
  duration: number;
  selectedDate: string;
  selectedTime: string;
  recurrence: RecurrenceType;
  location: string;
  price: string;
  focusAreas: FootballObjective[];
  maxParticipants: string;
  inviteType: SessionInviteType;
  defaultMaxParticipants: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const CreateReviewStep = memo(function CreateReviewStep({
  colors,
  sessionType,
  title,
  description,
  duration,
  selectedDate,
  selectedTime,
  recurrence,
  location,
  price,
  focusAreas,
  maxParticipants,
  inviteType,
  defaultMaxParticipants,
}: CreateReviewStepProps) {
  const typeConfig = useMemo(() => SESSION_TYPES.find(t => t.key === sessionType), [sessionType]);
  const durationLabel = useMemo(
    () => DURATION_OPTIONS.find(d => d.value === duration)?.label || `${duration} min`,
    [duration],
  );
  const recurrenceLabel = useMemo(
    () => RECURRENCE_OPTIONS.find(r => r.key === recurrence)?.label || 'One-time',
    [recurrence],
  );
  const participants = maxParticipants || defaultMaxParticipants;

  const visibilityNote = useMemo(() => {
    switch (inviteType) {
      case 'OPEN':
        return 'Your session will be visible to all athletes once published.';
      case 'CLOSED':
        return 'Only invited athletes will be able to see this session.';
      case 'SQUAD_ONLY':
        return 'Only squad members will be able to see this session.';
    }
  }, [inviteType]);

  return (
    <Animated.View entering={FadeInRight.springify()}>
      <Column gap="md">
        <SurfaceCard style={styles.reviewCard}>
          {/* Title + Badge */}
          <Row align="flex-start" justify="between" gap="md">
            <ThemedText type="title" style={styles.reviewTitle}>
              {title || 'Untitled Session'}
            </ThemedText>
            <Row align="center" gap="xxs" style={[styles.typeBadge, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
              <Ionicons name={typeConfig?.icon || 'fitness'} size={14} color={colors.tint} />
              <ThemedText style={[styles.typeBadgeText, { color: colors.tint }]}>
                {typeConfig?.label}
              </ThemedText>
            </Row>
          </Row>

          {/* Description */}
          {description ? (
            <ThemedText style={[styles.reviewDescription, { color: colors.muted }]}>
              {description}
            </ThemedText>
          ) : null}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Details Grid */}
          <Column gap="md">
            <Row align="flex-start" gap="sm">
              <Ionicons name="time-outline" size={18} color={colors.muted} />
              <Column>
                <ThemedText style={[styles.itemLabel, { color: colors.muted }]}>Duration</ThemedText>
                <ThemedText type="defaultSemiBold">{durationLabel}</ThemedText>
              </Column>
            </Row>

            <Row align="flex-start" gap="sm">
              <Ionicons name="calendar-outline" size={18} color={colors.muted} />
              <Column>
                <ThemedText style={[styles.itemLabel, { color: colors.muted }]}>Schedule</ThemedText>
                <ThemedText type="defaultSemiBold">
                  {selectedDate} at {selectedTime}
                </ThemedText>
                <ThemedText style={{ color: colors.muted, ...Typography.caption }}>
                  {recurrenceLabel}
                </ThemedText>
              </Column>
            </Row>

            <Row align="flex-start" gap="sm">
              <Ionicons name="location-outline" size={18} color={colors.muted} />
              <Column style={styles.flex}>
                <ThemedText style={[styles.itemLabel, { color: colors.muted }]}>Location</ThemedText>
                <ThemedText type="defaultSemiBold" numberOfLines={2}>
                  {location}
                </ThemedText>
              </Column>
            </Row>

            <Row align="flex-start" gap="sm">
              <Ionicons name="people-outline" size={18} color={colors.muted} />
              <Column>
                <ThemedText style={[styles.itemLabel, { color: colors.muted }]}>Capacity</ThemedText>
                <ThemedText type="defaultSemiBold">
                  {participants} {sessionType === '1on1' ? 'athlete' : 'athletes'}
                </ThemedText>
              </Column>
            </Row>
          </Column>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Price */}
          <Row align="center" justify="between">
            <ThemedText style={{ color: colors.muted }}>Price per session</ThemedText>
            <ThemedText type="title" style={{ color: colors.tint }}>
              {price && parseFloat(price) > 0 ? `$${parseFloat(price).toFixed(2)}` : 'Free'}
            </ThemedText>
          </Row>

          {/* Focus Areas */}
          {focusAreas.length > 0 && (
            <Column gap="xs">
              <ThemedText style={[styles.itemLabel, { color: colors.muted }]}>
                Focus Areas
              </ThemedText>
              <Row wrap gap="xs">
                {focusAreas.map(area => (
                  <View
                    key={area}
                    style={[styles.focusTag, { backgroundColor: withAlpha(colors.success, 0.09) }]}
                  >
                    <ThemedText style={[styles.focusTagText, { color: colors.success }]}>
                      {area}
                    </ThemedText>
                  </View>
                ))}
              </Row>
            </Column>
          )}
        </SurfaceCard>

        <ThemedText style={[styles.reviewNote, { color: colors.muted }]}>
          {visibilityNote}
        </ThemedText>
      </Column>
    </Animated.View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  reviewCard: {
    gap: Spacing.md,
  },
  reviewTitle: {
    flex: 1,
    ...Typography.title,
  },
  typeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  typeBadgeText: {
    ...Typography.caption,
  },
  reviewDescription: {
    ...Typography.bodySmall,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  itemLabel: {
    ...Typography.caption,
    marginBottom: Spacing.micro,
  },
  flex: {
    flex: 1,
  },
  focusTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  focusTagText: {
    ...Typography.caption,
  },
  reviewNote: {
    textAlign: 'center',
    ...Typography.small,
    marginTop: Spacing.md,
  },
});
