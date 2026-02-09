import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Badge } from '@/components/primitives/badge';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { MedicalInfo, EmergencyContact } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import {
  getSeverityBadge,
  MedicalInfoRow,
  MedicalSummaryRowInner,
  MedicalInfoEmptyStateInner,
} from './medical-card-sections';

type MedicalCardProps = {
  athleteName: string;
  medical: MedicalInfo;
  contacts?: EmergencyContact[];
  onPress?: () => void;
  onPressContacts?: () => void;
  showContacts?: boolean;
};

export function MedicalCard({
  athleteName,
  medical,
  contacts = [],
  onPress,
  onPressContacts,
  showContacts = true,
}: MedicalCardProps) {
  const { colors: palette } = useTheme();

  const hasAllergies = medical.allergies.length > 0;
  const hasConditions = medical.conditions.length > 0;
  const hasMedications = medical.medications.length > 0;
  const hasRestrictions = medical.restrictions.length > 0;
  const hasNotes = Boolean(medical.notes);
  const hasDoctor = Boolean(medical.doctorName || medical.doctorPhone);
  const hasAnyMedicalInfo = hasAllergies || hasConditions || hasMedications || hasRestrictions || hasNotes;

  const primaryContact = contacts.find((c) => c.isPrimary) ?? contacts[0];
  const severityBadge = getSeverityBadge(medical);

  return (
    <SurfaceCard onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <Ionicons name="medical" size={20} color={palette.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <ThemedText type="defaultSemiBold">{athleteName}</ThemedText>
            {severityBadge && <Badge label={severityBadge.label} tone={severityBadge.tone} />}
          </View>
          <ThemedText style={{ ...Typography.small, color: palette.muted }}>
            {hasAnyMedicalInfo ? 'Medical information on file' : 'No medical alerts'}
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.muted} />
      </View>

      {hasAnyMedicalInfo && (
        <View style={[styles.content, { borderTopColor: palette.border }]}>
          {hasAllergies && (
            <MedicalInfoRow icon="alert-circle" iconColor={palette.error}
              label="Allergies" value={medical.allergies.join(', ')} palette={palette} />
          )}
          {hasConditions && (
            <MedicalInfoRow icon="fitness" iconColor={palette.warning}
              label="Conditions" value={medical.conditions.join(', ')} palette={palette} />
          )}
          {hasMedications && (
            <MedicalInfoRow icon="medkit" iconColor={palette.tint}
              label="Medications" value={medical.medications.join(', ')} palette={palette} />
          )}
          {hasRestrictions && (
            <MedicalInfoRow icon="ban" iconColor={palette.muted}
              label="Restrictions" value={medical.restrictions.join(', ')} palette={palette} />
          )}
          {hasNotes && (
            <View style={[styles.notesBox, { backgroundColor: palette.surfaceSecondary }]}>
              <Ionicons name="document-text" size={14} color={palette.muted} />
              <ThemedText style={[styles.notes, { color: palette.muted }]}>{medical.notes}</ThemedText>
            </View>
          )}
        </View>
      )}

      {showContacts && primaryContact && (
        <Clickable
          onPress={onPressContacts}
          style={[styles.contactRow, { borderTopColor: palette.border }]}
        >
          <MedicalInfoRow icon="call" iconColor={palette.success}
            label="Emergency Contact"
            value={`${primaryContact.name} - ${primaryContact.phone}`}
            palette={palette} />
          {contacts.length > 1 && <Badge label={`+${contacts.length - 1}`} tone="neutral" />}
        </Clickable>
      )}

      {hasDoctor && (
        <View style={[styles.doctorRow, { borderTopColor: palette.border }]}>
          <Ionicons name="person" size={14} color={palette.muted} />
          <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
            {medical.doctorName}
            {medical.doctorPhone && ` - ${medical.doctorPhone}`}
          </ThemedText>
        </View>
      )}
    </SurfaceCard>
  );
}

export function MedicalSummaryRow({ medical, onPress }: { medical: MedicalInfo; onPress?: () => void }) {
  const { colors: palette } = useTheme();
  return <MedicalSummaryRowInner medical={medical} onPress={onPress} palette={palette} />;
}

export function MedicalInfoEmptyState({ onAddPress }: { onAddPress?: () => void }) {
  const { colors: palette } = useTheme();
  return <MedicalInfoEmptyStateInner onAddPress={onAddPress} palette={palette} />;
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  content: { borderTopWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    padding: Spacing.sm,
    backgroundColor: 'transparent',
    borderRadius: Radii.sm,
  },
  notes: { ...Typography.small, flex: 1, lineHeight: 18 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
  },
});
