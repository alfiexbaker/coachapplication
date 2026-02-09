import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
};

/**
 * Emergency banner displays critical medical and contact information
 * for quick access during sessions. Shows allergies, conditions, and
 * primary emergency contact.
 */
export function EmergencyBanner({
  medical,
  primaryContact,
  onPressContact,
  onPressMedical,
  compact = false,
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
      <View style={[styles.compactBanner, { backgroundColor: withAlpha(severityColor, 0.06) }]}>
        {hasAlerts && (
          <Clickable
            onPress={onPressMedical}
            style={[styles.compactItem, { borderColor: withAlpha(severityColor, 0.19) }]}
          >
            <Ionicons name="medical" size={16} color={severityColor} />
            <ThemedText style={[styles.compactText, { color: severityColor }]}>
              {hasAllergies
                ? `${medical.allergies.length} allergy`
                : hasConditions
                  ? `${medical.conditions.length} condition`
                  : 'Medical info'}
            </ThemedText>
          </Clickable>
        )}
        {primaryContact && (
          <Clickable
            onPress={onPressContact}
            style={[styles.compactItem, { borderColor: withAlpha(palette.tint, 0.19) }]}
          >
            <Ionicons name="call" size={16} color={palette.tint} />
            <ThemedText style={[styles.compactText, { color: palette.tint }]}>
              {primaryContact.name.split(' ')[0]}
            </ThemedText>
          </Clickable>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.banner, { borderColor: withAlpha(severityColor, 0.25) }]}>
      <View style={[styles.bannerHeader, { borderBottomColor: palette.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: withAlpha(severityColor, 0.09) }]}>
          <Ionicons name="warning" size={20} color={severityColor} />
        </View>
        <ThemedText type="defaultSemiBold" style={{ color: severityColor }}>
          Safety Information
        </ThemedText>
      </View>

      {hasAlerts && (
        <Clickable onPress={onPressMedical}>
          <View style={styles.section}>
            {hasAllergies && (
              <View style={styles.alertRow}>
                <Ionicons name="alert-circle" size={16} color={palette.error} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.alertLabel, { color: palette.muted }]}>Allergies</ThemedText>
                  <ThemedText style={{ color: palette.text }}>
                    {medical.allergies.join(', ')}
                  </ThemedText>
                </View>
              </View>
            )}

            {hasConditions && (
              <View style={styles.alertRow}>
                <Ionicons name="medical" size={16} color={palette.warning} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.alertLabel, { color: palette.muted }]}>Conditions</ThemedText>
                  <ThemedText style={{ color: palette.text }}>
                    {medical.conditions.join(', ')}
                  </ThemedText>
                </View>
              </View>
            )}

            {hasMedications && (
              <View style={styles.alertRow}>
                <Ionicons name="fitness" size={16} color={palette.muted} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.alertLabel, { color: palette.muted }]}>Medications</ThemedText>
                  <ThemedText style={{ color: palette.text }}>
                    {medical.medications.join(', ')}
                  </ThemedText>
                </View>
              </View>
            )}
          </View>
        </Clickable>
      )}

      {primaryContact && (
        <Clickable onPress={onPressContact}>
          <View style={[styles.contactSection, { borderTopColor: palette.border }]}>
            <Ionicons name="call" size={18} color={palette.tint} />
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.alertLabel, { color: palette.muted }]}>Emergency Contact</ThemedText>
              <ThemedText style={{ color: palette.text }}>
                {primaryContact.name} ({primaryContact.relationship})
              </ThemedText>
              <ThemedText style={{ color: palette.tint }}>{primaryContact.phone}</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.muted} />
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
  alertRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  alertLabel: { ...Typography.caption,
    marginBottom: Spacing.micro },
  contactSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderTopWidth: 1,
  },
  compactBanner: {
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: Spacing.xs,
    borderRadius: Radii.md,
  },
  compactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  compactText: { ...Typography.caption },
});
