import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { Row } from '@/components/primitives/row';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { SessionOffering } from '@/constants/types';
import { scaleFont } from '@/utils/scale';
import { useTheme } from '@/hooks/useTheme';
import { getSessionOfferingCoachName } from '@/utils/session-display';

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

  const registeredCount = offering.registrations.filter((r) => r.status === 'confirmed').length;
  const isFull = registeredCount >= offering.maxParticipants;
  const capacityText = `${registeredCount}/${offering.maxParticipants}`;

  const formatSchedule = () => {
    if (offering.isRecurring && offering.dayOfWeek !== undefined && offering.timeOfDay) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Every ${days[offering.dayOfWeek]} at ${offering.timeOfDay}`;
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
      <View style={styles.header}>
        <Row wrap align="center" gap={10}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            {offering.title}
          </ThemedText>
          <SessionTypeBadge sessionType={offering.sessionType} palette={palette} />
        </Row>
        {showCoach && <ThemedText style={styles.coachName}>with {coachName}</ThemedText>}
      </View>

      {offering.description && (
        <ThemedText style={styles.description} numberOfLines={2}>
          {offering.description}
        </ThemedText>
      )}

      <Row align="center" gap={14} style={styles.detailsRow}>
        <Row align="center" gap={8} flex>
          <Ionicons name="calendar-outline" size={16} color={palette.icon} />
          <ThemedText style={styles.detailText}>{formatSchedule()}</ThemedText>
        </Row>
      </Row>
      <Row align="center" gap={14} style={styles.detailsRow}>
        <Row align="center" gap={8} flex>
          <Ionicons name="location-outline" size={16} color={palette.icon} />
          <ThemedText style={styles.detailText}>{offering.location}</ThemedText>
        </Row>
      </Row>
      {offering.footballSkill && (
        <Row align="center" gap={14} style={styles.detailsRow}>
          <Row align="center" gap={8} flex>
            <Ionicons name="football-outline" size={16} color={palette.icon} />
            <ThemedText style={styles.detailText}>Focus: {offering.footballSkill}</ThemedText>
          </Row>
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
        priceUsd={offering.priceUsd}
        palette={palette}
      />

      {isFull && offering.status === 'active' && (
        <View style={[styles.fullOverlay, { backgroundColor: withAlpha(palette.error, 0.06) }]}>
          <ThemedText style={[styles.fullText, { color: palette.error }]}>Session Full</ThemedText>
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.sm, padding: Spacing.lg, gap: Spacing.sm },
  header: { gap: 10 },
  title: {
    flex: 1,
    fontSize: scaleFont(18),
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: scaleFont(25),
  },
  coachName: {
    fontSize: scaleFont(15),
    opacity: 0.6,
    fontWeight: '500',
    lineHeight: scaleFont(21),
    marginTop: Spacing.micro,
  },
  description: {
    fontSize: scaleFont(15),
    opacity: 0.7,
    lineHeight: scaleFont(22),
    marginTop: Spacing.xxs,
  },
  detailsRow: { marginTop: Spacing.xxs },
  detailText: { fontSize: scaleFont(14), flex: 1, opacity: 0.8, lineHeight: scaleFont(20) },
  fullOverlay: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: Spacing.sm - 4,
    paddingVertical: Spacing.xs - 2,
    borderRadius: Radii.sm,
  },
  fullText: {
    fontSize: scaleFont(12),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
