/**
 * Badges Step — Step 3 of Session Completion Wizard
 *
 * Allows coaches to award badges to athletes who were marked as present.
 * Shows each present athlete with badges grouped by FA Four Corners category.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { BadgeDefinitionWithStats } from '@/services/badge-service';
import type { BadgeCategory } from '@/constants/types';
import { EVENT_BADGE_IDS } from '@/services/badge-definitions';
import { CategoryInfo } from '@/constants/progression';

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
  availableBadges: BadgeDefinitionWithStats[];
  colors: ThemeColors;
  onToggleBadge: (registrationId: string, badgeId: string) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_ORDER: BadgeCategory[] = ['technical', 'physical', 'psychological', 'social'];

// ============================================================================
// BADGE CHIPS
// ============================================================================

function BadgeChips({
  badges,
  athlete,
  colors,
  onToggle,
}: {
  badges: BadgeDefinitionWithStats[];
  athlete: BadgeAthleteData;
  colors: ThemeColors;
  onToggle: (badgeId: string) => void;
}) {
  return (
    <Row wrap gap="xs">
      {badges.map((badge) => {
        const isAwarded = athlete.badges.includes(badge.id);
        const chipLabel =
          badge.awardCount > 0 ? `${badge.label} \u00B7 ${badge.awardCount} earned` : badge.label;
        return (
          <Clickable
            key={badge.id}
            style={[
              styles.badgeOption,
              {
                backgroundColor: isAwarded ? withAlpha(colors.warning, 0.09) : 'transparent',
                borderColor: isAwarded ? colors.warning : colors.border,
              },
            ]}
            onPress={() => onToggle(badge.id)}
            accessibilityLabel={`${isAwarded ? 'Remove' : 'Award'} ${badge.label} badge to ${athlete.userName}`}
            accessibilityRole="button"
            accessibilityState={{ selected: isAwarded }}
          >
            <ThemedText
              style={[
                styles.badgeOptionText,
                { color: isAwarded ? colors.warning : colors.text },
              ]}
            >
              {chipLabel}
            </ThemedText>
          </Clickable>
        );
      })}
    </Row>
  );
}

// ============================================================================
// BADGE ATHLETE ROW
// ============================================================================

interface BadgeAthleteRowProps {
  athlete: BadgeAthleteData;
  availableBadges: BadgeDefinitionWithStats[];
  colors: ThemeColors;
  onToggleBadge: (registrationId: string, badgeId: string) => void;
}

const BadgeAthleteRow = function BadgeAthleteRow({
  athlete,
  availableBadges,
  colors,
  onToggleBadge,
}: BadgeAthleteRowProps) {
  const handleToggle = (badgeId: string) => {
    onToggleBadge(athlete.registrationId, badgeId);
  };

  const skillBadges = availableBadges.filter((b) => !EVENT_BADGE_IDS.has(b.id));
  const eventBadges = availableBadges.filter((b) => EVENT_BADGE_IDS.has(b.id)).slice(0, 6);

  const groupedSkillBadges = (() => {
    const groups: { category: BadgeCategory; label: string; badges: BadgeDefinitionWithStats[] }[] =
      [];
    for (const cat of CATEGORY_ORDER) {
      const catBadges = skillBadges.filter((b) => b.category === cat);
      if (catBadges.length > 0) {
        groups.push({ category: cat, label: CategoryInfo[cat].label, badges: catBadges });
      }
    }
    return groups;
  })();

  return (
    <View style={[styles.badgeAthleteRow, { borderBottomColor: colors.border }]}>
      <Row align="center" gap="sm">
        <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
          <ThemedText style={[styles.avatarText, { color: colors.tint }]}>
            {athlete.userName.charAt(0)}
          </ThemedText>
        </View>
        <ThemedText type="defaultSemiBold" style={styles.athleteNameText}>
          {athlete.userName}
        </ThemedText>
        {athlete.badges.length > 0 && (
          <Row
            align="center"
            gap="xxs"
            style={[styles.badgeCountPill, { backgroundColor: withAlpha(colors.warning, 0.09) }]}
          >
            <Ionicons name="ribbon" size={12} color={colors.warning} />
            <ThemedText style={[styles.badgeCount, { color: colors.warning }]}>
              {athlete.badges.length}
            </ThemedText>
          </Row>
        )}
      </Row>

      {groupedSkillBadges.map((group) => (
        <View key={group.category}>
          <ThemedText style={[styles.sectionLabel, { color: colors.muted }]}>
            {group.label}
          </ThemedText>
          <BadgeChips
            badges={group.badges}
            athlete={athlete}
            colors={colors}
            onToggle={handleToggle}
          />
        </View>
      ))}

      {eventBadges.length > 0 ? (
        <>
          <ThemedText style={[styles.sectionLabel, { color: colors.muted }]}>
            Match & Event
          </ThemedText>
          <BadgeChips badges={eventBadges} athlete={athlete} colors={colors} onToggle={handleToggle} />
        </>
      ) : null}
    </View>
  );
};

// ============================================================================
// BADGES STEP
// ============================================================================

export const BadgesStep = function BadgesStep({
  presentAthletes,
  availableBadges,
  colors,
  onToggleBadge,
}: BadgesStepProps) {
  return (
    <SurfaceCard style={styles.section}>
      <Row align="center" gap="sm" style={styles.sectionHeader}>
        <Ionicons name="ribbon" size={20} color={colors.warning} />
        <ThemedText type="subtitle">Award Badges (Optional)</ThemedText>
      </Row>
      <ThemedText style={[styles.badgeStepHint, { color: colors.muted }]}>
        Recognise standout performances by awarding badges to athletes who were present.
      </ThemedText>

      {presentAthletes.length === 0 ? (
        <ThemedText style={[styles.emptyText, { color: colors.muted }]}>
          No athletes marked as present
        </ThemedText>
      ) : (
        presentAthletes.map((athlete) => (
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
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionHeader: {
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
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  badgeCount: {
    ...Typography.caption,
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
  sectionLabel: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
