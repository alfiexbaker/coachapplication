/**
 * StepAthleteDetails — Athlete-specific details step of onboarding.
 */

import { memo } from 'react';
import { View, StyleSheet, TextInput, ScrollView } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SkillLevel } from '@/services/auth-service';
import { SPORTS, SKILL_LEVELS } from './onboarding-types';
import { Row } from '@/components/primitives';

interface StepAthleteDetailsProps {
  sport: string;
  skillLevel: SkillLevel | null;
  position: string;
  hasChildren: boolean;
  onSelectSport: (sport: string) => void;
  onSelectSkillLevel: (level: SkillLevel) => void;
  onChangePosition: (value: string) => void;
  onToggleHasChildren: () => void;
}

function StepAthleteDetailsInner({
  sport,
  skillLevel,
  position,
  hasChildren,
  onSelectSport,
  onSelectSkillLevel,
  onChangePosition,
  onToggleHasChildren,
}: StepAthleteDetailsProps) {
  const { colors: palette } = useTheme();
  const readinessChecks = [
    { key: 'sport', label: 'Sport selected', done: sport.length > 0 },
    { key: 'level', label: 'Skill level selected', done: Boolean(skillLevel) },
    { key: 'position', label: 'Position added', done: position.trim().length > 0 },
  ];
  const readiness = Math.round(
    (readinessChecks.filter((item) => item.done).length / readinessChecks.length) * 100,
  );

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(hasChildren ? 20 : 0, { duration: 200 }) }],
  }));

  return (
    <View style={styles.content}>
      <ThemedText type="title" style={styles.title}>
        Tell us about yourself
      </ThemedText>
      <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
        Help coaches understand your level and goals.
      </ThemedText>

      <View
        style={[
          styles.readinessCard,
          {
            backgroundColor: withAlpha(palette.tint, 0.05),
            borderColor: withAlpha(palette.tint, 0.16),
          },
        ]}
      >
        <Row style={styles.readinessHeader}>
          <ThemedText style={styles.readinessTitle}>Athlete profile readiness</ThemedText>
          <ThemedText style={[styles.readinessPercent, { color: palette.tint }]}>
            {readiness}%
          </ThemedText>
        </Row>
        <View style={[styles.readinessTrack, { backgroundColor: withAlpha(palette.tint, 0.14) }]}>
          <View
            style={[
              styles.readinessFill,
              {
                width: `${readiness}%`,
                backgroundColor: palette.tint,
              },
            ]}
          />
        </View>
      </View>

      {/* Sport picker */}
      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Sport *</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <Row style={styles.chipRow}>
            {SPORTS.map((s) => {
              const isSelected = sport === s;
              return (
                <Clickable
                  key={s}
                  onPress={() => onSelectSport(s)}
                  accessibilityLabel={`Select ${s}`}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? palette.tint : palette.card,
                      borderColor: isSelected ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      { color: isSelected ? palette.onPrimary : palette.foreground },
                    ]}
                  >
                    {s}
                  </ThemedText>
                </Clickable>
              );
            })}
          </Row>
        </ScrollView>
      </View>

      {/* Skill level grid */}
      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Skill Level *</ThemedText>
        <Row style={styles.skillGrid}>
          {SKILL_LEVELS.map((level) => {
            const isSelected = skillLevel === level.value;
            return (
              <Clickable
                key={level.value}
                onPress={() => onSelectSkillLevel(level.value)}
                accessibilityLabel={`${level.label}: ${level.description}`}
                accessibilityRole="button"
                style={[
                  styles.skillCard,
                  {
                    backgroundColor: isSelected ? withAlpha(palette.tint, 0.06) : palette.card,
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText type="defaultSemiBold">{level.label}</ThemedText>
                <ThemedText style={[styles.skillDesc, { color: palette.muted }]}>
                  {level.description}
                </ThemedText>
              </Clickable>
            );
          })}
        </Row>
      </View>

      {/* Position */}
      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Position (Optional)</ThemedText>
        <TextInput
          value={position}
          onChangeText={onChangePosition}
          placeholder="e.g. Midfielder, Point Guard"
          placeholderTextColor={palette.muted}
          accessibilityLabel="Position"
          style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
        />
      </View>

      {/* Has children toggle */}
      <View style={styles.fieldGroup}>
        <Clickable
          onPress={onToggleHasChildren}
          accessibilityLabel="I have children who train"
          accessibilityRole="switch"
          accessibilityState={{ checked: hasChildren }}
          style={[
            styles.toggleCard,
            {
              backgroundColor: hasChildren ? withAlpha(palette.tint, 0.06) : palette.card,
              borderColor: hasChildren ? palette.tint : palette.border,
            },
          ]}
        >
          <View style={styles.toggleContent}>
            <ThemedText type="defaultSemiBold">I have children who train</ThemedText>
            <ThemedText style={[styles.toggleDesc, { color: palette.muted }]}>
              You can add child profiles after signup
            </ThemedText>
          </View>
          <View
            style={[
              styles.toggleSwitch,
              { backgroundColor: hasChildren ? palette.tint : palette.border },
            ]}
          >
            <Animated.View
              style={[styles.toggleKnob, { backgroundColor: palette.surface }, knobStyle]}
            />
          </View>
        </Clickable>
      </View>
    </View>
  );
}

export const StepAthleteDetails = memo(StepAthleteDetailsInner);

const styles = StyleSheet.create({
  content: {
    gap: Spacing.lg,
  },
  title: {
    ...Typography.title,
  },
  subtitle: {
    ...Typography.body,
    marginTop: -Spacing.xs,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  readinessCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  readinessHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readinessTitle: {
    ...Typography.bodySemiBold,
  },
  readinessPercent: {
    ...Typography.caption,
    fontWeight: '700',
  },
  readinessTrack: {
    height: 6,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  readinessFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
  },
  chipScroll: {
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  chipRow: {
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  chipText: {
    ...Typography.small,
    fontWeight: '500',
  },
  skillGrid: {
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  skillCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 150,
    padding: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  skillDesc: {
    ...Typography.caption,
  },
  toggleCard: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.card,
    borderWidth: 1,
  },
  toggleContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  toggleDesc: {
    ...Typography.caption,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: Radii.lg,
    padding: Spacing.xxs,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: Radii.md,
  },
});
