import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ChildProfile } from '@/services/child-service';

interface SpecialNeedsAccommodationsProps {
  specialNeeds: ChildProfile['specialNeeds'];
}

export const SpecialNeedsAccommodations = memo(function SpecialNeedsAccommodations({ specialNeeds }: SpecialNeedsAccommodationsProps) {
  const { colors } = useTheme();

  if (specialNeeds.length === 0) return null;

  const getSeverityColor = (severity?: string) => {
    if (severity === 'SEVERE') return colors.error;
    if (severity === 'MODERATE') return colors.warning;
    return colors.success;
  };

  return (
    <View style={styles.section}>
      <Row gap="sm" align="center">
        <View style={[styles.sectionIcon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
          <Ionicons name="accessibility" size={Components.icon.md} color={colors.tint} />
        </View>
        <ThemedText type="heading">Accommodations</ThemedText>
      </Row>

      {specialNeeds.map((need) => {
        const severityColor = getSeverityColor(need.severity);
        return (
          <SurfaceCard key={need.id} style={styles.card}>
            <Row align="center" justify="space-between">
              <ThemedText type="defaultSemiBold" style={[Typography.body, { flex: 1 }]}>{need.name}</ThemedText>
              {need.severity && (
                <View style={[styles.badge, { backgroundColor: withAlpha(severityColor, 0.09) }]}>
                  <ThemedText style={[Typography.micro, { color: severityColor }]}>{need.severity}</ThemedText>
                </View>
              )}
            </Row>

            {need.description && (
              <ThemedText style={[Typography.small, { color: colors.muted }]}>{need.description}</ThemedText>
            )}

            {need.accommodationsNeeded && need.accommodationsNeeded.length > 0 && (
              <View style={styles.list}>
                {need.accommodationsNeeded.map((accommodation, idx) => (
                  <Row key={idx} gap="xs" align="flex-start">
                    <Ionicons name="checkmark-circle" size={Components.icon.sm} color={colors.success} />
                    <ThemedText style={[Typography.small, { flex: 1 }]}>{accommodation}</ThemedText>
                  </Row>
                ))}
              </View>
            )}

            {need.coachNotes && (
              <View style={[styles.coachNote, { backgroundColor: withAlpha(colors.warning, 0.03), borderColor: withAlpha(colors.warning, 0.19) }]}>
                <Ionicons name="bulb" size={Components.icon.sm} color={colors.warning} />
                <ThemedText style={[Typography.small, { flex: 1, fontStyle: 'italic' }]}>{need.coachNotes}</ThemedText>
              </View>
            )}
          </SurfaceCard>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  sectionIcon: { width: Components.avatar.sm, height: Components.avatar.sm, borderRadius: Components.avatar.sm / 2, alignItems: 'center', justifyContent: 'center' },
  card: { padding: Spacing.sm, gap: Spacing.sm },
  badge: { paddingHorizontal: Spacing.xs, paddingVertical: Components.pill.paddingVertical, borderRadius: Radii.sm },
  list: { gap: Spacing.xs },
  coachNote: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
});
