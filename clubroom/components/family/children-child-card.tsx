/**
 * ChildrenChildCard — Individual child card with avatar, stats, and notes.
 *
 * Displays child info (name, age, initials), special needs/allergy/communication
 * notes, and session/badge/rating stats. Wrapped in memo() for FlatList performance.
 */

import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Routes } from '@/navigation/routes';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { childService, type ChildProfile } from '@/services/child-service';
import type { ChildStats } from '@/hooks/use-children-hub';

interface ChildrenChildCardProps {
  child: ChildProfile;
  stats: ChildStats;
  index: number;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export const ChildrenChildCard = memo(function ChildrenChildCard({
  child,
  stats,
  index,
}: ChildrenChildCardProps) {
  const { colors: palette } = useTheme();

  const fullName = `${child.firstName} ${child.lastName}`;
  const age = child.dateOfBirth ? childService.getAge(child.dateOfBirth) : null;

  const handleNavigateProgress = useCallback(() => {
    router.push(Routes.developmentChildProgress(child.id));
  }, [child.id]);

  const handleNavigateBadges = useCallback(() => {
    router.push(Routes.childBadges(child.id));
  }, [child.id]);

  const hasNotes = child.hasSpecialNeeds || child.allergies.length > 0 || !!child.communicationNotes;

  return (
    <Animated.View entering={FadeInDown.delay(100 + index * 50).springify()}>
      <SurfaceCard style={styles.card}>
        {/* Header: Avatar + Name + Chevron */}
        <Row align="center" gap="md">
          <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
            <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
              {getInitials(fullName)}
            </ThemedText>
            {child.hasSpecialNeeds && (
              <View style={[styles.specialNeedsBadge, { backgroundColor: palette.warning }]}>
                <Ionicons name="heart" size={10} color={palette.onPrimary} />
              </View>
            )}
          </View>
          <Column gap="micro" style={styles.infoFlex}>
            <Row align="center" gap="xs">
              <ThemedText type="defaultSemiBold" style={styles.childName}>
                {child.nickname || child.firstName}
              </ThemedText>
              {age !== null && (
                <ThemedText style={[styles.agePill, { color: palette.muted }]}>
                  {age} yrs
                </ThemedText>
              )}
            </Row>
            <ThemedText style={[styles.childMeta, { color: palette.muted }]}>
              {fullName}
            </ThemedText>
          </Column>
          <Clickable
            onPress={handleNavigateProgress}
            accessibilityLabel={`View progress for ${child.nickname || child.firstName}`}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </Clickable>
        </Row>

        {/* Special Needs & Notes Summary */}
        {hasNotes && (
          <Column gap="xs" style={[styles.notesSection, { borderTopColor: palette.border }]}>
            {child.hasSpecialNeeds && child.disabilities.length > 0 && (
              <Row
                align="flex-start"
                gap="xs"
                style={[styles.noteRow, { backgroundColor: withAlpha(palette.warning, 0.06) }]}
              >
                <Ionicons name="alert-circle" size={14} color={palette.warning} />
                <ThemedText style={styles.noteText} numberOfLines={1}>
                  {child.disabilities.map(d => d.type).join(', ')}
                </ThemedText>
              </Row>
            )}
            {child.allergies.length > 0 && (
              <Row
                align="flex-start"
                gap="xs"
                style={[styles.noteRow, { backgroundColor: withAlpha(palette.error, 0.06) }]}
              >
                <Ionicons name="medical" size={14} color={palette.error} />
                <ThemedText style={styles.noteText} numberOfLines={1}>
                  Allergies: {child.allergies.join(', ')}
                </ThemedText>
              </Row>
            )}
            {child.communicationNotes && (
              <Row
                align="flex-start"
                gap="xs"
                style={[styles.noteRow, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
              >
                <Ionicons name="chatbubble" size={14} color={palette.tint} />
                <ThemedText style={styles.noteText} numberOfLines={2}>
                  {child.communicationNotes}
                </ThemedText>
              </Row>
            )}
          </Column>
        )}

        {/* Stats Row */}
        <Row gap="lg" style={[styles.statsRow, { borderTopColor: palette.border }]}>
          <Row align="center" gap="xxs">
            <Ionicons name="calendar" size={14} color={palette.tint} />
            <ThemedText style={[styles.statText, { color: palette.muted }]}>
              {stats.sessions} sessions
            </ThemedText>
          </Row>
          <Clickable
            onPress={handleNavigateBadges}
            accessibilityLabel={`View badges for ${child.nickname || child.firstName}`}
            accessibilityRole="button"
          >
            <Row
              align="center"
              gap="xxs"
              style={[
                stats.unseenBadges > 0 && styles.statHighlight,
                stats.unseenBadges > 0 && { backgroundColor: withAlpha(palette.warning, 0.09) },
              ]}
            >
              <Ionicons name="ribbon" size={14} color={palette.warning} />
              <ThemedText
                style={[
                  styles.statText,
                  { color: stats.unseenBadges > 0 ? palette.warning : palette.muted },
                ]}
              >
                {stats.badges} badges
              </ThemedText>
            </Row>
          </Clickable>
          {stats.avgRating > 0 && (
            <Row align="center" gap="xxs">
              <Ionicons name="star" size={14} color={palette.warning} />
              <ThemedText style={[styles.statText, { color: palette.muted }]}>
                {stats.avgRating.toFixed(1)} avg
              </ThemedText>
            </Row>
          )}
        </Row>
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.heading,
  },
  specialNeedsBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoFlex: {
    flex: 1,
  },
  childName: {
    ...Typography.subheading,
  },
  agePill: {
    ...Typography.caption,
  },
  childMeta: {
    ...Typography.small,
  },
  notesSection: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  noteRow: {
    padding: Spacing.xs,
    borderRadius: Radii.sm,
  },
  noteText: {
    flex: 1,
    ...Typography.caption,
  },
  statsRow: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  statText: {
    ...Typography.caption,
  },
  statHighlight: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
});
