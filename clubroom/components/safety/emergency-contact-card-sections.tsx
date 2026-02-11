/**
 * EmergencyContactCard — Extracted sections
 *
 * Inline contact row variant for list use.
 */

import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { EmergencyContact } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// EmergencyContactInline
// ---------------------------------------------------------------------------

export interface EmergencyContactInlineProps {
  contact: EmergencyContact;
  onCall: () => void;
}

export const EmergencyContactInline = memo(function EmergencyContactInline({
  contact,
  onCall,
}: EmergencyContactInlineProps) {
  const { colors: palette } = useTheme();

  return (
    <Clickable onPress={onCall} style={styles.inlineContainer}>
      <Row align="center" gap="sm">
        <View style={[styles.inlineIcon, { backgroundColor: withAlpha(palette.success, 0.06) }]}>
          <Ionicons name="call" size={14} color={palette.success} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.inlineName} numberOfLines={1}>
            {contact.name}
          </ThemedText>
          <ThemedText style={[styles.inlinePhone, { color: palette.tint }]}>
            {contact.phone}
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={palette.muted} />
      </Row>
    </Clickable>
  );
});

const styles = StyleSheet.create({
  inlineContainer: {
    paddingVertical: Spacing.xs,
  },
  inlineIcon: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineName: { ...Typography.smallSemiBold },
  inlinePhone: { ...Typography.caption },
});
