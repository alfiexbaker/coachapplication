/**
 * RSVPFlow - Parent RSVP Interface
 *
 * Presents session details and three large response buttons for parents
 * to confirm their child's attendance at a group session.
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { createCardStyles } from '@/constants/styles';
import { ThemedText } from '@/components/themed-text';

import { ResponseButton } from './rsvp-flow-sections';
import {
  formatSessionDate,
  formatSessionTime,
  getTimeUntilDeadline,
} from './rsvp-flow-helpers';

import { runAsyncFinally } from '@/utils/async-control';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RSVPFlowProps {
  sessionId: string;
  sessionTitle: string;
  sessionDate: string;
  location: string;
  childName: string;
  rsvpId: string;
  onRespond: (status: 'going' | 'not_going' | 'maybe') => Promise<boolean>;
  responseDeadline?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RSVPFlow({
  sessionId,
  sessionTitle,
  sessionDate,
  location,
  childName,
  rsvpId,
  onRespond,
  responseDeadline,
}: RSVPFlowProps) {
  const { colors } = useTheme();
  const CardStyles = createCardStyles(colors);

  const [selectedStatus, setSelectedStatus] = useState<'going' | 'not_going' | 'maybe' | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const deadlineLabel = (() => {
    if (!responseDeadline) return null;
    return getTimeUntilDeadline(responseDeadline);
  })();

  const handlePress = async (status: 'going' | 'not_going' | 'maybe') => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    await runAsyncFinally(async () => {
      const success = await onRespond(status);
      if (success) {
        setSelectedStatus(status);
      }
    }, () => {
      setIsSubmitting(false);
    });
  };

  return (
    <View style={styles.container}>
      {/* Session Info Card */}
      <View style={[CardStyles.base, styles.infoCard]}>
        <ThemedText style={[styles.childLabel, { color: colors.muted }]}>
          RSVP for {childName}
        </ThemedText>
        <ThemedText style={[styles.sessionTitle, { color: colors.text }]}>
          {sessionTitle}
        </ThemedText>

        <Row align="center" gap="xs">
          <Ionicons name="calendar-outline" size={18} color={colors.muted} />
          <ThemedText style={[styles.detailText, { color: colors.muted }]}>
            {formatSessionDate(sessionDate)}
          </ThemedText>
        </Row>

        <Row align="center" gap="xs">
          <Ionicons name="time-outline" size={18} color={colors.muted} />
          <ThemedText style={[styles.detailText, { color: colors.muted }]}>
            {formatSessionTime(sessionDate)}
          </ThemedText>
        </Row>

        <Row align="center" gap="xs">
          <Ionicons name="location-outline" size={18} color={colors.muted} />
          <ThemedText style={[styles.detailText, { color: colors.muted }]}>{location}</ThemedText>
        </Row>

        {deadlineLabel && (
          <Row
            align="center"
            gap="xs"
            style={[styles.deadlineBanner, { backgroundColor: withAlpha(colors.warning, 0.09) }]}
          >
            <Ionicons name="hourglass-outline" size={14} color={colors.warning} />
            <ThemedText style={[styles.deadlineText, { color: colors.warning }]}>
              {deadlineLabel}
            </ThemedText>
          </Row>
        )}
      </View>

      {/* Response Buttons */}
      <View style={styles.responseSection}>
        <ThemedText style={[styles.responseLabel, { color: colors.text }]}>
          Will {childName} attend?
        </ThemedText>

        <ResponseButton
          status="going"
          label="Going"
          selectedIcon="checkmark-circle"
          outlineIcon="checkmark-circle-outline"
          accentColor={colors.success}
          surfaceColor={colors.surface}
          isSelected={selectedStatus === 'going'}
          isSubmitting={isSubmitting}
          onPress={handlePress}
        />

        <ResponseButton
          status="not_going"
          label="Can't Make It"
          selectedIcon="close-circle"
          outlineIcon="close-circle-outline"
          accentColor={colors.error}
          surfaceColor={colors.surface}
          isSelected={selectedStatus === 'not_going'}
          isSubmitting={isSubmitting}
          onPress={handlePress}
        />

        <ResponseButton
          status="maybe"
          label="Maybe"
          selectedIcon="help-circle"
          outlineIcon="help-circle-outline"
          accentColor={colors.warning}
          surfaceColor={colors.surface}
          isSelected={selectedStatus === 'maybe'}
          isSubmitting={isSubmitting}
          onPress={handlePress}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  infoCard: {
    gap: Spacing.sm,
  },
  childLabel: {
    ...Typography.micro,
    letterSpacing: 0.6,
  },
  sessionTitle: {
    ...Typography.title,
  },
  detailRow: {},
  detailText: {
    ...Typography.body,
  },
  deadlineBanner: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    marginTop: Spacing.xs,
  },
  deadlineText: {
    ...Typography.smallSemiBold,
  },
  responseSection: {
    gap: Spacing.sm,
  },
  responseLabel: {
    ...Typography.heading,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
});

export default RSVPFlow;
