/**
 * SessionInfoSection — Session details card: title, schedule, location, meta badges, awards.
 */
import { memo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Divider } from '@/components/ui/primitives/Divider';
import { Radii, Typography, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';
import type { SessionOffering, BadgeAward } from '@/constants/types';
import { getSessionOfferingCoachName } from '@/utils/session-display';
import { openLocationInMaps } from '@/utils/map-links';

interface SessionInfoSectionProps {
  offering: SessionOffering;
  isMyOffering: boolean;
  registeredCount: number;
  offPlatformParticipants?: number;
  totalParticipants?: number;
  sessionAwards: BadgeAward[];
  formatSchedule: () => string;
}

function SessionInfoSectionInner({
  offering,
  isMyOffering,
  registeredCount,
  offPlatformParticipants = 0,
  totalParticipants,
  sessionAwards,
  formatSchedule,
}: SessionInfoSectionProps) {
  const { colors: palette } = useTheme();
  const coachName = getSessionOfferingCoachName(offering);
  const locationLabel = offering.venueName
    ? `${offering.venueName} · ${offering.location}`
    : offering.location;
  const handleOpenLocation = () => {
    void openLocationInMaps({
      location: offering.location,
      coordinates: offering.locationCoordinates,
    }).then((opened) => {
      if (!opened) {
        Alert.alert('Error', 'Could not open maps application.');
      }
    });
  };

  const headcount = totalParticipants ?? registeredCount + offPlatformParticipants;

  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="subtitle" style={styles.title}>
        {offering.title}
      </ThemedText>

      {!isMyOffering && (
        <Row align="center" gap={10} style={styles.detailRow}>
          <Ionicons name="person-circle-outline" size={20} color={palette.icon} />
          <ThemedText>Coach: {coachName}</ThemedText>
        </Row>
      )}

      <Row align="center" gap={10} style={styles.detailRow}>
        <Ionicons name="calendar-outline" size={20} color={palette.icon} />
        <ThemedText>{formatSchedule()}</ThemedText>
      </Row>

      <Clickable
        onPress={handleOpenLocation}
        accessibilityLabel="Open training location in maps"
        style={styles.locationLink}
      >
        <Row align="center" gap={10} style={styles.detailRow}>
          <Ionicons name="location-outline" size={20} color={palette.icon} />
          <ThemedText style={{ flex: 1 }}>{locationLabel}</ThemedText>
          <Ionicons name="navigate-outline" size={18} color={palette.tint} />
        </Row>
      </Clickable>

      {offering.description && (
        <>
          <Divider spacing={14} />
          <ThemedText style={styles.description}>{offering.description}</ThemedText>
        </>
      )}

      <Row wrap gap={10} style={styles.metaRow}>
        {offering.sessionType === 'group' && (
          <View style={[styles.badge, { backgroundColor: withAlpha(palette.accent, 0.09) }]}>
            <ThemedText style={[styles.badgeText, { color: palette.accent }]}>
              Group ({headcount}/{offering.maxParticipants})
            </ThemedText>
          </View>
        )}
        {offering.ageMin && offering.ageMax && (
          <View style={[styles.badge, { backgroundColor: palette.border }]}>
            <ThemedText style={styles.badgeText}>
              Ages {offering.ageMin}-{offering.ageMax}
            </ThemedText>
          </View>
        )}
        {offering.footballSkill && (
          <View style={[styles.badge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <ThemedText style={[styles.badgeText, { color: palette.tint }]}>
              {offering.footballSkill}
            </ThemedText>
          </View>
        )}
        {offering.price !== undefined && offering.price > 0 && (
          <ThemedText type="defaultSemiBold" style={styles.price}>
            £{offering.price}
          </ThemedText>
        )}
      </Row>

      {sessionAwards.length > 0 && (
        <View style={styles.awardsBlock}>
          <ThemedText type="defaultSemiBold">Badges linked to this session</ThemedText>
          <Row wrap gap={8}>
            {sessionAwards.map((award) => (
              <View key={award.id} style={[styles.awardChip, { borderColor: palette.border }]}>
                <ThemedText type="defaultSemiBold">{award.badgeLabel}</ThemedText>
                <ThemedText style={[styles.awardMeta, { color: palette.muted }]}>
                  Awarded{' '}
                  {new Date(award.awardedAt).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}{' '}
                  by {award.awardedBy || award.coachId || 'Coach'}
                </ThemedText>
              </View>
            ))}
          </Row>
          <Clickable
            onPress={() => router.push(Routes.DEVELOPMENT_BADGES)}
            style={styles.manageBadgesLink}
            accessibilityLabel="Open badges workspace"
            accessibilityHint="Link badges to this session"
          >
            <Row align="center" gap="xxs">
              <Ionicons name="link-outline" size={14} color={palette.tint} />
              <Ionicons name="arrow-forward" size={14} color={palette.tint} />
            </Row>
          </Clickable>
        </View>
      )}
    </SurfaceCard>
  );
}

export const SessionInfoSection = memo(SessionInfoSectionInner);

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.sm, padding: Spacing.md, gap: Spacing.sm },
  title: {
    fontSize: scaleFont(24),
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: scaleFont(32),
  },
  detailRow: { marginTop: Spacing.xxs },
  locationLink: { marginTop: Spacing.xxs },
  description: { fontSize: scaleFont(15), opacity: 0.7, lineHeight: scaleFont(22) },
  metaRow: { marginTop: Spacing.xs + Spacing.xxs },
  badge: {
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  badgeText: { fontSize: scaleFont(13), fontWeight: '600', letterSpacing: 0.2 },
  price: { marginLeft: 'auto', fontSize: scaleFont(24), fontWeight: '700', letterSpacing: -0.6 },
  awardsBlock: { gap: Spacing.xs, marginTop: Spacing.xs + Spacing.xxs },
  awardChip: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    gap: Spacing.xxs,
  },
  awardMeta: { ...Typography.caption, lineHeight: Typography.micro.lineHeight },
  manageBadgesLink: { marginTop: Spacing.xs, alignSelf: 'flex-start' },
});
