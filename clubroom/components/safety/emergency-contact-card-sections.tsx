/**
 * EmergencyContactCard — Extracted sections
 *
 * Inline contact row variant for list use.
 */

import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { EmergencyContact } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { uiFeedback } from '@/services/ui-feedback';

// ---------------------------------------------------------------------------
// EmergencyContactInline
// ---------------------------------------------------------------------------

export interface EmergencyContactInlineProps {
  contact: EmergencyContact;
  onCall: () => void;
  /** When false, tapping shows contact details instead of calling */
  isActiveSession?: boolean;
  onViewDetails?: () => void;
}

export const EmergencyContactInline = memo(function EmergencyContactInline({
  contact,
  onCall,
  isActiveSession = false,
  onViewDetails,
}: EmergencyContactInlineProps) {
  const { colors: palette } = useTheme();

  const handlePress = useCallback(() => {
    if (!isActiveSession) {
      // Outside active session — show details, don't call
      if (onViewDetails) {
        onViewDetails();
      } else {
        uiFeedback.alert(
          'Emergency Contact',
          `${contact.name}\n${contact.phone}\n${contact.relationship}`,
          [{ text: 'OK' }],
        );
      }
      return;
    }

    // During active session — confirm before calling
    uiFeedback.alert(
      'Call Emergency Contact?',
      `This will call ${contact.name} (${contact.relationship}) at ${contact.phone}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call Now', style: 'destructive', onPress: onCall },
      ],
    );
  }, [contact, isActiveSession, onCall, onViewDetails]);

  return (
    <Clickable onPress={handlePress} style={styles.inlineContainer}>
      <Row align="center" gap="sm">
        <View style={[styles.inlineIcon, { backgroundColor: withAlpha(palette.success, 0.06) }]}>
          <Ionicons name="call" size={14} color={palette.success} />
        </View>
        <Column flex>
          <ThemedText style={styles.inlineName} numberOfLines={1}>
            {contact.name}
          </ThemedText>
          <ThemedText style={[styles.inlinePhone, { color: palette.tint }]}>
            {contact.phone}
          </ThemedText>
        </Column>
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
