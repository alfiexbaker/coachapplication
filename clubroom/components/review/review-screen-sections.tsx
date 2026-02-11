import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

type HeaderProps = {
  colors: ThemeColors;
  submitted: boolean;
  onBack: () => void;
};

export const ReviewHeader = React.memo(function ReviewHeader({ colors, submitted, onBack }: HeaderProps) {
  return (
    <Row align="center" justify="space-between" style={styles.header}>
      <Clickable onPress={onBack} style={styles.backButton} accessibilityLabel="Go back">
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Clickable>
      <ThemedText type="title">{submitted ? 'Review Submitted' : 'Leave a Review'}</ThemedText>
      <View style={styles.headerSpacer} />
    </Row>
  );
});

type SessionCardProps = {
  colors: ThemeColors;
  coachName: string;
  service: string;
  scheduledAt?: string;
  formatDate: (value?: string) => string;
};

export const ReviewSessionCard = React.memo(function ReviewSessionCard({
  colors,
  coachName,
  service,
  scheduledAt,
  formatDate,
}: SessionCardProps) {
  return (
    <SurfaceCard style={styles.sessionCard}>
      <Row align="center" gap="md" style={styles.sessionHeader}>
        <View style={[styles.coachAvatar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
          <Ionicons name="person" size={24} color={colors.tint} />
        </View>
        <View style={styles.sessionInfo}>
          <ThemedText type="defaultSemiBold">{coachName}</ThemedText>
          <ThemedText style={[styles.sessionMeta, { color: colors.muted }]}>
            {service} - {formatDate(scheduledAt)}
          </ThemedText>
        </View>
      </Row>
    </SurfaceCard>
  );
});

type SuccessProps = {
  colors: ThemeColors;
  coachName?: string;
  submittedRating: number;
  onDone: () => void;
};

export const ReviewSuccessState = React.memo(function ReviewSuccessState({
  colors,
  coachName,
  submittedRating,
  onDone,
}: SuccessProps) {
  return (
    <View style={styles.successContainer}>
      <View style={[styles.successIcon, { backgroundColor: withAlpha(colors.success, 0.12) }]}>
        <Ionicons name="checkmark-circle" size={48} color={colors.success} />
      </View>
      <ThemedText type="subtitle" style={styles.successTitle}>Thank you for your feedback!</ThemedText>
      <ThemedText style={[styles.successText, { color: colors.muted }]}>
        Your {submittedRating}-star review has been submitted.
        {coachName ? ` ${coachName} will appreciate your feedback.` : ''}
      </ThemedText>

      <Clickable onPress={onDone} style={[styles.doneButton, { backgroundColor: colors.tint }]}>
        <ThemedText style={[styles.doneButtonText, { color: colors.onPrimary }]}>Done</ThemedText>
      </Clickable>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
    minHeight: 44,
    minWidth: 44,
  },
  headerSpacer: {
    width: 24,
  },
  sessionCard: {
    padding: Spacing.md,
  },
  sessionHeader: {},
  coachAvatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  sessionMeta: {
    ...Typography.small,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  successTitle: {
    textAlign: 'center',
  },
  successText: {
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
  },
  doneButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    marginTop: Spacing.md,
  },
  doneButtonText: {
    ...Typography.subheading,
  },
});
