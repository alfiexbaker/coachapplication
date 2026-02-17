import { memo } from 'react';
import { View, StyleSheet } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ChildProfile } from '@/services/child-service';

interface SpecialNeedsAccommodationsProps {
  specialNeeds: ChildProfile['specialNeeds'];
}

export const SpecialNeedsAccommodations = memo(function SpecialNeedsAccommodations({
  specialNeeds,
}: SpecialNeedsAccommodationsProps) {
  const { colors } = useTheme();

  if (specialNeeds.length === 0) return null;

  return (
    <View style={styles.section}>
      <Row align="center" justify="space-between">
        <ThemedText type="heading">Accommodations</ThemedText>
        <ThemedText style={[Typography.micro, { color: colors.muted, textTransform: 'none' }]}>
          From Parent
        </ThemedText>
      </Row>

      {specialNeeds.map((need) => (
        <SurfaceCard key={need.id} style={styles.card}>
          <Row align="center" justify="space-between">
            <ThemedText style={Typography.bodySemiBold}>{need.name}</ThemedText>
            {need.severity && (
              <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                {need.severity.charAt(0) + need.severity.slice(1).toLowerCase()}
              </ThemedText>
            )}
          </Row>

          {need.description && (
            <ThemedText style={[Typography.small, { color: colors.muted }]}>
              {need.description}
            </ThemedText>
          )}

          {need.accommodationsNeeded && need.accommodationsNeeded.length > 0 && (
            <View style={styles.detailBlock}>
              {need.accommodationsNeeded.map((accommodation, idx) => (
                <Row key={idx} gap="xs" align="flex-start">
                  <ThemedText style={[Typography.small, { color: colors.muted }]}>•</ThemedText>
                  <ThemedText style={[Typography.small, { flex: 1 }]}>{accommodation}</ThemedText>
                </Row>
              ))}
            </View>
          )}

          {need.parentHints && (
            <View style={[styles.hintBlock, { backgroundColor: withAlpha(colors.muted, 0.05) }]}>
              <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                Parent tip
              </ThemedText>
              <ThemedText style={[Typography.small, { fontStyle: 'italic' }]}>
                {need.parentHints}
              </ThemedText>
            </View>
          )}
        </SurfaceCard>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  card: { padding: Spacing.sm, gap: Spacing.sm },
  detailBlock: { gap: Spacing.xxs },
  hintBlock: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.xxs,
  },
});
