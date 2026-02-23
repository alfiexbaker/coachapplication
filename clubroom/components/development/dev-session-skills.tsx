import React, { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { RatingBar } from '@/components/session/rating-bar';
import { PositionSelector } from '@/components/session/position-selector';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { SKILL_SUB_SKILLS } from '@/constants/position-skills';
import { POSITION_SKILL_ICONS } from '@/constants/football-registry';
import type { FootballSkill, PositionRole, SubSkillRating } from '@/types/progress-types';

export interface DevSessionSkillsProps {
  colors: ThemeColors;
  /** Current positions (multi-select). */
  positionsPlayed: PositionRole[];
  onPositionToggle: (position: PositionRole) => void;
  /** Merged positional skills for all selected positions. */
  positionalSkills: FootballSkill[];
  /** 4 universal/character skills. */
  characterSkills: FootballSkill[];
  /** Position display label. */
  positionLabel: string;
  /** Previous ratings from SKILL_LEVELS (skill name → 1-5 rating). */
  previousRatings: Record<string, number>;
  /** Current sub-skill ratings. */
  subSkillRatings: SubSkillRating[];
  /** Derived parent averages (parent → 1-5 avg). */
  derivedParentAverages: Record<string, number>;
  /** Rate a sub-skill. */
  onUpdateSubSkillRating: (parentSkill: FootballSkill, subSkill: string, rating: 1 | 2 | 3 | 4 | 5) => void;
  /** Remove all ratings for a parent skill. */
  onRemoveParentRatings: (parentSkill: FootballSkill) => void;
}

function getIconForSkill(skill: string): React.ComponentProps<typeof Ionicons>['name'] {
  return (POSITION_SKILL_ICONS[skill] ?? 'ellipse-outline') as React.ComponentProps<
    typeof Ionicons
  >['name'];
}

// ─── SubSkillRow ──────────────────────────────────────────────────────────────

const SubSkillRow = memo(function SubSkillRow({
  subSkill,
  parentSkill,
  ratingValue,
  previousRating,
  onRate,
  colors,
}: {
  subSkill: string;
  parentSkill: FootballSkill;
  ratingValue: number;
  previousRating: number | undefined;
  onRate: (parentSkill: FootballSkill, subSkill: string, rating: 1 | 2 | 3 | 4 | 5) => void;
  colors: ThemeColors;
}) {
  const handleChange = useCallback(
    (val: number) => onRate(parentSkill, subSkill, Math.max(1, Math.min(5, Math.round(val))) as 1 | 2 | 3 | 4 | 5),
    [onRate, parentSkill, subSkill],
  );

  return (
    <View style={styles.subSkillRow}>
      <Row align="center" justify="between">
        <ThemedText
          style={[styles.subSkillLabel, { color: ratingValue > 0 ? colors.text : colors.muted }]}
          numberOfLines={1}
        >
          {subSkill}
        </ThemedText>
        {ratingValue > 0 && (
          <Row align="center" gap="xxs">
            <ThemedText style={[styles.subRatingLabel, { color: colors.tint }]}>
              {ratingValue}
            </ThemedText>
            <ThemedText style={[styles.subRatingMax, { color: colors.muted }]}>/5</ThemedText>
          </Row>
        )}
        {ratingValue === 0 && previousRating !== undefined && previousRating > 0 && (
          <ThemedText style={[styles.previousHint, { color: colors.muted }]}>
            was {previousRating}/5
          </ThemedText>
        )}
      </Row>
      <RatingBar value={ratingValue} onChange={handleChange} previousValue={previousRating} height={22} />
    </View>
  );
});

// ─── ParentSkillHeader ────────────────────────────────────────────────────────

const ParentSkillHeader = memo(function ParentSkillHeader({
  skill,
  derivedAvg,
  hasRatings,
  onRemove,
  colors,
}: {
  skill: FootballSkill;
  derivedAvg: number | undefined;
  hasRatings: boolean;
  onRemove: (skill: FootballSkill) => void;
  colors: ThemeColors;
}) {
  const icon = getIconForSkill(skill);
  const handleRemove = useCallback(() => onRemove(skill), [onRemove, skill]);

  return (
    <Row align="center" justify="between">
      <Row align="center" gap="xs" style={styles.parentLabelWrap}>
        <Ionicons
          name={icon}
          size={16}
          color={hasRatings ? colors.tint : colors.muted}
        />
        <ThemedText
          style={[styles.parentLabel, { color: hasRatings ? colors.text : colors.muted }]}
          numberOfLines={1}
        >
          {skill}
        </ThemedText>
      </Row>
      <Row align="center" gap="xxs">
        {derivedAvg !== undefined && (
          <>
            <ThemedText style={[styles.parentAvg, { color: colors.tint }]}>
              {derivedAvg.toFixed(1)}
            </ThemedText>
            <ThemedText style={[styles.parentAvgMax, { color: colors.muted }]}>/5</ThemedText>
          </>
        )}
        {!hasRatings && derivedAvg === undefined && (
          <ThemedText style={[styles.parentAvg, { color: colors.muted }]}>0/5</ThemedText>
        )}
        {hasRatings && (
          <Clickable
            onPress={handleRemove}
            hitSlop={12}
            style={styles.removeBtn}
            accessibilityLabel={`Remove ${skill} ratings`}
          >
            <Ionicons name="close" size={14} color={colors.muted} />
          </Clickable>
        )}
      </Row>
    </Row>
  );
});

// ─── ParentSkillGroup ─────────────────────────────────────────────────────────

const ParentSkillGroup = memo(function ParentSkillGroup({
  skill,
  subSkillRatings,
  derivedAvg,
  previousRatings,
  onUpdateSubSkillRating,
  onRemoveParentRatings,
  colors,
}: {
  skill: FootballSkill;
  subSkillRatings: SubSkillRating[];
  derivedAvg: number | undefined;
  previousRatings: Record<string, number>;
  onUpdateSubSkillRating: (parentSkill: FootballSkill, subSkill: string, rating: 1 | 2 | 3 | 4 | 5) => void;
  onRemoveParentRatings: (parentSkill: FootballSkill) => void;
  colors: ThemeColors;
}) {
  const subSkills = SKILL_SUB_SKILLS[skill] ?? [];
  const hasRatings = subSkillRatings.length > 0;

  return (
    <View
      style={[
        styles.parentGroup,
        hasRatings && { backgroundColor: withAlpha(colors.tint, 0.04) },
      ]}
    >
      <ParentSkillHeader
        skill={skill}
        derivedAvg={derivedAvg}
        hasRatings={hasRatings}
        onRemove={onRemoveParentRatings}
        colors={colors}
      />
      <Column gap="xxs">
        {subSkills.map((sub) => {
          const rating = subSkillRatings.find((r) => r.subSkill === sub)?.rating ?? 0;
          return (
            <SubSkillRow
              key={sub}
              subSkill={sub}
              parentSkill={skill}
              ratingValue={rating}
              previousRating={previousRatings[sub]}
              onRate={onUpdateSubSkillRating}
              colors={colors}
            />
          );
        })}
      </Column>
    </View>
  );
});

// ─── Section header ──────────────────────────────────────────────────────────

const SectionHeader = memo(function SectionHeader({
  label,
  ratedCount,
  totalCount,
  colors,
}: {
  label: string;
  ratedCount: number;
  totalCount: number;
  colors: ThemeColors;
}) {
  return (
    <Row align="center" justify="between">
      <ThemedText style={[styles.sectionLabel, { color: colors.muted }]}>
        {label}
      </ThemedText>
      {ratedCount > 0 && (
        <ThemedText style={[styles.sectionCount, { color: colors.tint }]}>
          {ratedCount}/{totalCount}
        </ThemedText>
      )}
    </Row>
  );
});

// ─── DevSessionSkills ────────────────────────────────────────────────────────

export const DevSessionSkills = memo(function DevSessionSkills({
  colors,
  positionsPlayed,
  onPositionToggle,
  positionalSkills,
  characterSkills,
  positionLabel,
  previousRatings,
  subSkillRatings,
  derivedParentAverages,
  onUpdateSubSkillRating,
  onRemoveParentRatings,
}: DevSessionSkillsProps) {
  const getSubRatingsForParent = useCallback(
    (parent: FootballSkill) => subSkillRatings.filter((r) => r.parentSkill === parent),
    [subSkillRatings],
  );

  const positionalRatedCount = positionalSkills.filter(
    (s) => derivedParentAverages[s] !== undefined,
  ).length;

  const characterRatedCount = characterSkills.filter(
    (s) => derivedParentAverages[s] !== undefined,
  ).length;

  return (
    <Column gap="sm">
      <ThemedText type="subtitle" style={Typography.subheading}>
        Skills Covered
      </ThemedText>
      <SurfaceCard style={styles.card}>
        {/* Position selector (multi-select) */}
        <Column gap="xxs">
          <ThemedText style={[styles.fieldLabel, { color: colors.muted }]}>
            Position played
          </ThemedText>
          <PositionSelector
            value={positionsPlayed}
            onToggle={onPositionToggle}
            multiSelect
          />
        </Column>

        {/* Positional skills — parent headers with sub-skill RatingBars */}
        <Column gap="xxs">
          <SectionHeader
            label={`${positionLabel} skills`}
            ratedCount={positionalRatedCount}
            totalCount={positionalSkills.length}
            colors={colors}
          />
          <Column gap="xs">
            {positionalSkills.map((skill) => (
              <ParentSkillGroup
                key={skill}
                skill={skill}
                subSkillRatings={getSubRatingsForParent(skill)}
                derivedAvg={derivedParentAverages[skill]}
                previousRatings={previousRatings}
                onUpdateSubSkillRating={onUpdateSubSkillRating}
                onRemoveParentRatings={onRemoveParentRatings}
                colors={colors}
              />
            ))}
          </Column>
        </Column>

        {/* Character skills (4 universal) */}
        <Column gap="xxs">
          <SectionHeader
            label="Character"
            ratedCount={characterRatedCount}
            totalCount={characterSkills.length}
            colors={colors}
          />
          <Column gap="xs">
            {characterSkills.map((skill) => (
              <ParentSkillGroup
                key={skill}
                skill={skill}
                subSkillRatings={getSubRatingsForParent(skill)}
                derivedAvg={derivedParentAverages[skill]}
                previousRatings={previousRatings}
                onUpdateSubSkillRating={onUpdateSubSkillRating}
                onRemoveParentRatings={onRemoveParentRatings}
                colors={colors}
              />
            ))}
          </Column>
        </Column>
      </SurfaceCard>
    </Column>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    gap: Spacing.md,
  },
  fieldLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  sectionLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  sectionCount: {
    ...Typography.caption,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  parentGroup: {
    gap: Spacing.xxs,
    padding: Spacing.xs,
    borderRadius: Radii.md,
  },
  parentLabelWrap: {
    flex: 1,
    minWidth: 0,
  },
  parentLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    flexShrink: 1,
  },
  parentAvg: {
    ...Typography.bodySemiBold,
    fontVariant: ['tabular-nums'],
  },
  parentAvgMax: {
    ...Typography.caption,
  },
  removeBtn: {
    marginLeft: Spacing.xxs,
  },
  subSkillRow: {
    gap: Spacing.micro,
    paddingLeft: Spacing.xs,
  },
  subSkillLabel: {
    ...Typography.small,
    flex: 1,
  },
  subRatingLabel: {
    ...Typography.small,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  subRatingMax: {
    ...Typography.micro,
  },
  previousHint: {
    ...Typography.caption,
    fontStyle: 'italic',
  },
});
