import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { MedicalInfo, EmergencyContact } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted components for backward compat
export { MedicalAlertPill, EmergencyCallButton } from './emergency-banner-sections';

type EmergencyBannerProps = {
  medical: MedicalInfo;
  primaryContact?: EmergencyContact | null;
  onPressContact?: () => void;
  onPressMedical?: () => void;
  compact?: boolean;
  /** When false, contact phone is hidden and tap shows info instead of calling */
  isActiveSession?: boolean;
};

export function EmergencyBanner({
  medical,
  primaryContact,
  onPressContact,
  onPressMedical,
  compact = false,
  isActiveSession = false,
}: EmergencyBannerProps) {
  const { colors: palette } = useTheme();

  const hasAllergies = medical.allergies.length > 0;
  const hasConditions = medical.conditions.length > 0;
  const hasMedications = medical.medications.length > 0;
  const hasAlerts = hasAllergies || hasConditions || hasMedications;

  if (!hasAlerts && !primaryContact) {
    return null;
  }

  const getSeverityColor = () => {
    if (medical.allergies.length >= 2 || medical.conditions.length >= 2) {
      return palette.error;
    }
    if (hasAllergies || hasConditions) {
      return palette.warning;
    }
    return palette.muted;
  };

  const severityColor = getSeverityColor();

  if (compact) {
    return (
      <Row
        gap="xs"
        style={[styles.compactBanner, { backgroundColor: withAlpha(severityColor, 0.06) }]}
      >
        {hasAlerts && (
          <Clickable
            onPress={onPressMedical}
            style={[styles.compactItem, { borderColor: withAlpha(severityColor, 0.19) }]}
          >
            <Row align="center" gap="xxs">
              <Ionicons name="medical" size={16} color={severityColor} />
              <ThemedText style={[styles.compactText, { color: severityColor }]}>
                {hasAllergies
                  ? `${medical.allergies.length} allergy`
                  : hasConditions
                    ? `${medical.conditions.length} condition`
                    : 'Medical info'}
              </ThemedText>
            </Row>
          </Clickable>
        )}
        {primaryContact && (
          <Clickable
            onPress={onPressContact}
            style={[styles.compactItem, { borderColor: withAlpha(palette.tint, 0.19) }]}
          >
            <Row align="center" gap="xxs">
              <Ionicons name="call" size={16} color={palette.tint} />
              <ThemedText style={[styles.compactText, { color: palette.tint }]}>
                {primaryContact.name.split(' ')[0]}
              </ThemedText>
            </Row>
          </Clickable>
        )}
      </Row>
    );
  }

  return (
    <View style={[styles.banner, { borderColor: withAlpha(severityColor, 0.25) }]}>
      <Row
        align="center"
        gap="sm"
        style={[styles.bannerHeader, { borderBottomColor: palette.border }]}
      >
        <View style={[styles.iconContainer, { backgroundColor: withAlpha(severityColor, 0.09) }]}>
          <Ionicons name="warning" size={20} color={severityColor} />
        </View>
        <ThemedText type="defaultSemiBold" style={{ color: severityColor }}>
          Safety Information
        </ThemedText>
      </Row>

      {hasAlerts && (
        <Clickable onPress={onPressMedical}>
          <View style={styles.section}>
            {hasAllergies && (
              <Row align="start" gap="sm">
                <Ionicons name="alert-circle" size={16} color={palette.error} />
                <Column flex>
                  <ThemedText style={[styles.alertLabel, { color: palette.muted }]}>
                    Allergies
                  </ThemedText>
                  <ThemedText style={{ color: palette.text }}>
                    {medical.allergies.join(', ')}
                  </ThemedText>
                </Column>
              </Row>
            )}

            {hasConditions && (
              <Row align="start" gap="sm">
                <Ionicons name="medical" size={16} color={palette.warning} />
                <Column flex>
                  <ThemedText style={[styles.alertLabel, { color: palette.muted }]}>
                    Conditions
                  </ThemedText>
                  <ThemedText style={{ color: palette.text }}>
                    {medical.conditions.join(', ')}
                  </ThemedText>
                </Column>
              </Row>
            )}

            {hasMedications && (
              <Row align="start" gap="sm">
                <Ionicons name="fitness" size={16} color={palette.muted} />
                <Column flex>
                  <ThemedText style={[styles.alertLabel, { color: palette.muted }]}>
                    Medications
                  </ThemedText>
                  <ThemedText style={{ color: palette.text }}>
                    {medical.medications.join(', ')}
                  </ThemedText>
                </Column>
              </Row>
            )}
          </View>
        </Clickable>
      )}

      {primaryContact && (
        <Clickable onPress={onPressContact}>
          <Row
            align="center"
            gap="sm"
            style={[styles.contactSection, { borderTopColor: palette.border }]}
          >
            <Ionicons name="call" size={18} color={palette.tint} />
            <Column flex>
              <ThemedText style={[styles.alertLabel, { color: palette.muted }]}>
                Emergency Contact
              </ThemedText>
              <ThemedText style={{ color: palette.text }}>
                {primaryContact.name} ({primaryContact.relationship})
              </ThemedText>
              {isActiveSession && (
                <ThemedText style={{ color: palette.tint }}>{primaryContact.phone}</ThemedText>
              )}
              {!isActiveSession && (
                <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                  Phone visible during active sessions only
                </ThemedText>
              )}
            </Column>
            <Ionicons name="chevron-forward" size={18} color={palette.muted} />
          </Row>
        </Clickable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  alertLabel: { ...Typography.caption, marginBottom: Spacing.micro },
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
});
