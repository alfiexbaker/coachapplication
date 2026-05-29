/**
 * AthleteHero — Profile hero card with avatar, name, age, level, status, tenure.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, Components, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { rosterService } from '@/services/roster-service';
import type { RosterEntry } from '@/constants/types';
import { getRosterAthleteName } from '@/utils/roster-display';

interface AthleteHeroProps {
  athlete: RosterEntry;
  onStatusPress: () => void;
}

function AthleteHeroInner({ athlete, onStatusPress }: AthleteHeroProps) {
  const { colors } = useTheme();
  const statusColor = rosterService.getStatusColor(athlete.status);
  const athleteName = getRosterAthleteName(athlete);

  const tenure = (() => {
    const start = new Date(athlete.startDate);
    const now = new Date();
    const months = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (months < 1) return 'New';
    if (months < 12) return `${months}mo`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years}y ${rem}mo` : `${years}y`;
  })();

  const handleStatusPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onStatusPress();
  };

  return (
    <Animated.View entering={FadeInDown.springify()}>
      <SurfaceCard style={styles.card}>
        <Row gap="lg" align="center">
          {/* Avatar */}
          <View
            style={[styles.avatarPlaceholder, { backgroundColor: withAlpha(colors.tint, 0.09) }]}
          >
            <ThemedText style={[styles.avatarText, { color: colors.tint }]}>
              {athleteName
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()}
            </ThemedText>
          </View>

          {/* Info */}
          <View style={styles.info}>
            <ThemedText type="title">{athleteName}</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.muted }]}>
              Since {tenure}
            </ThemedText>

            <Row gap="xs" style={styles.badges}>
              <Clickable
                onPress={handleStatusPress}
                style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.09) }]}
                accessibilityLabel={`Status: ${rosterService.formatStatus(athlete.status)}`}
              >
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <ThemedText style={[styles.badgeText, { color: statusColor }]}>
                  {rosterService.formatStatus(athlete.status)}
                </ThemedText>
                <Ionicons name="chevron-down" size={12} color={statusColor} />
              </Clickable>

              <View style={[styles.levelBadge, { backgroundColor: colors.surfaceSecondary }]}>
                <ThemedText style={[styles.badgeText, { color: colors.muted }]}>
                  {athlete.primaryFocus || 'Focus'}
                </ThemedText>
              </View>
            </Row>
          </View>
        </Row>
      </SurfaceCard>
    </Animated.View>
  );
}

export const AthleteHero = AthleteHeroInner;

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
  },
  avatar: {
    width: Components.avatar.xl,
    height: Components.avatar.xl,
    borderRadius: Radii.full,
  },
  avatarPlaceholder: {
    width: Components.avatar.xl,
    height: Components.avatar.xl,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.title,
  },
  info: {
    flex: 1,
    gap: Spacing.xxs,
  },
  subtitle: {
    ...Typography.bodySmall,
  },
  badges: {
    marginTop: Spacing.xs,
  },
  statusBadge: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    minHeight: 28,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  badgeText: {
    ...Typography.caption,
  },
});
