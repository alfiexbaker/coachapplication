/**
 * SessionExtras — Price, age range, and skill focus fields for session creation.
 */
import { memo } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';
import type { FootballObjective } from '@/constants/types';
import { Row } from '@/components/primitives';

import { COACHING_FOCUSES } from '@/constants/football-registry';
const SKILLS: FootballObjective[] = COACHING_FOCUSES;

interface SessionExtrasProps {
  price: string;
  onPriceChange: (value: string) => void;
  priceError?: string | null;
  ageMin: string;
  onAgeMinChange: (value: string) => void;
  ageMax: string;
  onAgeMaxChange: (value: string) => void;
  ageError?: string | null;
  footballSkill: FootballObjective | '';
  onFootballSkillChange: (skill: FootballObjective | '') => void;
}

function SessionExtrasInner({
  price,
  onPriceChange,
  priceError,
  ageMin,
  onAgeMinChange,
  ageMax,
  onAgeMaxChange,
  ageError,
  footballSkill,
  onFootballSkillChange,
}: SessionExtrasProps) {
  const { colors: palette } = useTheme();

  const inputBase = [
    styles.input,
    { backgroundColor: palette.card, borderColor: palette.border, color: palette.text },
  ];

  return (
    <View style={styles.container}>
      {/* Price */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Price (£) - Optional</ThemedText>
        <Row style={styles.priceRow}>
          <View style={[styles.currencyPrefix, { backgroundColor: palette.border }]}>
            <ThemedText style={styles.currencyText}>£</ThemedText>
          </View>
          <TextInput
            style={[...inputBase, styles.priceInput]}
            placeholder="e.g., 35"
            placeholderTextColor={palette.muted}
            value={price}
            onChangeText={onPriceChange}
            keyboardType="decimal-pad"
            accessibilityLabel="Price in pounds"

            maxLength={10}
          />
        </Row>
        {priceError ? (
          <ThemedText style={[Typography.caption, { color: palette.error }]}>
            {priceError}
          </ThemedText>
        ) : (
          <ThemedText style={[Typography.caption, { color: palette.muted }]}>
            Whole pounds only (£10-£200, or leave blank)
          </ThemedText>
        )}
      </View>

      {/* Age Range */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Age Range - Optional</ThemedText>
        <Row style={styles.ageRow}>
          <TextInput
            style={[...inputBase, styles.ageInput]}
            placeholder="Min"
            placeholderTextColor={palette.muted}
            value={ageMin}
            onChangeText={onAgeMinChange}
            keyboardType="number-pad"
            accessibilityLabel="Minimum age"

            maxLength={10}
          />
          <ThemedText style={styles.ageSeparator}>to</ThemedText>
          <TextInput
            style={[...inputBase, styles.ageInput]}
            placeholder="Max"
            placeholderTextColor={palette.muted}
            value={ageMax}
            onChangeText={onAgeMaxChange}
            keyboardType="number-pad"
            accessibilityLabel="Maximum age"

            maxLength={10}
          />
        </Row>
        {ageError ? (
          <ThemedText style={[Typography.caption, { color: palette.error }]}>
            {ageError}
          </ThemedText>
        ) : null}
      </View>

      {/* Skill Focus */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Skill Focus - Optional</ThemedText>
        <Row style={styles.skillPicker}>
          {SKILLS.map((skill) => {
            const isActive = footballSkill === skill;
            return (
              <Clickable
                key={skill}
                onPress={() => onFootballSkillChange(isActive ? '' : skill)}
                accessibilityLabel={`${isActive ? 'Deselect' : 'Select'} ${skill}`}
                style={[
                  styles.skillButton,
                  {
                    backgroundColor: isActive ? palette.tint : palette.card,
                    borderColor: isActive ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.skillText,
                    isActive ? { color: palette.onPrimary, fontWeight: '700' } : undefined,
                  ]}
                >
                  {skill}
                </ThemedText>
              </Clickable>
            );
          })}
        </Row>
      </View>
    </View>
  );
}

export const SessionExtras = memo(SessionExtrasInner);

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    marginBottom: Spacing.xxs,
    letterSpacing: -0.2,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: scaleFont(16),
    lineHeight: scaleFont(20),
  },
  priceRow: {
    alignItems: 'stretch',
  },
  currencyPrefix: {
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
    borderTopLeftRadius: Radii.md,
    borderBottomLeftRadius: Radii.md,
  },
  currencyText: {
    fontSize: scaleFont(18),
    fontWeight: '700',
  },
  priceInput: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  ageRow: {
    alignItems: 'center',
    gap: Spacing.xs + Spacing.xxs,
  },
  ageInput: {
    flex: 1,
  },
  ageSeparator: {
    fontSize: scaleFont(15),
    paddingHorizontal: Spacing.xs,
    fontWeight: '600',
  },
  skillPicker: {
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  skillButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 2,
    minHeight: 44,
  },
  skillText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
