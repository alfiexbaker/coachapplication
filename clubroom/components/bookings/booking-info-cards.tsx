/**
 * BookingInfoCards — Booking facts and participant cards.
 */

import React, { useEffect, useState, startTransition } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/components/ui/toast';
import { createLogger } from '@/utils/logger';
import { openLocationInMaps } from '@/utils/map-links';
import { coachService } from '@/services/coach-service';
import { uiFeedback } from '@/services/ui-feedback';

interface BookingEssentialsCardProps {
  weekday: string;
  dateStr: string;
  time: string;
  locationLabel: string;
}

export const BookingEssentialsCard = function BookingEssentialsCard({
  weekday,
  dateStr,
  time,
  locationLabel,
}: BookingEssentialsCardProps) {
  const { colors: palette } = useTheme();

  const handleOpenMap = () => {
    void openLocationInMaps({ location: locationLabel }).then((opened) => {
      if (!opened) {
        uiFeedback.showToast('Could not open maps application.', 'error');
      }
    });
  };

  return (
    <SurfaceCard style={styles.essentialsCard}>
      <Row gap="sm" align="center">
        <Ionicons name="calendar-outline" size={20} color={palette.muted} />
        <Column gap="micro" style={styles.flex1}>
          <ThemedText type="defaultSemiBold">
            {weekday}, {dateStr}
          </ThemedText>
          <ThemedText style={[styles.essentialMeta, { color: palette.muted }]}>{time}</ThemedText>
        </Column>
      </Row>
      <View style={[styles.essentialDivider, { backgroundColor: palette.border }]} />
      <Row gap="sm" align="center">
        <Ionicons name="location-outline" size={20} color={palette.muted} />
        <ThemedText style={styles.flex1} numberOfLines={2}>
          {locationLabel}
        </ThemedText>
        <Clickable
          style={[styles.directionsButton, { borderColor: palette.border }]}
          onPress={handleOpenMap}
          accessibilityRole="button"
          accessibilityLabel={`Directions to ${locationLabel}`}
        >
          <Ionicons name="navigate-outline" size={17} color={palette.tint} />
          <ThemedText style={[styles.directionsLabel, { color: palette.tint }]}>
            Directions
          </ThemedText>
        </Clickable>
      </Row>
    </SurfaceCard>
  );
};

// ============================================================================
// PAYMENT CARD
// ============================================================================

