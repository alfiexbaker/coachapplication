import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ChildProfile } from '@/services/child-service';
import type { RosterEntry } from '@/constants/types';

export const SpecialNeedsSummary = function SpecialNeedsSummary({
  childData,
}: {
  childData: ChildProfile;
}) {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={styles.section}>
      <Row gap="xs" align="center">
        <Ionicons name="heart" size={18} color={colors.tint} />
        <ThemedText type="defaultSemiBold">Special Needs & Support</ThemedText>
      </Row>

      {childData.disabilities.length > 0 && (
        <Column gap="xs">
          {childData.disabilities.slice(0, 2).map((d) => (
            <View
              key={d.id}
              style={[styles.needItem, { backgroundColor: withAlpha(colors.warning, 0.06) }]}
            >
              <Row gap="xs" align="center">
                <Ionicons name="information-circle" size={16} color={colors.warning} />
                <ThemedText type="defaultSemiBold">{d.type}</ThemedText>
              </Row>
              {d.supportRequired && (
                <ThemedText style={[styles.supportText, { color: colors.muted }]}>
                  {d.supportRequired}
                </ThemedText>
              )}
            </View>
          ))}
        </Column>
      )}

      {childData.communicationNotes && (
        <Column gap="xxs">
          <ThemedText style={[styles.sectionLabel, { color: colors.muted }]}>
            Communication
          </ThemedText>
          <ThemedText style={styles.bodySmall}>{childData.communicationNotes}</ThemedText>
        </Column>
      )}
    </SurfaceCard>
  );
};

export const SenSummary = function SenSummary({ athlete }: { athlete: RosterEntry }) {
  const { colors } = useTheme();
  if (!athlete.senInfo?.hasSen) return null;

  return (
    <SurfaceCard style={styles.section}>
      <Row gap="xs" align="center">
        <Ionicons name="accessibility-outline" size={18} color={colors.tint} />
        <ThemedText type="defaultSemiBold">SEN</ThemedText>
      </Row>
      <Row gap="xs" wrap>
        {athlete.senInfo.conditions.map((c) => (
          <Row key={c} style={[styles.tag, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
            <ThemedText style={[styles.tagText, { color: colors.tint }]}>{c}</ThemedText>
          </Row>
        ))}
      </Row>
      {athlete.senInfo.supportNotes && (
        <ThemedText style={[styles.bodySmall, { color: colors.muted }]}>
          {athlete.senInfo.supportNotes}
        </ThemedText>
      )}
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
  },
  needItem: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.xxs,
  },
  supportText: {
    ...Typography.small,
    marginLeft: Spacing.md,
  },
  sectionLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bodySmall: {
    ...Typography.bodySmall,
  },
  tag: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md,
  },
  tagText: {
    ...Typography.smallSemiBold,
  },
});
