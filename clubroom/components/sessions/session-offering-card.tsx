import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { Row } from '@/components/primitives/row';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { SessionOffering } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { getSessionOfferingCoachName } from '@/utils/session-display';
import { openLocationInMaps } from '@/utils/map-links';
import {
  getSessionOfferingHeadcount,
  isSessionOfferingFull,
} from '@/utils/session-offering-capacity';
import { getCoachWorkContextDisplay } from '@/utils/coach-business-context';

import { SessionTypeBadge, SessionFooterBadges } from './session-offering-card-sections';
import { uiFeedback } from '@/services/ui-feedback';

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
  const { currentUser } = useAuth();
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
        uiFeedback.showToast('Could not open maps application.', 'error');
      }
    });
  };

  const totalParticipants = getSessionOfferingHeadcount(offering);
  const isFull = isSessionOfferingFull(offering);
  const capacityText = `${totalParticipants}/${offering.maxParticipants}`;
  const priceLabel =
    offering.price !== undefined && offering.price > 0
      ? `£${offering.price.toFixed(2)}`
      : null;
  const viewerAudienceText = offering.viewerAthleteNames?.length
    ? offering.viewerAthleteNames.length <= 2
      ? offering.viewerAthleteNames.join(', ')
      : `${offering.viewerAthleteNames.slice(0, 2).join(', ')} +${offering.viewerAthleteNames.length - 2}`
    : null;
  const isClubOwned = offering.actingAs === 'club';
  const isCoachViewer = currentUser?.role === 'COACH';
  const workContext = getCoachWorkContextDisplay(offering);
  const ownershipLabel =
    !showCoach && isClubOwned
      ? offering.assigneeCoachId
        ? 'Assigned by Club'
        : 'Club-owned'
      : null;
  const ownerLabel = offering.ownerCoachId || coachName;
  const assigneeLabel = offering.assigneeCoachId || null;

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

          {ownershipLabel && (
            <View style={[styles.ownershipBadge, { backgroundColor: withAlpha(palette.info, 0.1) }]}>
              <ThemedText style={[styles.ownershipText, { color: palette.info }]}>
                {ownershipLabel}
              </ThemedText>
            </View>
          )}
          {isClubOwned ? (
            <View
              style={[
                styles.ownershipBlock,
                {
                  backgroundColor: withAlpha(palette.info, 0.08),
                  borderColor: withAlpha(palette.info, 0.22),
                },
              ]}
            >
              <Row align="center" gap="xxs">
                <Ionicons name="business-outline" size={12} color={palette.info} />
                <ThemedText style={[styles.ownershipText, { color: palette.info }]}>
                  Club: {offering.clubId || 'Club session'}
                </ThemedText>
              </Row>
              <ThemedText style={[styles.metaText, { color: palette.text }]} numberOfLines={1}>
                Delivered by {assigneeLabel || coachName}
              </ThemedText>
              {assigneeLabel && assigneeLabel !== ownerLabel ? (
                <ThemedText style={[styles.metaText, { color: palette.muted }]} numberOfLines={1}>
                  Owner {ownerLabel}
                </ThemedText>
              ) : null}
            </View>
          ) : !showCoach && isCoachViewer ? (
            <View
              style={[
                styles.ownershipBlock,
                {
                  backgroundColor: withAlpha(palette.tint, 0.08),
                  borderColor: withAlpha(palette.tint, 0.18),
                },
              ]}
            >
              <Row align="center" gap="xxs">
                <Ionicons name="briefcase-outline" size={12} color={palette.tint} />
                <ThemedText style={[styles.ownershipText, { color: palette.tint }]}>
                  {workContext.label}
                </ThemedText>
              </Row>
              <ThemedText style={[styles.metaText, { color: palette.text }]} numberOfLines={1}>
                {workContext.detail}
              </ThemedText>
            </View>
          ) : null}

          {showCoach && (
            <ThemedText style={[styles.subtitle, { color: palette.muted }]} numberOfLines={1}>
              with {coachName}
            </ThemedText>
          )}

          {viewerAudienceText && (
            <Row align="center" gap="xxs" style={styles.metaRow}>
              <Ionicons name="person-outline" size={14} color={palette.tint} />
              <ThemedText style={[styles.metaText, { color: palette.tint }]} numberOfLines={1}>
                For: {viewerAudienceText}
              </ThemedText>
            </Row>
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
              accessibilityRole="none"
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
            registeredCount={totalParticipants}
            maxParticipants={offering.maxParticipants}
            price={undefined}
            palette={palette}
          />
        </View>

        <View style={styles.trailing}>
          {priceLabel ? (
            <ThemedText style={styles.price} numberOfLines={1}>
              {priceLabel}
            </ThemedText>
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
  ownershipBadge: {
    borderRadius: Radii.pill,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
  },
  ownershipBlock: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    gap: Spacing.micro,
  },
  ownershipText: {
    ...Typography.micro,
    fontWeight: '700',
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
    minWidth: 74,
    gap: Spacing.xxs,
    flexShrink: 0,
  },
  price: {
    ...Typography.subheading,
    fontWeight: '700',
    lineHeight: Typography.subheading.lineHeight,
  },
});
