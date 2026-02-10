/**
 * Extracted sub-components for parent-welcome-screens.
 *
 * AgePickerRow — horizontal age chip scroller.
 * SkillLevelRow — skill level chip row.
 * ImprovementAreaGrid — area selection grid with check badges.
 * CoachPreviewCard — coach result row in SurfaceCard.
 */

import { memo, useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Components, Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { ImprovementArea, PlaceholderCoach } from './parent-welcome-data';

// ─── AgePickerRow ─────────────────────────────────────────────────────────────

interface AgePickerRowProps {
  ages: number[];
  selectedAge: number | null;
  onAgeSelect: (age: number) => void;
  palette: ThemeColors;
}

export const AgePickerRow = memo(function AgePickerRow({
  ages,
  selectedAge,
  onAgeSelect,
  palette,
}: AgePickerRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.agePicker}
    >
      {ages.map((age) => {
        const selected = selectedAge === age;
        return (
          <Clickable
            key={age}
            onPress={() => onAgeSelect(age)}
            style={[
              styles.ageChip,
              {
                backgroundColor: selected ? palette.tint : palette.surface,
                borderColor: selected ? palette.tint : palette.border,
              },
            ]}
          >
            <ThemedText
              style={[Typography.bodySemiBold, { color: selected ? palette.onPrimary : palette.text }]}
            >
              {age}
            </ThemedText>
          </Clickable>
        );
      })}
    </ScrollView>
  );
});

// ─── SkillLevelRow ────────────────────────────────────────────────────────────

interface SkillLevelRowProps {
  levels: string[];
  selectedLevel: string | null;
  onLevelSelect: (level: string) => void;
  palette: ThemeColors;
}

export const SkillLevelRow = memo(function SkillLevelRow({
  levels,
  selectedLevel,
  onLevelSelect,
  palette,
}: SkillLevelRowProps) {
  return (
    <Row wrap gap="xs">
      {levels.map((level) => {
        const selected = selectedLevel === level;
        return (
          <Clickable
            key={level}
            onPress={() => onLevelSelect(level)}
            style={[
              styles.levelChip,
              {
                backgroundColor: selected ? palette.tint : palette.surface,
                borderColor: selected ? palette.tint : palette.border,
              },
            ]}
          >
            <ThemedText
              style={[Typography.small, { color: selected ? palette.onPrimary : palette.text }]}
            >
              {level}
            </ThemedText>
          </Clickable>
        );
      })}
    </Row>
  );
});

// ─── ImprovementAreaGrid ──────────────────────────────────────────────────────

interface ImprovementAreaGridProps {
  areas: ImprovementArea[];
  selectedAreas: string[];
  onToggleArea: (label: string) => void;
  palette: ThemeColors;
}

export const ImprovementAreaGrid = memo(function ImprovementAreaGrid({
  areas,
  selectedAreas,
  onToggleArea,
  palette,
}: ImprovementAreaGridProps) {
  return (
    <Row wrap gap="xs">
      {areas.map((area) => {
        const selected = selectedAreas.includes(area.label);
        return (
          <Clickable
            key={area.label}
            onPress={() => onToggleArea(area.label)}
            style={[
              styles.areaCard,
              {
                backgroundColor: selected ? withAlpha(palette.tint, 0.06) : palette.surface,
                borderColor: selected ? palette.tint : palette.border,
              },
            ]}
          >
            <Ionicons
              name={area.icon}
              size={Components.icon.lg}
              color={selected ? palette.tint : palette.muted}
            />
            <ThemedText
              style={[
                Typography.small,
                { color: selected ? palette.tint : palette.text, textAlign: 'center' },
              ]}
            >
              {area.label}
            </ThemedText>
            {selected && (
              <View style={[styles.checkBadge, { backgroundColor: palette.tint }]}>
                <Ionicons name="checkmark" size={12} color={palette.onPrimary} />
              </View>
            )}
          </Clickable>
        );
      })}
    </Row>
  );
});

// ─── CoachPreviewCard ─────────────────────────────────────────────────────────

interface CoachPreviewCardProps {
  coach: PlaceholderCoach;
  palette: ThemeColors;
}

export const CoachPreviewCard = memo(function CoachPreviewCard({
  coach,
  palette,
}: CoachPreviewCardProps) {
  return (
    <SurfaceCard style={styles.coachCard} tactile={false}>
      <Row align="center" gap="sm">
        <View style={[styles.coachAvatar, { backgroundColor: palette.surfaceSecondary }]}>
          <Ionicons name="person-outline" size={Components.icon.lg} color={palette.muted} />
        </View>
        <View style={styles.coachInfo}>
          <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
            {coach.name}
          </ThemedText>
          <ThemedText style={[Typography.small, { color: palette.muted }]}>
            {coach.specialty}
          </ThemedText>
        </View>
        <View style={styles.coachMeta}>
          <Row align="center" gap="xxs">
            <Ionicons name="star" size={14} color={palette.warning} />
            <ThemedText style={[Typography.small, { color: palette.text }]}>
              {coach.rating}
            </ThemedText>
          </Row>
          <ThemedText style={[Typography.caption, { color: palette.muted }]}>
            {coach.distance}
          </ThemedText>
        </View>
      </Row>
    </SurfaceCard>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  scrollInner: {
    flex: 1,
  },
  pageContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  sectionBlock: {
    width: '100%',
    gap: Spacing.xs,
  },
  agePicker: {
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  ageChip: {
    width: 44,
    height: Components.button.height,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelRow: {
    // layout moved to Row
  },
  levelChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  areasGrid: {
    // layout moved to Row
  },
  areaCard: {
    width: '48%',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 20,
    height: 20,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachList: {
    width: '100%',
    gap: Spacing.sm,
  },
  coachCard: {
    width: '100%',
  },
  coachRow: {
    // layout moved to Row
  },
  coachAvatar: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Components.avatar.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  coachMeta: {
    alignItems: 'flex-end',
    gap: Spacing.micro,
  },
  ratingRow: {
    // layout moved to Row
  },
});
