import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BookingSummary } from '@/constants/types';
import { academyService } from '@/services/academy-service';

interface BookingOwnershipBlockProps {
  booking: BookingSummary;
  compact?: boolean;
}

function BookingOwnershipBlockInner({ booking, compact = false }: BookingOwnershipBlockProps) {
  const { colors: palette } = useTheme();
  const [clubLabel, setClubLabel] = useState<string | null>(booking.clubId ?? null);

  useEffect(() => {
    if (booking.actingAs !== 'club' || !booking.clubId) {
      setClubLabel(null);
      return;
    }

    let cancelled = false;
    void academyService.getAcademy(booking.clubId).then((result) => {
      if (cancelled) return;
      if (result.success && result.data?.name) {
        setClubLabel(result.data.name);
      } else {
        setClubLabel(booking.clubId ?? null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [booking.clubId]);

  if (booking.actingAs !== 'club') {
    return null;
  }

  const ownerLabel = booking.ownerCoachName || booking.ownerCoachId || null;
  const assigneeLabel = booking.assigneeCoachName || booking.assigneeCoachId || null;
  const deliveryLabel = assigneeLabel || ownerLabel;
  const hasSeparateOwner = ownerLabel && assigneeLabel && ownerLabel !== assigneeLabel;

  return (
    <View
      style={[
        styles.block,
        {
          backgroundColor: withAlpha(palette.info, 0.08),
          borderColor: withAlpha(palette.info, 0.22),
        },
      ]}
    >
      <Row align="center" gap="xxs">
        <Ionicons name="business-outline" size={compact ? 11 : 12} color={palette.info} />
        <ThemedText style={[compact ? styles.labelCompact : styles.label, { color: palette.info }]}>
          {clubLabel ? `Club: ${clubLabel}` : 'Club session'}
        </ThemedText>
      </Row>

      {deliveryLabel ? (
        <ThemedText
          style={[compact ? styles.metaCompact : styles.meta, { color: palette.text }]}
          numberOfLines={1}
        >
          Delivered by {deliveryLabel}
        </ThemedText>
      ) : null}

      {hasSeparateOwner ? (
        <ThemedText
          style={[compact ? styles.metaCompact : styles.meta, { color: palette.muted }]}
          numberOfLines={1}
        >
          Owner {ownerLabel}
        </ThemedText>
      ) : null}
    </View>
  );
}

export const BookingOwnershipBlock = memo(BookingOwnershipBlockInner);

const styles = StyleSheet.create({
  block: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    gap: Spacing.micro,
  },
  label: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  labelCompact: {
    ...Typography.micro,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  meta: {
    ...Typography.caption,
  },
  metaCompact: {
    ...Typography.micro,
  },
});
