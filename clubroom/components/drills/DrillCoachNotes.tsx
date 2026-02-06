/**
 * DrillCoachNotes
 *
 * Displays the optional coach notes card on the drill detail screen.
 * Shows the note text and the coach name attribution.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { scaleFont } from '@/utils/scale';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DrillCoachNotesProps {
  notes: string;
  coachName?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function DrillCoachNotesInner({ notes, coachName }: DrillCoachNotesProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SurfaceCard style={styles.notesCard}>
      <View style={styles.notesHeader}>
        <Ionicons name="chatbubble-outline" size={16} color={palette.tint} />
        <ThemedText type="defaultSemiBold" style={styles.notesTitle}>
          Coach Notes
        </ThemedText>
      </View>
      <ThemedText style={[styles.notesText, { color: palette.text }]}>
        {notes}
      </ThemedText>
      {coachName && (
        <ThemedText style={[styles.coachName, { color: palette.muted }]}>
          - {coachName}
        </ThemedText>
      )}
    </SurfaceCard>
  );
}

export const DrillCoachNotes = React.memo(DrillCoachNotesInner);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  notesCard: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  notesTitle: {
    ...Typography.bodySmall,
    fontSize: scaleFont(Typography.bodySmall.fontSize),
  },
  notesText: {
    ...Typography.body,
    fontSize: scaleFont(Typography.body.fontSize),
    lineHeight: scaleFont(22),
    fontStyle: 'italic',
  },
  coachName: {
    ...Typography.small,
    fontSize: scaleFont(Typography.small.fontSize),
    marginTop: Spacing.sm,
    textAlign: 'right',
  },
});
