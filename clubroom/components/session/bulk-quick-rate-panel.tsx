import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { POSITION_LABELS, POSITION_SKILLS, UNIVERSAL_SKILLS } from '@/constants/position-skills';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { QuickRateAthlete } from '@/hooks/use-quick-rate';
import type { FootballSkill, PositionRole, QuickRateInput } from '@/types/progress-types';
import { DotRating } from './dot-rating';
import { PositionSelector } from './position-selector';

interface BulkQuickRatePanelProps {
  athletes: QuickRateAthlete[];
  ratingsByAthleteId: Record<string, QuickRateInput>;
  isPrefilling: boolean;
  onPositionChange: (athleteId: string, position: PositionRole) => void;
  onSkillChange: (athleteId: string, skill: FootballSkill, value: number) => void;
  onEffortChange: (athleteId: string, value: number) => void;
  onBadgePress: (athleteId: string) => void;
}

function getSkillRating(input: QuickRateInput | undefined, skill: FootballSkill): number {
  const item = input?.positionSkillRatings?.find((rating) => rating.skill === skill);
  return item?.rating ?? 3;
}

function hasMeaningfulRating(input: QuickRateInput | undefined): boolean {
  if (!input) {
    return false;
  }
  const skills = input.positionSkillRatings ?? [];
  return skills.some((entry) => entry.rating !== 3) || input.effort !== 3 || Boolean(input.badgeId);
}

export const BulkQuickRatePanel = memo(function BulkQuickRatePanel({
  athletes,
  ratingsByAthleteId,
  isPrefilling,
  onPositionChange,
  onSkillChange,
  onEffortChange,
  onBadgePress,
}: BulkQuickRatePanelProps) {
  const { colors } = useTheme();

  const ratedCount = useMemo(
    () =>
      athletes.reduce(
        (count, athlete) => count + (hasMeaningfulRating(ratingsByAthleteId[athlete.athleteId]) ? 1 : 0),
        0,
      ),
    [athletes, ratingsByAthleteId],
  );

  if (athletes.length === 0) {
    return (
      <SurfaceCard style={styles.card}>
        <ThemedText style={[styles.emptyText, { color: colors.muted }]}>No present athletes to rate.</ThemedText>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard style={styles.card}>
      <Column gap="xs">
        <Row align="center" justify="between">
          <Column gap="micro">
            <ThemedText style={styles.title}>Bulk Quick Rate</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.muted }]}>
              {ratedCount}/{athletes.length} rated
            </ThemedText>
          </Column>
          {isPrefilling ? (
            <ThemedText style={[styles.prefillLabel, { color: colors.muted }]}>Loading previous ratings...</ThemedText>
          ) : null}
        </Row>

        <ThemedText style={[styles.helperText, { color: colors.muted }]}>Position + universal + role skills in one flow.</ThemedText>

        <Column gap="sm">
          {athletes.map((athlete) => {
            const rating = ratingsByAthleteId[athlete.athleteId];
            if (!rating) {
              return null;
            }

            const position = rating.positionPlayed ?? 'MID';
            const positionalSkills = POSITION_SKILLS[position];

            return (
              <View
                key={athlete.athleteId}
                style={[
                  styles.athleteCard,
                  { borderColor: colors.border, backgroundColor: withAlpha(colors.surface, 0.75) },
                ]}
              >
                <Row align="center" justify="between">
                  <Row align="center" gap="xs" style={styles.identityRow}>
                    <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
                      <ThemedText style={[styles.avatarText, { color: colors.tint }]}>
                        {athlete.athleteName.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                    <Column gap="micro" style={styles.nameWrap}>
                      <ThemedText style={styles.athleteName}>{athlete.athleteName}</ThemedText>
                      <ThemedText style={[styles.positionText, { color: colors.muted }]}>
                        {POSITION_LABELS[position]}
                      </ThemedText>
                    </Column>
                  </Row>

                  <Clickable
                    style={[
                      styles.badgeButton,
                      {
                        borderColor: rating.badgeId ? colors.warning : colors.border,
                        backgroundColor: rating.badgeId ? withAlpha(colors.warning, 0.14) : colors.background,
                      },
                    ]}
                    onPress={() => onBadgePress(athlete.athleteId)}
                    accessibilityLabel={`Award badge for ${athlete.athleteName}`}
                    accessibilityRole="button"
                  >
                    <Ionicons
                      name={rating.badgeId ? 'ribbon' : 'ribbon-outline'}
                      size={16}
                      color={rating.badgeId ? colors.warning : colors.muted}
                    />
                  </Clickable>
                </Row>

                <PositionSelector
                  value={position}
                  onChange={(nextPosition) => onPositionChange(athlete.athleteId, nextPosition)}
                />

                <Column gap="xxs">
                  {UNIVERSAL_SKILLS.map((skill) => (
                    <DotRating
                      key={`${athlete.athleteId}_${skill}`}
                      label={skill}
                      icon="sparkles"
                      value={getSkillRating(rating, skill)}
                      onChange={(value) => onSkillChange(athlete.athleteId, skill, value)}
                    />
                  ))}

                  {positionalSkills.map((skill) => (
                    <DotRating
                      key={`${athlete.athleteId}_${skill}`}
                      label={skill}
                      icon="football"
                      value={getSkillRating(rating, skill)}
                      onChange={(value) => onSkillChange(athlete.athleteId, skill, value)}
                    />
                  ))}

                  <DotRating
                    label="Effort"
                    icon="flash"
                    value={rating.effort}
                    onChange={(value) => onEffortChange(athlete.athleteId, value)}
                  />
                </Column>
              </View>
            );
          })}
        </Column>
      </Column>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
  },
  subtitle: {
    ...Typography.caption,
  },
  prefillLabel: {
    ...Typography.caption,
  },
  helperText: {
    ...Typography.caption,
  },
  athleteCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  identityRow: {
    flex: 1,
    minWidth: 0,
  },
  nameWrap: {
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  athleteName: {
    ...Typography.bodySemiBold,
    flexShrink: 1,
  },
  positionText: {
    ...Typography.caption,
  },
  badgeButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
});
