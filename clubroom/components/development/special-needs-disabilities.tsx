import { memo } from 'react';
import { View, StyleSheet } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ChildProfile } from '@/services/child-service';

interface SpecialNeedsDisabilitiesProps {
  disabilities: ChildProfile['disabilities'];
}

export const SpecialNeedsDisabilities = memo(function SpecialNeedsDisabilities({
  disabilities,
}: SpecialNeedsDisabilitiesProps) {
  const { colors } = useTheme();

  if (disabilities.length === 0) return null;

  return (
    <View style={styles.section}>
      <Row align="center" justify="space-between">
        <ThemedText type="heading">Disabilities</ThemedText>
        <ThemedText style={[Typography.micro, { color: colors.muted, textTransform: 'none' }]}>
          From Parent
        </ThemedText>
      </Row>

      {disabilities.map((disability) => (
        <SurfaceCard key={disability.id} style={styles.card}>
          <Row align="center" justify="space-between">
            <ThemedText style={Typography.bodySemiBold}>{disability.type}</ThemedText>
            {disability.diagnosisDate && (
              <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                Since {disability.diagnosisDate.split('-')[0]}
              </ThemedText>
            )}
          </Row>

          {disability.description && (
            <ThemedText style={[Typography.small, { color: colors.muted }]}>
              {disability.description}
            </ThemedText>
          )}

          {disability.supportRequired && (
            <View style={styles.detailBlock}>
              <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                Support Required
              </ThemedText>
              <ThemedText style={Typography.small}>{disability.supportRequired}</ThemedText>
            </View>
          )}

          {disability.communicationPreferences && disability.communicationPreferences.length > 0 && (
            <View style={styles.detailBlock}>
              <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                Communication
              </ThemedText>
              <Row style={styles.tagList}>
                {disability.communicationPreferences.map((tag, idx) => (
                  <View key={idx} style={[styles.tag, { backgroundColor: withAlpha(colors.muted, 0.09) }]}>
                    <ThemedText style={[Typography.caption, { color: colors.text }]}>{tag}</ThemedText>
                  </View>
                ))}
              </Row>
            </View>
          )}

          {disability.triggers && disability.triggers.length > 0 && (
            <View style={styles.detailBlock}>
              <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                Triggers to Avoid
              </ThemedText>
              <Row style={styles.tagList}>
                {disability.triggers.map((tag, idx) => (
                  <View key={idx} style={[styles.tag, { backgroundColor: withAlpha(colors.muted, 0.09) }]}>
                    <ThemedText style={[Typography.caption, { color: colors.text }]}>{tag}</ThemedText>
                  </View>
                ))}
              </Row>
            </View>
          )}

          {disability.calmingStrategies && disability.calmingStrategies.length > 0 && (
            <View style={styles.detailBlock}>
              <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                Calming Strategies
              </ThemedText>
              <Row style={styles.tagList}>
                {disability.calmingStrategies.map((tag, idx) => (
                  <View key={idx} style={[styles.tag, { backgroundColor: withAlpha(colors.muted, 0.09) }]}>
                    <ThemedText style={[Typography.caption, { color: colors.text }]}>{tag}</ThemedText>
                  </View>
                ))}
              </Row>
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
  tagList: { flexWrap: 'wrap', gap: Spacing.xs },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
});
