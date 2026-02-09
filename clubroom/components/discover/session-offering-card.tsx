/**
 * Session Offering Card
 *
 * Displays a single session offering with coach info, price, badges, and schedule.
 * Used in the Discover Sessions FlatList.
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatNextSession } from '@/hooks/use-discover-sessions';
import type { SessionOffering } from '@/constants/types';

interface SessionOfferingCardProps {
  offering: SessionOffering;
  onPress: (offering: SessionOffering) => void;
}

export const SessionOfferingCard = memo(function SessionOfferingCard({ offering, onPress }: SessionOfferingCardProps) {
  const { colors: palette } = useTheme();
  const registeredCount = offering.registrations.filter(r => r.status === 'confirmed').length;
  const spotsLeft = offering.maxParticipants - registeredCount;
  const isFull = spotsLeft <= 0;

  return (
    <SurfaceCard style={styles.card} onPress={() => onPress(offering)}>
      <View style={styles.cardHeader}>
        <View style={styles.coachInfo}>
          <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
            <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
              {offering.coachName.charAt(0)}
            </ThemedText>
          </View>
          <View>
            <ThemedText type="defaultSemiBold" style={styles.coachName}>{offering.coachName}</ThemedText>
            <ThemedText style={[styles.location, { color: palette.muted }]}>{offering.location}</ThemedText>
          </View>
        </View>
        {offering.priceUsd !== undefined && offering.priceUsd > 0 && (
          <ThemedText type="defaultSemiBold" style={[styles.price, { color: palette.tint }]}>£{offering.priceUsd}</ThemedText>
        )}
      </View>

      <ThemedText type="defaultSemiBold" style={styles.sessionTitle}>{offering.title}</ThemedText>

      {offering.description && (
        <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={2}>{offering.description}</ThemedText>
      )}

      <View style={styles.meta}>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={16} color={palette.icon} />
          <ThemedText style={[styles.metaText, { color: palette.muted }]}>{formatNextSession(offering)}</ThemedText>
        </View>

        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: withAlpha(palette.accent, 0.09) }]}>
            <ThemedText style={[styles.badgeText, { color: palette.accent }]}>
              {offering.sessionType === 'group' ? 'Group' : '1:1'}
            </ThemedText>
          </View>

          {offering.footballSkill && (
            <View style={[styles.badge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <ThemedText style={[styles.badgeText, { color: palette.tint }]}>{offering.footballSkill}</ThemedText>
            </View>
          )}

          {offering.sessionType === 'group' && (
            <View style={[styles.badge, { backgroundColor: isFull ? withAlpha(palette.error, 0.09) : withAlpha(palette.success, 0.09) }]}>
              <ThemedText style={[styles.badgeText, { color: isFull ? palette.error : palette.success }]}>
                {isFull ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  coachInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...Typography.subheading },
  coachName: { ...Typography.bodySmall },
  location: { ...Typography.caption },
  price: { ...Typography.heading },
  sessionTitle: { ...Typography.heading },
  description: { ...Typography.bodySmall },
  meta: { gap: Spacing.sm, marginTop: Spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  metaText: { ...Typography.small },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  badgeText: { ...Typography.caption },
});
