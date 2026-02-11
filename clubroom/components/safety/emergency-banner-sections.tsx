/**
 * Extracted sub-components for emergency-banner.
 *
 * MedicalAlertPill — compact alert pill for lists/headers.
 * EmergencyCallButton — quick call button for emergency contact.
 */

import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { EmergencyContact } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

// --- MedicalAlertPill --------------------------------------------------------

export function MedicalAlertPill({
  allergiesCount,
  conditionsCount,
  onPress,
}: {
  allergiesCount: number;
  conditionsCount: number;
  onPress?: () => void;
}) {
  const { colors: palette } = useTheme();

  if (allergiesCount === 0 && conditionsCount === 0) {
    return null;
  }

  const color = allergiesCount > 0 ? palette.error : palette.warning;
  const label = allergiesCount > 0 ? `${allergiesCount} allergy` : `${conditionsCount} condition`;

  return (
    <Clickable
      onPress={onPress}
      style={[styles.alertPill, { backgroundColor: withAlpha(color, 0.06) }]}
    >
      <Row align="center" gap="xxs">
        <Ionicons name="medical" size={12} color={color} />
        <ThemedText style={[styles.alertPillText, { color }]}>{label}</ThemedText>
      </Row>
    </Clickable>
  );
}

// --- EmergencyCallButton -----------------------------------------------------

const CALL_SIZE_CONFIG = {
  small: { icon: 16, padding: Spacing.xs },
  medium: { icon: 20, padding: Spacing.sm },
  large: { icon: 24, padding: Spacing.md },
} as const;

export function EmergencyCallButton({
  contact,
  onPress,
  size = 'medium',
}: {
  contact: EmergencyContact;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}) {
  const { colors: palette } = useTheme();
  const config = CALL_SIZE_CONFIG[size];

  return (
    <Clickable
      onPress={onPress}
      style={[
        styles.callButton,
        {
          backgroundColor: palette.success,
          padding: config.padding,
        },
      ]}
    >
      <Row align="center" gap="xs">
        <Ionicons name="call" size={config.icon} color={palette.onSuccess} />
        {size !== 'small' && (
          <ThemedText style={[styles.callButtonText, { color: palette.onSuccess }]}>
            Call {contact.name.split(' ')[0]}
          </ThemedText>
        )}
      </Row>
    </Clickable>
  );
}

// --- Styles ------------------------------------------------------------------

export const styles = StyleSheet.create({
  banner: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  bannerHeader: {
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  alertLabel: {
    ...Typography.caption,
    marginBottom: Spacing.micro,
  },
  contactSection: {
    padding: Spacing.sm,
    borderTopWidth: 1,
  },
  compactBanner: {
    padding: Spacing.xs,
    borderRadius: Radii.md,
  },
  compactItem: {
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  compactText: { ...Typography.caption },
  alertPill: {
    paddingVertical: Spacing.micro,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
  },
  alertPillText: { ...Typography.caption },
  callButton: {
    borderRadius: Radii.pill,
  },
  callButtonText: { ...Typography.bodySmallSemiBold },
});
