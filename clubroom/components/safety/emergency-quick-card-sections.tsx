import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography, Components, withAlpha } from '@/constants/theme';
import type { EmergencyContact } from '@/constants/types';
import type { useTheme } from '@/hooks/useTheme';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ─── EmergencyCallSection ───────────────────────────────────────

export interface EmergencyCallSectionProps {
  contact: EmergencyContact;
  onCall?: () => void;
  palette: ThemeColors;
}

const renderEmergencyCallSection = function renderEmergencyCallSection({
  contact,
  onCall,
  palette,
}: EmergencyCallSectionProps) {
  return (
    <Row align="center" gap="md" style={[styles.callSection, { borderTopColor: palette.border }]}>
      <View style={styles.contactInfo}>
        <ThemedText style={[styles.contactLabel, { color: palette.muted }]}>
          Emergency Contact
        </ThemedText>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {contact.name}
        </ThemedText>
        <ThemedText style={{ ...Typography.small, color: palette.muted }}>
          {contact.relationship} · {contact.phone}
        </ThemedText>
      </View>
      <Clickable onPress={onCall} style={[styles.callButton, { backgroundColor: palette.success }]}>
        <Ionicons name="call" size={22} color={palette.onSuccess} />
      </Clickable>
    </Row>
  );
};
export const EmergencyCallSection = renderEmergencyCallSection;

// ─── NoContactWarning ───────────────────────────────────────────

export interface NoContactWarningProps {
  palette: ThemeColors;
}

const renderNoContactWarning = function renderNoContactWarning({ palette }: NoContactWarningProps) {
  return (
    <Row
      align="center"
      gap="sm"
      style={[styles.warningSection, { backgroundColor: withAlpha(palette.warning, 0.03) }]}
    >
      <Ionicons name="warning" size={16} color={palette.warning} />
      <ThemedText style={[styles.warningText, { color: palette.warning }]}>
        No emergency contact on file
      </ThemedText>
    </Row>
  );
};
export const NoContactWarning = renderNoContactWarning;

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  callSection: {
    padding: Components.card.padding,
    borderTopWidth: 1,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: { ...Typography.caption, marginBottom: Spacing.micro },
  callButton: {
    width: 52,
    height: 52,
    borderRadius: Radii['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningSection: {
    padding: Components.card.padding,
    marginHorizontal: Components.card.padding,
    marginBottom: Components.card.padding,
    borderRadius: Radii.md,
  },
  warningText: { ...Typography.smallSemiBold },
});
