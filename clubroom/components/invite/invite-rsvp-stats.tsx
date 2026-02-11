import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives';
import { ThemedText } from '@/components/themed-text';
import type { ThemeColors } from '@/hooks/useTheme';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';

interface InviteRsvpStatsProps {
  counts: {
    going: number;
    maybe: number;
    cantGo: number;
  };
  colors: ThemeColors;
}

export function InviteRsvpStats({ counts, colors }: InviteRsvpStatsProps) {
  const total = counts.going + counts.maybe + counts.cantGo;
  if (total === 0) return null;

  return (
    <Row gap="xs" style={styles.wrap}>
      <Row style={[styles.chip, { backgroundColor: withAlpha(colors.success, 0.08) }]}>
        <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
        <ThemedText style={{ color: colors.success, ...Typography.smallSemiBold }}>
          {counts.going} going
        </ThemedText>
      </Row>
      <Row style={[styles.chip, { backgroundColor: withAlpha(colors.warning, 0.08) }]}>
        <Ionicons name="help-circle-outline" size={16} color={colors.warning} />
        <ThemedText style={{ color: colors.warning, ...Typography.smallSemiBold }}>
          {counts.maybe} maybe
        </ThemedText>
      </Row>
      <Row style={[styles.chip, { backgroundColor: withAlpha(colors.error, 0.08) }]}>
        <Ionicons name="close-circle-outline" size={16} color={colors.error} />
        <ThemedText style={{ color: colors.error, ...Typography.smallSemiBold }}>
          {counts.cantGo} can&apos;t
        </ThemedText>
      </Row>
    </Row>
  );
}

const styles = StyleSheet.create({
  wrap: { flexWrap: 'wrap' },
  chip: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
});
