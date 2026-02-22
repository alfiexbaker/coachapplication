import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CompletionSummaryAthlete } from '@/hooks/use-session-completion';

interface CompletionSummaryProps {
  ratedAthletes: number;
  photosCaptured: number;
  videosRecorded: number;
  badgesAwarded: number;
  ratingDurationSeconds?: number;
  athletes: CompletionSummaryAthlete[];
  onOpenAthlete: (athlete: CompletionSummaryAthlete) => void;
  onDone: () => void;
}

interface SummaryStatProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}

const SummaryStat = memo(function SummaryStat({ icon, label }: SummaryStatProps) {
  const { colors } = useTheme();

  return (
    <Row align="center" gap="xs">
      <Ionicons name={icon} size={18} color={colors.tint} />
      <ThemedText style={styles.statText}>{label}</ThemedText>
    </Row>
  );
});

export const CompletionSummary = memo(function CompletionSummary({
  ratedAthletes,
  photosCaptured,
  videosRecorded,
  badgesAwarded,
  ratingDurationSeconds,
  athletes,
  onOpenAthlete,
  onDone,
}: CompletionSummaryProps) {
  const { colors } = useTheme();

  return (
    <Column gap="md">
      <SurfaceCard style={styles.summaryCard}>
        <Column gap="sm">
          <ThemedText style={styles.title}>Session Complete</ThemedText>
          <SummaryStat
            icon="checkmark-circle"
            label={`${ratedAthletes} ${ratedAthletes === 1 ? 'athlete' : 'athletes'} rated`}
          />
          {ratingDurationSeconds != null && ratingDurationSeconds > 0 ? (
            <SummaryStat
              icon="timer-outline"
              label={`Rated in ${ratingDurationSeconds} seconds`}
            />
          ) : null}
          <SummaryStat
            icon="camera"
            label={`${photosCaptured} ${photosCaptured === 1 ? 'photo' : 'photos'} captured`}
          />
          <SummaryStat
            icon="videocam"
            label={`${videosRecorded} ${videosRecorded === 1 ? 'video' : 'videos'} recorded`}
          />
          <SummaryStat
            icon="ribbon"
            label={`${badgesAwarded} ${badgesAwarded === 1 ? 'badge' : 'badges'} awarded`}
          />
        </Column>
      </SurfaceCard>

      <SurfaceCard style={styles.summaryCard}>
        <Column gap="sm">
          <ThemedText style={styles.title}>Add detailed notes?</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.muted }]}>
            Optional, for specific athletes.
          </ThemedText>

          <Row wrap gap="xs">
            {athletes.map((athlete) => (
              <Clickable
                key={athlete.registrationId}
                style={[
                  styles.athleteChip,
                  {
                    borderColor: colors.border,
                    backgroundColor: withAlpha(colors.tint, 0.05),
                  },
                ]}
                onPress={() => onOpenAthlete(athlete)}
                accessibilityLabel={`Open detailed feedback for ${athlete.athleteName}`}
                accessibilityRole="button"
              >
                <Row align="center" gap="xxs">
                  <ThemedText style={styles.chipText}>{athlete.athleteName}</ThemedText>
                  <Ionicons name="create-outline" size={14} color={colors.tint} />
                </Row>
              </Clickable>
            ))}
          </Row>
        </Column>
      </SurfaceCard>

      <Clickable
        style={[styles.doneButton, { backgroundColor: colors.tint }]}
        onPress={onDone}
        accessibilityLabel="Return to schedule"
        accessibilityRole="button"
      >
        <ThemedText style={[styles.doneText, { color: colors.onPrimary }]}>
          Done - Back to Schedule
        </ThemedText>
      </Clickable>
    </Column>
  );
});

const styles = StyleSheet.create({
  summaryCard: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
  },
  subtitle: {
    ...Typography.bodySmall,
  },
  statText: {
    ...Typography.bodySmall,
  },
  athleteChip: {
    minHeight: 44,
    borderRadius: Radii.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
  },
  chipText: {
    ...Typography.bodySmallSemiBold,
  },
  doneButton: {
    minHeight: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  doneText: {
    ...Typography.subheading,
  },
});
