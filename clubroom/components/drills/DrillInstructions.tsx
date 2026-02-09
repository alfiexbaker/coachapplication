/**
 * DrillInstructions
 *
 * Displays the instructions card and optional equipment card
 * on the drill detail screen.
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

interface DrillInstructionsProps {
  description: string;
  equipment?: string[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function DrillInstructionsInner({ description, equipment }: DrillInstructionsProps) {
  const { colors: palette } = useTheme();

  return (
    <View>
      {/* Instructions */}
      <SurfaceCard style={styles.instructionsCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text-outline" size={18} color={palette.tint} />
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Instructions
          </ThemedText>
        </View>
        <ThemedText style={[styles.instructionsText, { color: palette.text }]}>
          {description}
        </ThemedText>
      </SurfaceCard>

      {/* Equipment */}
      {equipment && equipment.length > 0 && (
        <SurfaceCard style={styles.equipmentCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="football-outline" size={18} color={palette.tint} />
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Equipment Needed
            </ThemedText>
          </View>
          <View style={styles.equipmentList}>
            {equipment.map((item, index) => (
              <View key={index} style={styles.equipmentItem}>
                <Ionicons name="checkmark" size={16} color={palette.success} />
                <ThemedText style={styles.equipmentText}>{item}</ThemedText>
              </View>
            ))}
          </View>
        </SurfaceCard>
      )}
    </View>
  );
}

export const DrillInstructions = React.memo(DrillInstructionsInner);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  instructionsCard: {
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
  instructionsText: {
    ...Typography.body,
    fontSize: scaleFont(Typography.body.fontSize),
    lineHeight: scaleFont(24),
  },
  equipmentCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  equipmentList: {
    gap: Spacing.xs,
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  equipmentText: {
    ...Typography.bodySmall,
    fontSize: scaleFont(Typography.bodySmall.fontSize),
  },
});
