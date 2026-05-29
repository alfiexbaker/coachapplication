import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BookingRelationshipContext } from '@/utils/booking-display';

interface BookingTrustCardProps {
  relationshipContext: BookingRelationshipContext;
}

export const BookingTrustCard = function BookingTrustCard({
  relationshipContext,
}: BookingTrustCardProps) {
  const { colors } = useTheme();

  const rows = [
    {
      id: 'support',
      icon: 'help-buoy-outline' as const,
      label: 'Support ownership',
      value: relationshipContext.supportSummary,
    },
    {
      id: 'handoff',
      icon: 'swap-horizontal-outline' as const,
      label: 'If the coach changes',
      value: relationshipContext.reassignmentSummary,
    },
    {
      id: 'visibility',
      icon: 'eye-outline' as const,
      label: 'Who can see your child details',
      value: relationshipContext.visibilitySummary,
    },
    {
      id: 'health',
      icon: 'medkit-outline' as const,
      label: 'Shared health visibility',
      value: relationshipContext.sharedHealthSummary,
    },
  ];

  return (
    <SurfaceCard style={[styles.card, { borderColor: colors.border }]}>
      <Row gap="sm" align="center">
        <View style={[styles.iconWrap, { backgroundColor: withAlpha(colors.info, 0.1) }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.info} />
        </View>
        <View style={styles.headerCopy}>
          <ThemedText type="defaultSemiBold">Trust and support</ThemedText>
          <ThemedText style={[styles.headerText, { color: colors.muted }]}>
            Clear ownership for support, handoffs, and child visibility.
          </ThemedText>
        </View>
      </Row>

      <View style={styles.rows}>
        {rows.map((row) => (
          <View key={row.id} style={styles.row}>
            <Row gap="xs" align="center">
              <Ionicons name={row.icon} size={15} color={colors.muted} />
              <ThemedText style={[styles.rowLabel, { color: colors.muted }]}>
                {row.label}
              </ThemedText>
            </Row>
            <ThemedText style={styles.rowValue}>{row.value}</ThemedText>
          </View>
        ))}
      </View>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.micro,
  },
  headerText: {
    ...Typography.bodySmall,
  },
  rows: {
    gap: Spacing.sm,
  },
  row: {
    gap: Spacing.xxs,
  },
  rowLabel: {
    ...Typography.caption,
    fontWeight: '700',
  },
  rowValue: {
    ...Typography.bodySmall,
  },
});
