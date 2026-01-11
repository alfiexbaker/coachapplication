import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Badge } from '@/components/primitives/badge';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MedicalInfo, EmergencyContact } from '@/constants/types';

type MedicalCardProps = {
  athleteName: string;
  medical: MedicalInfo;
  contacts?: EmergencyContact[];
  onPress?: () => void;
  onPressContacts?: () => void;
  showContacts?: boolean;
};

/**
 * MedicalCard displays a summary of an athlete's medical information
 * including allergies, conditions, medications, and restrictions.
 * Suitable for coach roster views and session check-in screens.
 */
export function MedicalCard({
  athleteName,
  medical,
  contacts = [],
  onPress,
  onPressContacts,
  showContacts = true,
}: MedicalCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const hasAllergies = medical.allergies.length > 0;
  const hasConditions = medical.conditions.length > 0;
  const hasMedications = medical.medications.length > 0;
  const hasRestrictions = medical.restrictions.length > 0;
  const hasNotes = Boolean(medical.notes);
  const hasDoctor = Boolean(medical.doctorName || medical.doctorPhone);

  const hasAnyMedicalInfo =
    hasAllergies || hasConditions || hasMedications || hasRestrictions || hasNotes;

  const primaryContact = contacts.find((c) => c.isPrimary) ?? contacts[0];

  const getSeverityBadge = () => {
    if (medical.allergies.length >= 2 || medical.conditions.length >= 2) {
      return { label: 'High Alert', tone: 'warning' as const };
    }
    if (hasAllergies) {
      return { label: 'Allergy Alert', tone: 'warning' as const };
    }
    if (hasConditions || hasMedications) {
      return { label: 'Medical Info', tone: 'default' as const };
    }
    return null;
  };

  const severityBadge = getSeverityBadge();

  return (
    <SurfaceCard onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: `${palette.tint}15` }]}>
          <Ionicons name="medical" size={20} color={palette.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <ThemedText type="defaultSemiBold">{athleteName}</ThemedText>
            {severityBadge && <Badge label={severityBadge.label} tone={severityBadge.tone} />}
          </View>
          <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
            {hasAnyMedicalInfo ? 'Medical information on file' : 'No medical alerts'}
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.muted} />
      </View>

      {hasAnyMedicalInfo && (
        <View style={[styles.content, { borderTopColor: palette.border }]}>
          {hasAllergies && (
            <View style={styles.infoRow}>
              <View style={[styles.iconBg, { backgroundColor: `${palette.error}10` }]}>
                <Ionicons name="alert-circle" size={14} color={palette.error} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.infoLabel}>Allergies</ThemedText>
                <ThemedText style={styles.infoValue}>{medical.allergies.join(', ')}</ThemedText>
              </View>
            </View>
          )}

          {hasConditions && (
            <View style={styles.infoRow}>
              <View style={[styles.iconBg, { backgroundColor: `${palette.warning}10` }]}>
                <Ionicons name="fitness" size={14} color={palette.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.infoLabel}>Conditions</ThemedText>
                <ThemedText style={styles.infoValue}>{medical.conditions.join(', ')}</ThemedText>
              </View>
            </View>
          )}

          {hasMedications && (
            <View style={styles.infoRow}>
              <View style={[styles.iconBg, { backgroundColor: `${palette.tint}10` }]}>
                <Ionicons name="medkit" size={14} color={palette.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.infoLabel}>Medications</ThemedText>
                <ThemedText style={styles.infoValue}>{medical.medications.join(', ')}</ThemedText>
              </View>
            </View>
          )}

          {hasRestrictions && (
            <View style={styles.infoRow}>
              <View style={[styles.iconBg, { backgroundColor: `${palette.muted}20` }]}>
                <Ionicons name="ban" size={14} color={palette.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.infoLabel}>Restrictions</ThemedText>
                <ThemedText style={styles.infoValue}>{medical.restrictions.join(', ')}</ThemedText>
              </View>
            </View>
          )}

          {hasNotes && (
            <View style={styles.notesBox}>
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
          <View style={[styles.iconBg, { backgroundColor: `${palette.success}10` }]}>
            <Ionicons name="call" size={14} color={palette.success} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.infoLabel}>Emergency Contact</ThemedText>
            <ThemedText style={styles.infoValue}>
              {primaryContact.name} - {primaryContact.phone}
            </ThemedText>
          </View>
          {contacts.length > 1 && (
            <Badge label={`+${contacts.length - 1}`} tone="default" />
          )}
        </Clickable>
      )}

      {hasDoctor && (
        <View style={[styles.doctorRow, { borderTopColor: palette.border }]}>
          <Ionicons name="person" size={14} color={palette.muted} />
          <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
            {medical.doctorName}
            {medical.doctorPhone && ` - ${medical.doctorPhone}`}
          </ThemedText>
        </View>
      )}
    </SurfaceCard>
  );
}

/**
 * Compact medical summary for list items
 */
export function MedicalSummaryRow({
  medical,
  onPress,
}: {
  medical: MedicalInfo;
  onPress?: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const hasAlerts =
    medical.allergies.length > 0 ||
    medical.conditions.length > 0 ||
    medical.medications.length > 0;

  if (!hasAlerts) {
    return null;
  }

  const items = [
    ...medical.allergies.map((a) => ({ label: a, type: 'allergy' })),
    ...medical.conditions.map((c) => ({ label: c, type: 'condition' })),
    ...medical.medications.map((m) => ({ label: m, type: 'medication' })),
  ].slice(0, 3);

  return (
    <Clickable onPress={onPress} style={styles.summaryRow}>
      <Ionicons name="medical" size={14} color={palette.warning} />
      <View style={styles.summaryTags}>
        {items.map((item, index) => (
          <View
            key={index}
            style={[
              styles.summaryTag,
              {
                backgroundColor:
                  item.type === 'allergy' ? `${palette.error}10` : `${palette.warning}10`,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.summaryTagText,
                { color: item.type === 'allergy' ? palette.error : palette.warning },
              ]}
            >
              {item.label}
            </ThemedText>
          </View>
        ))}
        {medical.allergies.length +
          medical.conditions.length +
          medical.medications.length >
          3 && (
          <ThemedText style={[styles.moreText, { color: palette.muted }]}>
            +
            {medical.allergies.length +
              medical.conditions.length +
              medical.medications.length -
              3}{' '}
            more
          </ThemedText>
        )}
      </View>
    </Clickable>
  );
}

/**
 * Empty state for when no medical info is provided
 */
export function MedicalInfoEmptyState({
  onAddPress,
}: {
  onAddPress?: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SurfaceCard style={styles.emptyCard}>
      <View style={[styles.emptyIcon, { backgroundColor: `${palette.muted}10` }]}>
        <Ionicons name="medical-outline" size={32} color={palette.muted} />
      </View>
      <ThemedText type="defaultSemiBold">No Medical Information</ThemedText>
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
        Add allergies, conditions, or medications for this athlete.
      </ThemedText>
      {onAddPress && (
        <Clickable
          onPress={onAddPress}
          style={[styles.addButton, { borderColor: palette.tint }]}
        >
          <Ionicons name="add" size={16} color={palette.tint} />
          <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>Add Medical Info</ThemedText>
        </Clickable>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  content: {
    borderTopWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  iconBg: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 14,
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    padding: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: Radii.sm,
  },
  notes: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
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
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  summaryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  summaryTag: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radii.sm,
  },
  summaryTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  moreText: {
    fontSize: 11,
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.button,
    borderWidth: 1.5,
    marginTop: Spacing.sm,
  },
});
