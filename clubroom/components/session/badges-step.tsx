/**
 * Badges Step — Step 3 of Session Completion Wizard
 *
 * Allows coaches to award badges to athletes who were marked as present.
 * Shows each present athlete with a grid of available badges to toggle.
 */

import React, { memo, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { BadgeDefinition } from '@/constants/types';

// ============================================================================
// TYPES
// ============================================================================

export interface BadgeAthleteData {
  registrationId: string;
  userName: string;
  badges: string[];
}

export interface BadgesStepProps {
  presentAthletes: BadgeAthleteData[];
  availableBadges: BadgeDefinition[];
  colors: ThemeColors;
  onToggleBadge: (registrationId: string, badgeId: string) => void;
}

// ============================================================================
// BADGE ATHLETE ROW
// ============================================================================

interface BadgeAthleteRowProps {
  athlete: BadgeAthleteData;
  availableBadges: BadgeDefinition[];
  colors: ThemeColors;
  onToggleBadge: (registrationId: string, badgeId: string) => void;
}

const BadgeAthleteRow = memo(function BadgeAthleteRow({
  athlete,
  availableBadges,
  colors,
  onToggleBadge,
}: BadgeAthleteRowProps) {
  const handleToggle = useCallback(
    (badgeId: string) => {
      onToggleBadge(athlete.registrationId, badgeId);
    },
    [athlete.registrationId, onToggleBadge],
  );

  return (
    <View style={[styles.badgeAthleteRow, { borderBottomColor: colors.border }]}>
      <View style={styles.athleteInfo}>
        <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
          <ThemedText style={[styles.avatarText, { color: colors.tint }]}>
            {athlete.userName.charAt(0)}
          </ThemedText>
        </View>
        <ThemedText type="defaultSemiBold" style={styles.athleteNameText}>
          {athlete.userName}
        </ThemedText>
        {athlete.badges.length > 0 && (
          <View style={[styles.badgeCountPill, { backgroundColor: withAlpha(colors.warning, 0.09) }]}>
            <Ionicons name="ribbon" size={12} color={colors.warning} />
            <ThemedText style={[styles.badgeCount, { color: colors.warning }]}>
              {athlete.badges.length}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.badgeGrid}>
        {availableBadges.slice(0, 8).map(badge => {
          const isAwarded = athlete.badges.includes(badge.id);
          return (
            <Pressable
              key={badge.id}
              style={[
                styles.badgeOption,
                {
                  backgroundColor: isAwarded ? withAlpha(colors.warning, 0.09) : 'transparent',
                  borderColor: isAwarded ? colors.warning : colors.border,
                },
              ]}
              onPress={() => handleToggle(badge.id)}
              accessibilityLabel={`${isAwarded ? 'Remove' : 'Award'} ${badge.label} badge to ${athlete.userName}`}
              accessibilityRole="button"
            >
              <ThemedText style={[styles.badgeOptionText, { color: isAwarded ? colors.warning : colors.text }]}>
                {badge.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

// ============================================================================
// BADGES STEP
// ============================================================================

export const BadgesStep = memo(function BadgesStep({
  presentAthletes,
  availableBadges,
  colors,
  onToggleBadge,
}: BadgesStepProps) {
  return (
    <SurfaceCard style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="ribbon" size={20} color={colors.warning} />
        <ThemedText type="subtitle">Award Badges (Optional)</ThemedText>
      </View>
      <ThemedText style={[styles.badgeStepHint, { color: colors.muted }]}>
        Recognise standout performances by awarding badges to athletes who were present.
      </ThemedText>

      {presentAthletes.length === 0 ? (
        <ThemedText style={[styles.emptyText, { color: colors.muted }]}>
          No athletes marked as present
        </ThemedText>
      ) : (
        presentAthletes.map(athlete => (
          <BadgeAthleteRow
            key={athlete.registrationId}
            athlete={athlete}
            availableBadges={availableBadges}
            colors={colors}
            onToggleBadge={onToggleBadge}
          />
        ))
      )}
    </SurfaceCard>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  badgeStepHint: {
    ...Typography.small,
  },
  emptyText: {
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  badgeAthleteRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  athleteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.bodySmallSemiBold,
  },
  athleteNameText: {
    flex: 1,
  },
  badgeCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  badgeCount: {
    ...Typography.caption,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  badgeOption: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  badgeOptionText: {
    ...Typography.caption,
  },
});
