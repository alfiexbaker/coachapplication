import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface PlayerCardPlaceholderProps {
  level: { level: number; name: string };
  totalSessions: number;
}

export const PlayerCardPlaceholder = function PlayerCardPlaceholder({
  level,
  totalSessions,
}: PlayerCardPlaceholderProps) {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <Column gap="xs">
        <Row align="center" gap="xxs">
          <Ionicons name="id-card-outline" size={16} color={colors.tint} />
          <ThemedText style={styles.title}>Player Card</ThemedText>
        </Row>
        <ThemedText style={[styles.body, { color: colors.muted }]}>
          Level {level.level} · {level.name}
        </ThemedText>
        <ThemedText style={[styles.body, { color: colors.muted }]}>
          {totalSessions} sessions tracked
        </ThemedText>
        <Row
          style={[
            styles.noteWrap,
            {
              borderColor: withAlpha(colors.tint, 0.25),
              backgroundColor: withAlpha(colors.tint, 0.08),
            },
          ]}
        >
          <ThemedText style={[styles.note, { color: colors.muted }]}>
            Full player card unlocks in Sprint 3.
          </ThemedText>
        </Row>
      </Column>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
  },
  body: {
    ...Typography.bodySmall,
  },
  noteWrap: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  note: {
    ...Typography.caption,
  },
});
