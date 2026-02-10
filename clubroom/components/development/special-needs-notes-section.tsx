import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ChildProfile } from '@/services/child-service';
import { Row } from '@/components/primitives';

interface SpecialNeedsNotesSectionProps {
  childProfile: ChildProfile;
}

export const SpecialNeedsNotesSection = memo(function SpecialNeedsNotesSection({ childProfile }: SpecialNeedsNotesSectionProps) {
  const { colors } = useTheme();

  const hasNotes = childProfile.communicationNotes || childProfile.behavioralNotes;
  const hasMedical = childProfile.allergies.length > 0 || childProfile.medications.length > 0;

  if (!hasNotes && !hasMedical) return null;

  return (
    <>
      {/* Coach Notes */}
      {hasNotes && (
        <View style={styles.section}>
          <Row gap="sm" align="center">
            <View style={[styles.sectionIcon, { backgroundColor: withAlpha(colors.success, 0.09) }]}>
              <Ionicons name="chatbubbles" size={Components.icon.md} color={colors.success} />
            </View>
            <ThemedText type="heading">Coach Notes</ThemedText>
          </Row>

          {childProfile.communicationNotes && (
            <SurfaceCard style={styles.noteCard}>
              <Row gap="xs" align="center">
                <Ionicons name="megaphone" size={Components.icon.sm} color={colors.success} />
                <ThemedText style={[Typography.caption, { color: colors.success }]}>Communication</ThemedText>
              </Row>
              <ThemedText style={Typography.small}>{childProfile.communicationNotes}</ThemedText>
            </SurfaceCard>
          )}

          {childProfile.behavioralNotes && (
            <SurfaceCard style={styles.noteCard}>
              <Row gap="xs" align="center">
                <Ionicons name="bulb" size={Components.icon.sm} color={colors.tint} />
                <ThemedText style={[Typography.caption, { color: colors.tint }]}>Behavioral</ThemedText>
              </Row>
              <ThemedText style={Typography.small}>{childProfile.behavioralNotes}</ThemedText>
            </SurfaceCard>
          )}
        </View>
      )}

      {/* Medical Alerts */}
      {hasMedical && (
        <View style={styles.section}>
          <Row gap="sm" align="center">
            <View style={[styles.sectionIcon, { backgroundColor: withAlpha(colors.error, 0.09) }]}>
              <Ionicons name="medkit" size={Components.icon.md} color={colors.error} />
            </View>
            <ThemedText type="heading">Medical Alerts</ThemedText>
          </Row>

          {childProfile.allergies.length > 0 && (
            <SurfaceCard style={[styles.medicalCard, { borderColor: withAlpha(colors.error, 0.19) }]}>
              <Row gap="xs" align="center">
                <Ionicons name="warning" size={Components.icon.sm} color={colors.error} />
                <ThemedText style={[Typography.caption, { color: colors.error }]}>Allergies</ThemedText>
              </Row>
              <Row style={styles.tagList}>
                {childProfile.allergies.map((allergy, idx) => (
                  <View key={idx} style={[styles.tag, { backgroundColor: withAlpha(colors.error, 0.09) }]}>
                    <ThemedText style={[Typography.caption, { color: colors.error }]}>{allergy}</ThemedText>
                  </View>
                ))}
              </Row>
            </SurfaceCard>
          )}

          {childProfile.medications.length > 0 && (
            <SurfaceCard style={[styles.medicalCard, { borderColor: withAlpha(colors.warning, 0.19) }]}>
              <Row gap="xs" align="center">
                <Ionicons name="medical" size={Components.icon.sm} color={colors.warning} />
                <ThemedText style={[Typography.caption, { color: colors.warning }]}>Medications</ThemedText>
              </Row>
              <Row style={styles.tagList}>
                {childProfile.medications.map((med, idx) => (
                  <View key={idx} style={[styles.tag, { backgroundColor: withAlpha(colors.warning, 0.09) }]}>
                    <ThemedText style={[Typography.caption, { color: colors.warning }]}>{med}</ThemedText>
                  </View>
                ))}
              </Row>
            </SurfaceCard>
          )}
        </View>
      )}
    </>
  );
});

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  sectionIcon: { width: Components.avatar.sm, height: Components.avatar.sm, borderRadius: Components.avatar.sm / 2, alignItems: 'center', justifyContent: 'center' },
  noteCard: { padding: Spacing.sm, gap: Spacing.xs },
  medicalCard: { padding: Spacing.sm, gap: Spacing.sm, borderWidth: 1 },
  tagList: { flexWrap: 'wrap', gap: Spacing.xs },
  tag: { paddingHorizontal: Spacing.sm, paddingVertical: Components.pill.paddingVertical, borderRadius: Radii.pill },
});
