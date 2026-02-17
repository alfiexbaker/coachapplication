import { memo } from 'react';
import { View, StyleSheet } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ChildProfile } from '@/services/child-service';

interface SpecialNeedsNotesSectionProps {
  childProfile: ChildProfile;
}

export const SpecialNeedsNotesSection = memo(function SpecialNeedsNotesSection({
  childProfile,
}: SpecialNeedsNotesSectionProps) {
  const { colors } = useTheme();

  const hasNotes = childProfile.communicationNotes || childProfile.behavioralNotes;
  const hasMedical = childProfile.allergies.length > 0 || childProfile.medications.length > 0;

  if (!hasNotes && !hasMedical) return null;

  return (
    <>
      {hasNotes && (
        <View style={styles.section}>
          <Row align="center" justify="space-between">
            <ThemedText type="heading">Parent Notes</ThemedText>
            <ThemedText style={[Typography.micro, { color: colors.muted, textTransform: 'none' }]}>
              From Parent
            </ThemedText>
          </Row>

          {childProfile.communicationNotes && (
            <SurfaceCard style={styles.noteCard}>
              <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                Communication
              </ThemedText>
              <ThemedText style={Typography.small}>{childProfile.communicationNotes}</ThemedText>
            </SurfaceCard>
          )}

          {childProfile.behavioralNotes && (
            <SurfaceCard style={styles.noteCard}>
              <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                Behavioral
              </ThemedText>
              <ThemedText style={Typography.small}>{childProfile.behavioralNotes}</ThemedText>
            </SurfaceCard>
          )}
        </View>
      )}

      {hasMedical && (
        <View style={styles.section}>
          <ThemedText type="heading">Medical</ThemedText>

          {childProfile.allergies.length > 0 && (
            <SurfaceCard style={styles.noteCard}>
              <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                Allergies
              </ThemedText>
              <Row style={styles.tagList}>
                {childProfile.allergies.map((allergy, idx) => (
                  <View
                    key={idx}
                    style={[styles.tag, { backgroundColor: withAlpha(colors.muted, 0.09) }]}
                  >
                    <ThemedText style={[Typography.caption, { color: colors.text }]}>
                      {allergy}
                    </ThemedText>
                  </View>
                ))}
              </Row>
            </SurfaceCard>
          )}

          {childProfile.medications.length > 0 && (
            <SurfaceCard style={styles.noteCard}>
              <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                Medications
              </ThemedText>
              <Row style={styles.tagList}>
                {childProfile.medications.map((med, idx) => (
                  <View
                    key={idx}
                    style={[styles.tag, { backgroundColor: withAlpha(colors.muted, 0.09) }]}
                  >
                    <ThemedText style={[Typography.caption, { color: colors.text }]}>
                      {med}
                    </ThemedText>
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
  noteCard: { padding: Spacing.sm, gap: Spacing.xxs },
  tagList: { flexWrap: 'wrap', gap: Spacing.xs },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
});
