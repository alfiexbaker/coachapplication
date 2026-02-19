import { Ionicons } from '@expo/vector-icons';
import { Alert, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { Row } from '@/components/primitives/row';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { SessionOffering } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { getSessionOfferingCoachName } from '@/utils/session-display';
import { openLocationInMaps } from '@/utils/map-links';

import { SessionTypeBadge, SessionFooterBadges } from './session-offering-card-sections';

// Re-export extracted components for backward compat
export { SessionTypeBadge, SessionFooterBadges } from './session-offering-card-sections';
export type {
  SessionTypeBadgeProps,
  SessionFooterBadgesProps,
} from './session-offering-card-sections';

interface SessionOfferingCardProps {
  offering: SessionOffering;
  onPress?: () => void;
  showCoach?: boolean;
  showCapacity?: boolean;
}

export function SessionOfferingCard({
  offering,
  onPress,
  showCoach = false,
  showCapacity = true,
}: SessionOfferingCardProps) {
  const { colors: palette } = useTheme();
  const coachName = getSessionOfferingCoachName(offering);
  const locationLabel = offering.venueName
    ? `${offering.venueName} · ${offering.location}`
    : offering.location;
  const handleOpenLocation = (event: GestureResponderEvent) => {
    event.stopPropagation();
    void openLocationInMaps({
      location: offering.location,
      coordinates: offering.locationCoordinates,
    }).then((opened) => {
      if (!opened) {
        Alert.alert('Error', 'Could not open maps application.');
      }
    });
  };

  const registeredCount = offering.registrations.filter((r) => r.status === 'confirmed').length;
  const isFull = registeredCount >= offering.maxParticipants;
  const capacityText = `${registeredCount}/${offering.maxParticipants}`;

  const formatSchedule = () => {
    if (offering.isRecurring && offering.dayOfWeek !== undefined && offering.timeOfDay) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Every ${days[offering.dayOfWeek]} · ${offering.timeOfDay}`;
    }
    const date = new Date(offering.scheduledAt);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      <Row align="center" gap="sm" style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
          <Ionicons
            name={offering.sessionType === 'group' ? 'people' : 'person'}
            size={18}
            color={palette.tint}
          />
        </View>

        <View style={styles.content}>
          <Row align="center" gap="xs" style={styles.titleRow}>
            <ThemedText style={styles.title} numberOfLines={1}>
              {offering.title}
            </ThemedText>
            <SessionTypeBadge sessionType={offering.sessionType} palette={palette} />
          </Row>

          {showCoach && (
            <ThemedText style={[styles.subtitle, { color: palette.muted }]} numberOfLines={1}>
              with {coachName}
            </ThemedText>
          )}

          <Row align="center" gap="xxs" style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.metaText, { color: palette.muted }]} numberOfLines={1}>
              {formatSchedule()}
            </ThemedText>
          </Row>

          <Row align="center" gap="xxs" style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={palette.tint} />
            <ThemedText style={[styles.metaText, { color: palette.tint }]} numberOfLines={1}>
              {locationLabel}
            </ThemedText>
            <Clickable
              onPress={handleOpenLocation}
              accessibilityLabel="Open training location in maps"
              style={[styles.mapButton, { backgroundColor: withAlpha(palette.tint, 0.08) }]}
            >
              <Ionicons name="navigate-outline" size={12} color={palette.tint} />
            </Clickable>
          </Row>

          {offering.footballSkill && (
            <Row align="center" gap="xxs" style={styles.metaRow}>
              <Ionicons name="football-outline" size={14} color={palette.muted} />
              <ThemedText style={[styles.metaText, { color: palette.muted }]} numberOfLines={1}>
                Focus: {offering.footballSkill}
              </ThemedText>
            </Row>
          )}

          <SessionFooterBadges
            ageMin={offering.ageMin}
            ageMax={offering.ageMax}
            sessionType={offering.sessionType}
            isFull={isFull}
            showCapacity={showCapacity}
            showCoach={showCoach}
            capacityText={capacityText}
            registeredCount={registeredCount}
            maxParticipants={offering.maxParticipants}
            priceUsd={undefined}
            palette={palette}
          />
        </View>

        <View style={styles.trailing}>
          {offering.priceUsd !== undefined && offering.priceUsd > 0 ? (
            <ThemedText style={styles.price}>£{offering.priceUsd}</ThemedText>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={palette.muted} />
        </View>
      </Row>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
  },
  row: {
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: Spacing.micro,
    minWidth: 0,
  },
  titleRow: {
    minWidth: 0,
  },
  title: {
    ...Typography.subheading,
    flexShrink: 1,
  },
  subtitle: {
    ...Typography.bodySmall,
  },
  metaRow: {
    minWidth: 0,
  },
  metaText: {
    ...Typography.caption,
    flex: 1,
  },
  mapButton: {
    width: 24,
    height: 24,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trailing: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 56,
    gap: Spacing.xxs,
  },
  price: {
    ...Typography.heading,
    lineHeight: Typography.heading.fontSize,
  },
});
