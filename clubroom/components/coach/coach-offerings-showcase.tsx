import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Column, Row } from '@/components/primitives';
import { SessionOfferingCard } from '@/components/sessions/session-offering-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { SessionOffering } from '@/constants/types';
import type { CoachOfferingSummary } from '@/utils/coach-profile-offerings';
import { formatCoachAvailabilityLabel } from '@/utils/coach-profile-offerings';
import { useTheme } from '@/hooks/useTheme';

interface CoachOfferingsShowcaseProps {
  minPrice: number;
  maxPrice?: number;
  nextAvailable?: string;
  sessionOfferings: SessionOffering[];
  offeringSummary: CoachOfferingSummary;
  onOfferingPress: (offering: SessionOffering) => void;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  emptyTitle?: string;
  emptyMessage?: string;
}

interface SignalCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  tint: string;
}

function SignalCard({ icon, label, value, tint }: SignalCardProps) {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={styles.signalCard}>
      <View style={[styles.signalIconWrap, { backgroundColor: withAlpha(tint, 0.1) }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
      <ThemedText style={[styles.signalLabel, { color: colors.muted }]}>{label}</ThemedText>
      <ThemedText style={styles.signalValue}>{value}</ThemedText>
    </SurfaceCard>
  );
}

export function CoachOfferingsShowcase({
  minPrice,
  maxPrice,
  nextAvailable,
  sessionOfferings,
  offeringSummary,
  onOfferingPress,
  onPrimaryAction,
  primaryActionLabel = 'Book a session',
  emptyTitle = 'Book direct or ask about the right fit',
  emptyMessage = 'Direct booking is available even when live sessions are not listed yet.',
}: CoachOfferingsShowcaseProps) {
  const { colors } = useTheme();
  const featuredOfferings = sessionOfferings.slice(0, 3);
  const availabilityValue = formatCoachAvailabilityLabel(
    offeringSummary.nextOffering?.scheduledAt ?? nextAvailable,
  );
  const deliveryValue =
    offeringSummary.groupOfferingsCount > 0
      ? `${offeringSummary.groupOfferingsCount} group options`
      : '1:1 sessions available';
  const accessValue =
    offeringSummary.clubOfferingsCount > 0 || offeringSummary.eventOfferingsCount > 0
      ? [
          offeringSummary.clubOfferingsCount > 0
            ? `${offeringSummary.clubOfferingsCount} club`
            : null,
          offeringSummary.eventOfferingsCount > 0
            ? `${offeringSummary.eventOfferingsCount} event`
            : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : offeringSummary.publicOfferingsCount > 0
        ? `${offeringSummary.publicOfferingsCount} public sessions`
        : 'Private booking first';
  const priceValue =
    maxPrice && maxPrice !== minPrice ? `£${minPrice}-${maxPrice}` : `From £${minPrice}`;

  return (
    <Column gap="md">
      <Row style={styles.signalRow}>
        <View style={styles.signalColumn}>
          <SignalCard icon="cash-outline" label="Typical price" value={priceValue} tint={colors.tint} />
        </View>
        <View style={styles.signalColumn}>
          <SignalCard
            icon="calendar-outline"
            label="Next slot"
            value={availabilityValue}
            tint={colors.success}
          />
        </View>
      </Row>

      <Row style={styles.signalRow}>
        <View style={styles.signalColumn}>
          <SignalCard
            icon="football-outline"
            label="Delivery"
            value={deliveryValue}
            tint={colors.secondary}
          />
        </View>
        <View style={styles.signalColumn}>
          <SignalCard
            icon="business-outline"
            label="Access"
            value={accessValue}
            tint={colors.info}
          />
        </View>
      </Row>

      {featuredOfferings.length > 0 ? (
        <Column gap="sm">
          <Row align="center" justify="between">
            <View style={styles.flex}>
              <ThemedText type="defaultSemiBold">Open now</ThemedText>
              <ThemedText style={[styles.supportingCopy, { color: colors.muted }]}>
                Live sessions with real availability, format, and club context.
              </ThemedText>
            </View>
            <View
              style={[styles.liveBadge, { backgroundColor: withAlpha(colors.success, 0.1) }]}
            >
              <ThemedText style={[styles.liveBadgeText, { color: colors.success }]}>
                {sessionOfferings.length} live
              </ThemedText>
            </View>
          </Row>

          {featuredOfferings.map((offering) => (
            <SessionOfferingCard
              key={offering.id}
              offering={offering}
              showCoach={false}
              onPress={() => onOfferingPress(offering)}
            />
          ))}
        </Column>
      ) : (
        <SurfaceCard style={styles.emptyCard}>
          <View
            style={[styles.emptyIconWrap, { backgroundColor: withAlpha(colors.tint, 0.08) }]}
          >
            <Ionicons name="flash-outline" size={20} color={colors.tint} />
          </View>
          <View style={styles.flex}>
            <ThemedText type="defaultSemiBold">{emptyTitle}</ThemedText>
            <ThemedText style={[styles.supportingCopy, { color: colors.muted }]}>
              {emptyMessage}
            </ThemedText>
          </View>
        </SurfaceCard>
      )}

      {onPrimaryAction ? (
        <Button onPress={onPrimaryAction}>
          <Ionicons name="calendar-outline" size={18} color={colors.onPrimary} />
          <ThemedText style={[styles.primaryActionText, { color: colors.onPrimary }]}>
            {primaryActionLabel}
          </ThemedText>
        </Button>
      ) : null}
    </Column>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  signalRow: {
    gap: Spacing.sm,
  },
  signalColumn: {
    flex: 1,
  },
  signalCard: {
    minHeight: 108,
    gap: Spacing.xs,
  },
  signalIconWrap: {
    width: 32,
    height: 32,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalLabel: {
    ...Typography.caption,
  },
  signalValue: {
    ...Typography.bodySemiBold,
  },
  supportingCopy: {
    ...Typography.bodySmall,
  },
  liveBadge: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  liveBadgeText: {
    ...Typography.caption,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    ...Typography.bodySemiBold,
    marginLeft: Spacing.xs,
  },
});
