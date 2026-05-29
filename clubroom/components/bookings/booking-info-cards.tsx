/**
 * BookingInfoCards — Date/Time, Location, and Payment cards for booking detail.
 *
 * Three small card components that display booking metadata with icon rows.
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
import { socialFeedService } from '@/services/social-feed-service';
import { uiFeedback } from '@/services/ui-feedback';
import type { BookingSummary } from '@/constants/types';
import { getBookingRelationshipContext, getBookingSummaryCoachName } from '@/utils/booking-display';
import { formatCommercialModeLabel } from '@/utils/organization-commercial-mode';

type WeatherTone = 'sunny' | 'cloudy' | 'rainy' | 'storm' | 'snow' | 'unknown';

interface WeatherState {
  loading: boolean;
  available: boolean;
  summary?: string;
  temperatureText?: string;
  precipitationText?: string;
  sourceLabel?: string;
  tone?: WeatherTone;
  reason?: string;
}

interface OpenMeteoGeoResponse {
  results?: {
    name: string;
    country?: string;
    admin1?: string;
    latitude: number;
    longitude: number;
  }[];
}

interface OpenMeteoForecastResponse {
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max?: number[];
  };
}

const weatherCache = new Map<string, WeatherState>();

const getDateKey = (iso: string): string => {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDaysUntil = (iso: string): number => {
  const now = new Date();
  const target = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  ).getTime();
  return Math.round((startOfTarget - startOfToday) / (1000 * 60 * 60 * 24));
};

const mapWeatherCode = (
  code: number,
): { summary: string; icon: keyof typeof Ionicons.glyphMap; tone: WeatherTone } => {
  if (code === 0) return { summary: 'Clear', icon: 'sunny-outline', tone: 'sunny' };
  if ([1, 2].includes(code))
    return { summary: 'Partly cloudy', icon: 'partly-sunny-outline', tone: 'cloudy' };
  if (code === 3 || [45, 48].includes(code))
    return { summary: 'Cloudy', icon: 'cloud-outline', tone: 'cloudy' };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82].includes(code)) {
    return { summary: 'Rain likely', icon: 'rainy-outline', tone: 'rainy' };
  }
  if ([66, 67, 71, 73, 75, 77, 85, 86].includes(code)) {
    return { summary: 'Snow/ice risk', icon: 'snow-outline', tone: 'snow' };
  }
  if ([95, 96, 99].includes(code))
    return { summary: 'Thunderstorm risk', icon: 'thunderstorm-outline', tone: 'storm' };
  return { summary: 'Forecast available', icon: 'cloud-outline', tone: 'unknown' };
};

const getWeatherToneColor = (tone: WeatherTone, palette: ReturnType<typeof useTheme>['colors']) => {
  if (tone === 'sunny') return palette.warning;
  if (tone === 'rainy' || tone === 'storm') return palette.tint;
  if (tone === 'snow') return palette.info;
  return palette.muted;
};

async function loadBookingWeather(
  locationLabel: string,
  bookingStartIso: string,
  cacheKey: string,
): Promise<WeatherState> {
  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=${encodeURIComponent(locationLabel)}`;
  const geoResponse = await fetch(geoUrl);
  if (!geoResponse.ok) {
    return {
      loading: false,
      available: false,
      reason: 'Weather forecast is unavailable right now.',
    };
  }
  const geoData = (await geoResponse.json()) as OpenMeteoGeoResponse;
  const first = geoData.results?.[0];
  if (!first) {
    const unavailable = {
      loading: false,
      available: false,
      reason: 'No weather match found for this location.',
    };
    weatherCache.set(cacheKey, unavailable);
    return unavailable;
  }

  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${first.latitude}&longitude=${first.longitude}` +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=16&timezone=auto';
  const forecastResponse = await fetch(forecastUrl);
  if (!forecastResponse.ok) {
    return {
      loading: false,
      available: false,
      reason: 'Weather forecast is unavailable right now.',
    };
  }
  const forecast = (await forecastResponse.json()) as OpenMeteoForecastResponse;
  const daily = forecast.daily;
  const targetDateKey = getDateKey(bookingStartIso);
  const index = daily?.time?.findIndex((date) => date === targetDateKey) ?? -1;

  if (!daily || index < 0) {
    const unavailable = {
      loading: false,
      available: false,
      reason: 'Forecast for this date is not available yet.',
    };
    weatherCache.set(cacheKey, unavailable);
    return unavailable;
  }

  const weatherCode = daily.weather_code[index] ?? -1;
  const maxTemp = daily.temperature_2m_max[index];
  const minTemp = daily.temperature_2m_min[index];
  const precip = daily.precipitation_probability_max?.[index];
  const mapped = mapWeatherCode(weatherCode);
  const sourceBits = [first.name, first.admin1, first.country].filter(Boolean);

  const loaded: WeatherState = {
    loading: false,
    available: true,
    summary: mapped.summary,
    temperatureText:
      Number.isFinite(maxTemp) && Number.isFinite(minTemp)
        ? `${Math.round(minTemp)}°-${Math.round(maxTemp)}°C`
        : undefined,
    precipitationText:
      typeof precip === 'number' ? `${Math.round(precip)}% rain chance` : undefined,
    sourceLabel: sourceBits.join(', '),
    tone: mapped.tone,
  };
  weatherCache.set(cacheKey, loaded);
  return loaded;
}

function useBookingWeather(locationLabel: string, bookingStartIso: string): WeatherState {
  const [state, setState] = useState<WeatherState>({ loading: true, available: false });

  const cacheKey = `${locationLabel.trim().toLowerCase()}|${getDateKey(bookingStartIso)}`;

  // react-doctor-disable-next-line react-doctor/no-fetch-in-effect -- one-shot weather lookup is cached and has cancellation; this app has no query client in this surface.
  useEffect(() => {
    const daysUntil = getDaysUntil(bookingStartIso);

    if (!locationLabel.trim()) {
      startTransition(() => {
        setState({ loading: false, available: false, reason: 'No location set for this booking.' });
      });
      return;
    }

    if (daysUntil < 0) {
      startTransition(() => {
        setState({
          loading: false,
          available: false,
          reason: 'Weather forecast only shows upcoming bookings.',
        });
      });
      return;
    }

    if (daysUntil > 16) {
      startTransition(() => {
        setState({
          loading: false,
          available: false,
          reason: 'Forecast is usually available within 16 days of the session.',
        });
      });
      return;
    }

    const cached = weatherCache.get(cacheKey);
    if (cached) {
      startTransition(() => {
        setState(cached);
      });
      return;
    }

    let cancelled = false;

    void loadBookingWeather(locationLabel, bookingStartIso, cacheKey)
      .then((nextState) => {
        if (!cancelled) {
          setState(nextState);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            loading: false,
            available: false,
            reason: 'Weather forecast is unavailable right now.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bookingStartIso, cacheKey, locationLabel]);

  return state;
}

// ============================================================================
// DATE & TIME CARD
// ============================================================================

interface DateTimeCardProps {
  weekday: string;
  dateStr: string;
  time: string;
}

export const DateTimeCard = function DateTimeCard({ weekday, dateStr, time }: DateTimeCardProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <Row gap="md" align="center">
        <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
          <Ionicons name="calendar" size={24} color={palette.tint} />
        </View>
        <Column gap="xxs" style={styles.flex1}>
          <ThemedText style={styles.cardTitle}>Date & Time</ThemedText>
          <ThemedText type="subtitle" style={styles.cardValue}>
            {weekday}, {dateStr}
          </ThemedText>
          <ThemedText style={styles.cardSubtext}>{time}</ThemedText>
        </Column>
      </Row>
    </SurfaceCard>
  );
};

// ============================================================================
// LOCATION CARD
// ============================================================================

interface LocationCardProps {
  locationLabel: string;
}

export const LocationCard = function LocationCard({ locationLabel }: LocationCardProps) {
  const { colors: palette } = useTheme();

  const handleOpenMap = () => {
    void openLocationInMaps({ location: locationLabel }).then((opened) => {
      if (!opened) {
        uiFeedback.showToast('Could not open maps application.', 'error');
      }
    });
  };

  return (
    <SurfaceCard style={styles.card}>
      <Row gap="md" align="center">
        <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
          <Ionicons name="location" size={24} color={palette.tint} />
        </View>
        <Column gap="xxs" style={styles.flex1}>
          <ThemedText style={styles.cardTitle}>Location</ThemedText>
          <ThemedText type="subtitle" style={styles.cardValue}>
            {locationLabel}
          </ThemedText>
        </Column>
        <Clickable
          style={[styles.actionIconButton, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
          onPress={handleOpenMap}
          accessibilityLabel="Open in maps"
        >
          <Ionicons name="navigate" size={20} color={palette.tint} />
        </Clickable>
      </Row>
      <Clickable
        style={[
          styles.mapPreview,
          {
            backgroundColor: withAlpha(palette.tint, 0.04),
            borderColor: withAlpha(palette.tint, 0.12),
          },
        ]}
        onPress={handleOpenMap}
        accessibilityLabel="Open directions in maps"
      >
        <View style={[styles.mapGrid, { borderColor: withAlpha(palette.border, 0.8) }]} />
        <View style={[styles.mapPin, { backgroundColor: palette.tint }]}>
          <Ionicons name="location" size={18} color={palette.onPrimary} />
        </View>
        <ThemedText style={[styles.mapText, { color: palette.muted }]}>
          Tap for directions
        </ThemedText>
      </Clickable>
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
  onPressAction,
  helperTextOverride,
}: {
  showDemoIndicator?: boolean;
  amount?: number | null;
  invoiceStatus?: 'DRAFT' | 'SENT' | 'PAID' | 'VOID' | 'WRITTEN_OFF' | 'NONE';
  dueDate?: string;
  isCoachView?: boolean;
  onPressAction?: () => void;
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
  const actionLabel = onPressAction ? (isCoachView ? 'Open reconciler' : 'Message coach') : null;

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
      {actionLabel ? (
        <Clickable
          onPress={onPressAction}
          style={[
            styles.paymentActionButton,
            {
              backgroundColor: withAlpha(palette.tint, 0.08),
              borderColor: withAlpha(palette.tint, 0.22),
            },
          ]}
          accessibilityLabel={actionLabel}
        >
          <Ionicons
            name={isCoachView ? 'wallet-outline' : 'chatbubble-ellipses-outline'}
            size={16}
            color={palette.tint}
          />
          <ThemedText style={[styles.paymentActionText, { color: palette.tint }]}>
            {actionLabel}
          </ThemedText>
        </Clickable>
      ) : null}
    </SurfaceCard>
  );
};

// ============================================================================
// WEATHER CARD
// ============================================================================

interface BookingWeatherCardProps {
  locationLabel: string;
  bookingStartIso: string;
}

export const BookingWeatherCard = function BookingWeatherCard({
  locationLabel,
  bookingStartIso,
}: BookingWeatherCardProps) {
  const { colors: palette } = useTheme();
  const weather = useBookingWeather(locationLabel, bookingStartIso);

  const weatherVisual = (() => {
    if (!weather.available || !weather.tone) {
      return {
        icon: 'partly-sunny-outline' as const,
        color: palette.muted,
      };
    }
    const toneColor = getWeatherToneColor(weather.tone, palette);
    const mapped = mapWeatherCode(
      weather.summary === 'Clear'
        ? 0
        : weather.summary === 'Partly cloudy'
          ? 1
          : weather.summary === 'Cloudy'
            ? 3
            : weather.summary === 'Rain likely'
              ? 61
              : weather.summary === 'Thunderstorm risk'
                ? 95
                : weather.summary === 'Snow/ice risk'
                  ? 71
                  : 3,
    );
    return { icon: mapped.icon, color: toneColor };
  })();

  return (
    <SurfaceCard style={styles.card}>
      <Row gap="md" align="center">
        <View
          style={[styles.iconCircle, { backgroundColor: withAlpha(weatherVisual.color, 0.12) }]}
        >
          <Ionicons name={weatherVisual.icon} size={24} color={weatherVisual.color} />
        </View>
        <Column gap="xxs" style={styles.flex1}>
          <ThemedText style={styles.cardTitle}>Weather</ThemedText>
          {weather.loading ? (
            <>
              <ThemedText type="subtitle" style={styles.cardValue}>
                Loading forecast…
              </ThemedText>
              <ThemedText style={styles.cardSubtext}>Checking session-day weather</ThemedText>
            </>
          ) : weather.available ? (
            <>
              <ThemedText type="subtitle" style={styles.cardValue}>
                {weather.summary}
                {weather.temperatureText ? ` · ${weather.temperatureText}` : ''}
              </ThemedText>
              <ThemedText style={styles.cardSubtext}>
                {weather.precipitationText ?? 'Forecast loaded'}
                {weather.sourceLabel ? ` · ${weather.sourceLabel}` : ''}
              </ThemedText>
            </>
          ) : (
            <>
              <ThemedText type="subtitle" style={styles.cardValue}>
                Forecast unavailable
              </ThemedText>
              <ThemedText style={styles.cardSubtext}>
                {weather.reason ?? 'Could not load weather for this booking date.'}
              </ThemedText>
            </>
          )}
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
  coachPhotoUrl: string;
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
          <Image
            source={{ uri: coachPhotoUrl }}
            style={styles.avatar}
            accessibilityLabel={`${coachName} photo`}
          />
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
  clientPhotoUrl: string;
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
          <Image
            source={{ uri: clientPhotoUrl }}
            style={styles.avatar}
            accessibilityLabel={`${childName} photo`}
          />
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
// OWNERSHIP CARD
// ============================================================================

interface BookingOwnershipCardProps {
  booking: BookingSummary;
  coachLabel?: string;
  showAuditTrail?: boolean;
}

function formatAuditTimestamp(iso?: string): string {
  if (!iso) return 'Unknown time';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const BookingOwnershipCard = function BookingOwnershipCard({
  booking,
  coachLabel,
  showAuditTrail = false,
}: BookingOwnershipCardProps) {
  const { colors: palette } = useTheme();
  const [organizationLabel, setOrganizationLabel] = useState<string | null>(booking.clubId ?? null);
  const resolvedCoachLabel =
    coachLabel || booking.ownerCoachName || getBookingSummaryCoachName(booking);
  const deliveryLabel = booking.assigneeCoachName || booking.assigneeCoachId || resolvedCoachLabel;
  const relationshipContext = getBookingRelationshipContext({
    actingAs: booking.actingAs,
    organizationLabel,
    coachLabel: resolvedCoachLabel,
    deliveredByLabel: deliveryLabel,
    commercialMode: booking.commercialMode,
  });
  const ownershipMode =
    booking.actingAs === 'club'
      ? `${formatCommercialModeLabel(booking.commercialMode)} club booking`
      : 'Independent coach booking';
  const relationshipRows = [
    organizationLabel ? { label: 'Organization', value: organizationLabel } : null,
    { label: 'Booked with', value: relationshipContext.bookedWithLabel },
    { label: 'Delivered by', value: relationshipContext.deliveredByLabel },
    { label: 'Billing handled by', value: relationshipContext.billingLabel },
    { label: 'Support handled by', value: relationshipContext.supportLabel },
    booking.ownerCoachName &&
    booking.ownerCoachName !== relationshipContext.deliveredByLabel &&
    booking.ownerCoachName !== relationshipContext.bookedWithLabel
      ? { label: 'Session owner', value: booking.ownerCoachName }
      : null,
  ].filter((entry): entry is { label: string; value: string } => Boolean(entry));
  const timelineEntries = [
    {
      id: 'created',
      label: `Created by ${booking.createdByName || 'Unknown'}`,
      meta: booking.createdByRole ? booking.createdByRole.replace('_', ' ') : undefined,
      time: formatAuditTimestamp(booking.createdAt),
    },
    {
      id: 'assigned',
      label: `Delivered by ${relationshipContext.deliveredByLabel}`,
      meta:
        booking.actingAs === 'club'
          ? `Billing: ${relationshipContext.billingLabel}`
          : 'Independent coach booking',
      time: formatAuditTimestamp(booking.createdAt),
    },
    {
      id: 'scheduled',
      label: 'Scheduled session',
      meta: 'Booking schedule locked',
      time: formatAuditTimestamp(booking.start),
    },
  ];

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
      setOrganizationLabel(club?.name || booking.clubId || null);
    });

    return () => {
      cancelled = true;
    };
  }, [booking.actingAs, booking.clubId]);

  return (
    <SurfaceCard style={styles.card}>
      <Row gap="md" align="flex-start">
        <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.info, 0.12) }]}>
          <Ionicons name="briefcase-outline" size={24} color={palette.info} />
        </View>
        <Column gap="xxs" style={styles.flex1}>
          <ThemedText style={styles.cardTitle}>
            {showAuditTrail ? 'Ownership & Audit' : 'Who Handles This Booking'}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.cardValue}>
            {ownershipMode}
          </ThemedText>
          <ThemedText style={styles.cardSubtext}>{relationshipContext.paymentSummary}</ThemedText>
        </Column>
      </Row>

      <View style={[styles.relationshipContainer, { borderColor: palette.border }]}>
        {relationshipRows.map((entry) => (
          <View key={entry.label} style={styles.relationshipRow}>
            <ThemedText style={[styles.timelineMeta, { color: palette.muted }]}>
              {entry.label}
            </ThemedText>
            <ThemedText style={styles.timelineLabel}>{entry.value}</ThemedText>
          </View>
        ))}
      </View>

      {showAuditTrail ? (
        <View style={[styles.timelineContainer, { borderColor: palette.border }]}>
          {timelineEntries.map((entry) => (
            <Row key={entry.id} align="flex-start" gap="sm" style={styles.timelineRow}>
              <View style={[styles.timelineDot, { backgroundColor: palette.info }]} />
              <Column gap="xxs" style={styles.flex1}>
                <ThemedText style={styles.timelineLabel}>{entry.label}</ThemedText>
                {entry.meta ? (
                  <ThemedText style={[styles.timelineMeta, { color: palette.muted }]}>
                    {entry.meta}
                  </ThemedText>
                ) : null}
                <ThemedText style={[styles.timelineMeta, { color: palette.muted }]}>
                  {entry.time}
                </ThemedText>
              </Column>
            </Row>
          ))}
        </View>
      ) : null}
    </SurfaceCard>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: { padding: Spacing.lg, gap: Spacing.md },
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
  paymentActionButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  paymentActionText: {
    ...Typography.bodySmall,
    fontWeight: '700',
  },
  mapPreview: {
    height: 120,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mapGrid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
    borderWidth: 1,
    borderStyle: 'dashed',
    margin: Spacing.sm,
    borderRadius: Radii.sm,
  },
  mapPin: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapText: { ...Typography.caption },
  avatar: { width: 48, height: 48, borderRadius: Radii.xl },
  ratingText: { ...Typography.caption, opacity: 0.6 },
  relationshipContainer: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  relationshipRow: {
    gap: Spacing.micro,
  },
  actionIconButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineContainer: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  timelineRow: {
    minHeight: 36,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.pill,
    marginTop: 6,
  },
  timelineLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  timelineMeta: {
    ...Typography.caption,
  },
});
