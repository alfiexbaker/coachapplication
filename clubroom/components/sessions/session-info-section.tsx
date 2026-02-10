/**
 * SessionInfoSection — Session details card: title, schedule, location, meta badges, awards.
 */
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
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

interface SessionInfoSectionProps {
  offering: SessionOffering;
  isMyOffering: boolean;
  registeredCount: number;
  sessionAwards: BadgeAward[];
  formatSchedule: () => string;
}

function SessionInfoSectionInner({
  offering, isMyOffering, registeredCount, sessionAwards, formatSchedule,
}: SessionInfoSectionProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="subtitle" style={styles.title}>{offering.title}</ThemedText>

      {!isMyOffering && (
        <Row align="center" gap={10} style={styles.detailRow}>
          <Ionicons name="person-circle-outline" size={20} color={palette.icon} />
          <ThemedText>Coach: {offering.coachName}</ThemedText>
        </Row>
      )}

      <Row align="center" gap={10} style={styles.detailRow}>
        <Ionicons name="calendar-outline" size={20} color={palette.icon} />
        <ThemedText>{formatSchedule()}</ThemedText>
      </Row>

      <Row align="center" gap={10} style={styles.detailRow}>
        <Ionicons name="location-outline" size={20} color={palette.icon} />
        <ThemedText>{offering.location}</ThemedText>
      </Row>

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
              Group ({registeredCount}/{offering.maxParticipants})
            </ThemedText>
          </View>
        )}
        {offering.ageMin && offering.ageMax && (
          <View style={[styles.badge, { backgroundColor: palette.border }]}>
            <ThemedText style={styles.badgeText}>Ages {offering.ageMin}-{offering.ageMax}</ThemedText>
          </View>
        )}
        {offering.footballSkill && (
          <View style={[styles.badge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <ThemedText style={[styles.badgeText, { color: palette.tint }]}>{offering.footballSkill}</ThemedText>
          </View>
        )}
        {offering.priceUsd !== undefined && offering.priceUsd > 0 && (
          <ThemedText type="defaultSemiBold" style={styles.price}>£{offering.priceUsd}</ThemedText>
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
                  Awarded {new Date(award.awardedAt).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                  })}
                  {' '}by {award.awardedByName || award.coachName || 'Coach'}
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
  card: { marginBottom: 16, padding: 20, gap: 14 },
  title: { fontSize: scaleFont(24), fontWeight: '700', letterSpacing: -0.6, lineHeight: scaleFont(32) },
  detailRow: { marginTop: Spacing.xxs },
  description: { fontSize: scaleFont(15), opacity: 0.7, lineHeight: scaleFont(22) },
  metaRow: { marginTop: Spacing.xs + Spacing.xxs },
  badge: { paddingHorizontal: Spacing.xs + Spacing.xxs, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  badgeText: { fontSize: scaleFont(13), fontWeight: '600', letterSpacing: 0.2 },
  price: { marginLeft: 'auto', fontSize: scaleFont(24), fontWeight: '700', letterSpacing: -0.6 },
  awardsBlock: { gap: 8, marginTop: Spacing.xs + Spacing.xxs },
  awardChip: { borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: 10, paddingVertical: Spacing.xxs, gap: Spacing.xxs },
  awardMeta: { ...Typography.caption, lineHeight: 16 },
  manageBadgesLink: { marginTop: 8, alignSelf: 'flex-start' },
});