export const PaymentCard = function PaymentCard({
  showDemoIndicator = false,
  amount = null,
  invoiceStatus = 'NONE',
  dueDate,
  isCoachView = false,
  helperTextOverride,
}: {
  showDemoIndicator?: boolean;
  amount?: number | null;
  invoiceStatus?: 'DRAFT' | 'SENT' | 'PAID' | 'VOID' | 'WRITTEN_OFF' | 'NONE' | 'UNKNOWN';
  dueDate?: string;
  isCoachView?: boolean;
  helperTextOverride?: string;
}) {
  const { colors: palette } = useTheme();
  const amountLabel =
    typeof amount === 'number' && Number.isFinite(amount) ? `£${amount.toFixed(2)}` : 'Amount TBC';
  const dueDateLabel = (() => {
    if (!dueDate) return null;
    const parsed = new Date(dueDate);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  })();
  const statusMeta = (() => {
    if (invoiceStatus === 'PAID') {
      return {
        label: 'Paid',
        tone: palette.success,
      };
    }
    if (invoiceStatus === 'SENT') {
      return {
        label: 'Awaiting payment',
        tone: palette.warning,
      };
    }
    if (invoiceStatus === 'DRAFT') {
      return {
        label: 'Draft invoice',
        tone: palette.info,
      };
    }
    if (invoiceStatus === 'VOID' || invoiceStatus === 'WRITTEN_OFF') {
      return {
        label: 'Not collectible',
        tone: palette.muted,
      };
    }
    if (invoiceStatus === 'UNKNOWN') {
      return {
        label: 'Status unavailable',
        tone: palette.warning,
      };
    }
    return {
      label: 'Direct payment',
      tone: palette.tint,
    };
  })();
  const helperText = (() => {
    if (helperTextOverride?.trim()) {
      return helperTextOverride;
    }
    if (invoiceStatus === 'PAID') {
      return isCoachView ? 'Marked paid in your reconciler.' : 'Marked paid by your coach.';
    }
    if (isCoachView) {
      return 'Families pay you directly. Track status in your earnings reconciler.';
    }
    if (dueDateLabel) {
      return `Pay coach directly using shared details. Due by ${dueDateLabel}.`;
    }
    return 'Pay coach directly using the details they shared.';
  })();
  return (
    <SurfaceCard style={styles.card}>
      {showDemoIndicator ? (
        <Row justify="flex-end" align="center">
          <View style={[styles.demoBadge, { backgroundColor: withAlpha(palette.warning, 0.12) }]}>
            <ThemedText style={[styles.demoBadgeText, { color: palette.warning }]}>Demo</ThemedText>
          </View>
        </Row>
      ) : null}
      <Row gap="md" align="center">
        <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
          <Ionicons name="cash-outline" size={24} color={palette.tint} />
        </View>
        <Column gap="xxs" style={styles.flex1}>
          <ThemedText style={styles.cardTitle}>Payment</ThemedText>
          <ThemedText type="subtitle" style={styles.cardValue}>
            {amountLabel}
          </ThemedText>
          <View
            style={[
              styles.paymentStatusPill,
              { backgroundColor: withAlpha(statusMeta.tone, 0.12) },
            ]}
          >
            <ThemedText style={[styles.paymentStatusText, { color: statusMeta.tone }]}>
              {statusMeta.label}
            </ThemedText>
          </View>
          <ThemedText
            style={[
              styles.cardSubtext,
              { color: showDemoIndicator ? palette.warning : palette.muted },
            ]}
          >
            {helperText}
          </ThemedText>
        </Column>
      </Row>
    </SurfaceCard>
  );
};

// ============================================================================
// COACH CARD
// ============================================================================
const logger = createLogger('BookingInfoCards');

interface CoachCardProps {
  coachId?: string;
  bookingId?: string;
  coachName: string;
  coachPhotoUrl?: string;
}

export const BookingCoachCard = function BookingCoachCard({
  coachId,
  bookingId,
  coachName,
  coachPhotoUrl,
}: CoachCardProps) {
  const { colors: palette } = useTheme();
  const { showToast } = useToast();
  const [coachRating, setCoachRating] = useState<number | null>(null);
  const [coachReviewCount, setCoachReviewCount] = useState<number | null>(null);

  const handlePress = () => {
    if (!coachId) {
      logger.warn('Coach profile unavailable from booking card', { bookingId });
      showToast('Coach profile unavailable', 'warning');
      return;
    }
    router.push(Routes.profile(coachId));
  };

  useEffect(() => {
    if (!coachId) {
      startTransition(() => {
        setCoachRating(null);
      });
      startTransition(() => {
        setCoachReviewCount(null);
      });
      return;
    }

    let isMounted = true;
    void Promise.all([coachService.getCoach(coachId), coachService.getCoachReviews(coachId)])
      .then(([coachResult, reviewsResult]) => {
        if (!isMounted) return;

        const reviews = reviewsResult.success ? reviewsResult.data : [];
        const averageFromReviews =
          reviews.length > 0
            ? Math.round(
                (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10,
              ) / 10
            : null;
        const countFromReviews = reviews.length > 0 ? reviews.length : null;

        const fallbackRating = coachResult.success ? coachResult.data.rating : null;
        const fallbackCount = coachResult.success ? coachResult.data.reviewCount : null;

        setCoachRating(averageFromReviews ?? fallbackRating);
        setCoachReviewCount(countFromReviews ?? fallbackCount);
      })
      .catch(() => {
        if (!isMounted) return;
        setCoachRating(null);
        setCoachReviewCount(null);
      });

    return () => {
      isMounted = false;
    };
  }, [coachId]);

  return (
    <Clickable onPress={handlePress} accessibilityLabel={`View ${coachName} profile`}>
      <SurfaceCard style={styles.card}>
        <Row gap="md" align="center">
          {coachPhotoUrl ? (
            <Image
              source={{ uri: coachPhotoUrl }}
              style={styles.avatar}
              accessibilityLabel={`${coachName} photo`}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarFallback,
                { backgroundColor: withAlpha(palette.tint, 0.1) },
              ]}
            >
              <Ionicons name="person-outline" size={22} color={palette.tint} />
            </View>
          )}
          <Column gap="xxs" style={styles.flex1}>
            <ThemedText style={styles.cardTitle}>Your Coach</ThemedText>
            <ThemedText type="subtitle" style={styles.cardValue}>
              {coachName}
            </ThemedText>
            <Row gap="xxs" align="center">
              <Ionicons name="star" size={14} color={palette.warning} />
              <ThemedText style={styles.ratingText}>
                {typeof coachRating === 'number' && typeof coachReviewCount === 'number'
                  ? coachReviewCount > 0
                    ? `${coachRating.toFixed(1)} · ${coachReviewCount} review${coachReviewCount === 1 ? '' : 's'}`
                    : 'No reviews yet'
                  : 'Loading rating...'}
              </ThemedText>
            </Row>
          </Column>
          <Ionicons name="chevron-forward" size={20} color={palette.muted} />
        </Row>
      </SurfaceCard>
    </Clickable>
  );
};

