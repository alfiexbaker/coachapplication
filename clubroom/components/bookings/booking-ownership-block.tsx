import { useEffect, useState, startTransition } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import type { BookingSummary } from '@/constants/types';
import { socialFeedService } from '@/services/social-feed-service';
import { getCoachWorkContextDisplay } from '@/utils/coach-business-context';
import {
  getBookingRelationshipContext,
  getBookingSummaryCoachName,
} from '@/utils/booking-display';

interface BookingOwnershipBlockProps {
  booking: BookingSummary;
  compact?: boolean;
}

function BookingOwnershipBlockInner({ booking, compact = false }: BookingOwnershipBlockProps) {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const [organizationLabel, setOrganizationLabel] = useState<string | null>(booking.clubId ?? null);
  const showIndependentCoachLabel = currentUser?.role === 'COACH';

  useEffect(() => {
    if (booking.actingAs !== 'club' || !booking.clubId) {
      startTransition(() => {
        setOrganizationLabel(null);
      });
      return;
    }

    let cancelled = false;
    void socialFeedService.getClub(booking.clubId).then((club) => {
      if (cancelled) return;
      if (club?.name) {
        setOrganizationLabel(club.name);
      } else {
        setOrganizationLabel(booking.clubId ?? null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [booking.actingAs, booking.clubId]);

  if (booking.actingAs !== 'club') {
    if (!showIndependentCoachLabel) {
      return null;
    }

    const workContext = getCoachWorkContextDisplay(booking);

    return (
      <View
        style={[
          styles.block,
          {
            backgroundColor: withAlpha(palette.tint, 0.08),
            borderColor: withAlpha(palette.tint, 0.18),
          },
        ]}
      >
        <Row align="center" gap="xxs">
          <Ionicons name="briefcase-outline" size={compact ? 11 : 12} color={palette.tint} />
          <ThemedText
            style={[compact ? styles.labelCompact : styles.label, { color: palette.tint }]}
          >
            {workContext.label}
          </ThemedText>
        </Row>
        <ThemedText style={[compact ? styles.metaCompact : styles.meta, { color: palette.text }]}>
          {workContext.detail}
        </ThemedText>
      </View>
    );
  }

  const coachLabel = booking.ownerCoachName || getBookingSummaryCoachName(booking);
  const deliveryLabel = booking.assigneeCoachName || booking.assigneeCoachId || coachLabel;
  const relationshipContext = getBookingRelationshipContext({
    actingAs: booking.actingAs,
    organizationLabel,
    coachLabel,
    deliveredByLabel: deliveryLabel,
    commercialMode: booking.commercialMode,
  });
  const detailRows = compact
    ? [
        `Booked with ${relationshipContext.bookedWithLabel}`,
        `Billing ${relationshipContext.billingLabel}`,
      ]
    : [
        organizationLabel ? `Organization: ${organizationLabel}` : null,
        `Booked with ${relationshipContext.bookedWithLabel}`,
        `Delivered by ${relationshipContext.deliveredByLabel}`,
        `Billing ${relationshipContext.billingLabel}`,
        `Support ${relationshipContext.supportLabel}`,
      ].filter((row): row is string => Boolean(row));

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
          Club booking
        </ThemedText>
      </Row>
      {detailRows.map((row) => (
        <ThemedText
          key={row}
          style={[
            compact ? styles.metaCompact : styles.meta,
            { color: row.startsWith('Organization') ? palette.muted : palette.text },
          ]}
          numberOfLines={compact ? 1 : 2}
        >
          {row}
        </ThemedText>
      ))}
    </View>
  );
}

export const BookingOwnershipBlock = BookingOwnershipBlockInner;

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
