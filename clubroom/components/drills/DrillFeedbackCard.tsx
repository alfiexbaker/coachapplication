/**
 * DrillFeedbackCard
 *
 * Displays the athlete's feedback on a completed drill.
 * Only rendered when the drill is completed and feedback exists.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';
import { useTheme } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DrillFeedbackCardProps {
  feedback: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function DrillFeedbackCardInner({ feedback }: DrillFeedbackCardProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.feedbackCard}>
      <View style={styles.sectionHeader}>
        <Ionicons name="chatbubbles-outline" size={18} color={palette.success} />
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Your Feedback
        </ThemedText>
      </View>
      <ThemedText style={[styles.feedbackText, { color: palette.text }]}>
        {feedback}
      </ThemedText>
    </SurfaceCard>
  );
}

export const DrillFeedbackCard = React.memo(DrillFeedbackCardInner);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  feedbackCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.body,
    fontSize: scaleFont(Typography.body.fontSize),
  },
  feedbackText: {
    ...Typography.body,
    fontSize: scaleFont(Typography.body.fontSize),
    lineHeight: scaleFont(22),
  },
});