// ============================================================================
// ATHLETE CARD (coach view only)
// ============================================================================

interface AthleteCardProps {
  childName: string;
  clientId: string;
  clientPhotoUrl?: string;
}

export const BookingAthleteCard = function BookingAthleteCard({
  childName,
  clientId,
  clientPhotoUrl,
}: AthleteCardProps) {
  const { colors: palette } = useTheme();

  const handlePress = () => {
    router.push(Routes.developmentAthlete(clientId));
  };

  return (
    <Clickable onPress={handlePress} accessibilityLabel={`View ${childName} profile`}>
      <SurfaceCard style={styles.card}>
        <Row gap="md" align="center">
          {clientPhotoUrl ? (
            <Image
              source={{ uri: clientPhotoUrl }}
              style={styles.avatar}
              accessibilityLabel={`${childName} photo`}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarFallback,
                { backgroundColor: withAlpha(palette.tint, 0.1) },
              ]}
            >
              <Ionicons name="person-outline" size={22} color={palette.tint} />
            </View>
          )}
          <Column gap="xxs" style={styles.flex1}>
            <ThemedText style={styles.cardTitle}>Athlete</ThemedText>
            <ThemedText type="subtitle" style={styles.cardValue}>
              {childName}
            </ThemedText>
          </Column>
          <Ionicons name="chevron-forward" size={20} color={palette.muted} />
        </Row>
      </SurfaceCard>
    </Clickable>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: { padding: Spacing.lg, gap: Spacing.md },
  essentialsCard: { padding: Spacing.md, gap: Spacing.sm },
  essentialMeta: { ...Typography.bodySmall },
  essentialDivider: { height: StyleSheet.hairlineWidth, marginLeft: 28 },
  directionsButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
  },
  directionsLabel: { ...Typography.bodySmall, fontWeight: '700' },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flex1: { flex: 1 },
  cardTitle: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
    fontWeight: '600',
  },
  cardValue: { ...Typography.subheading },
  cardSubtext: { ...Typography.bodySmall, opacity: 0.6 },
  demoBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
    marginBottom: Spacing.xxs,
  },
  demoBadgeText: { ...Typography.caption, fontWeight: '600' },
  paymentStatusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  paymentStatusText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  avatar: { width: 48, height: 48, borderRadius: Radii.xl },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  ratingText: { ...Typography.caption, opacity: 0.6 },
});
