import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
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
      <Row gap="sm" align="center">
        <View style={[styles.sectionIcon, { backgroundColor: withAlpha(colors.warning, 0.09) }]}>
          <Ionicons name="alert-circle" size={Components.icon.md} color={colors.warning} />
        </View>
        <ThemedText type="heading">Disabilities</ThemedText>
      </Row>

      {disabilities.map((disability) => (
        <SurfaceCard key={disability.id} style={styles.card}>
          <Row align="center" justify="space-between">
            <ThemedText type="defaultSemiBold" style={[Typography.body, { flex: 1 }]}>
              {disability.type}
            </ThemedText>
            {disability.diagnosisDate && (
              <View style={[styles.badge, { backgroundColor: withAlpha(colors.muted, 0.09) }]}>
                <ThemedText
                  style={[Typography.micro, { color: colors.muted, textTransform: 'none' }]}
                >
                  Since {disability.diagnosisDate.split('-')[0]}
                </ThemedText>
              </View>
            )}
          </Row>

          {disability.description && (
            <ThemedText style={[Typography.small, { color: colors.muted }]}>
              {disability.description}
            </ThemedText>
          )}

          {disability.supportRequired && (
            <View style={[styles.infoBlock, { backgroundColor: withAlpha(colors.tint, 0.03) }]}>
              <Row gap="xs" align="center">
                <Ionicons name="hand-left" size={Components.icon.sm} color={colors.tint} />
                <ThemedText style={[Typography.caption, { color: colors.tint }]}>
                  Support Required
                </ThemedText>
              </Row>
              <ThemedText style={Typography.small}>{disability.supportRequired}</ThemedText>
            </View>
          )}

          <TagSection
            icon="chatbubble"
            label="Communication"
            color={colors.success}
            tags={disability.communicationPreferences}
          />
          <TagSection
            icon="warning"
            label="Triggers to Avoid"
            color={colors.error}
            tags={disability.triggers}
          />
          <TagSection
            icon="happy"
            label="Calming Strategies"
            color={colors.tint}
            tags={disability.calmingStrategies}
          />
        </SurfaceCard>
      ))}
    </View>
  );
});

function TagSection({
  icon,
  label,
  color,
  tags,
}: {
  icon: string;
  label: string;
  color: string;
  tags?: string[];
}) {
  if (!tags || tags.length === 0) return null;

  return (
    <View style={styles.tagSection}>
      <Row gap="xs" align="center">
        <Ionicons name={icon as any} size={Components.icon.sm} color={color} />
        <ThemedText style={[Typography.caption, { color }]}>{label}</ThemedText>
      </Row>
      <Row style={styles.tagList}>
        {tags.map((tag, idx) => (
          <View key={idx} style={[styles.tag, { backgroundColor: withAlpha(color, 0.09) }]}>
            <ThemedText style={[Typography.caption, { color }]}>{tag}</ThemedText>
          </View>
        ))}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  sectionIcon: {
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { padding: Spacing.sm, gap: Spacing.sm },
  badge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Components.pill.paddingVertical,
    borderRadius: Radii.sm,
  },
  infoBlock: { padding: Spacing.sm, borderRadius: Radii.md, gap: Spacing.xs },
  tagSection: { gap: Spacing.xs },
  tagList: { flexWrap: 'wrap', gap: Spacing.xs },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Components.pill.paddingVertical,
    borderRadius: Radii.pill,
  },
});
