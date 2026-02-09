/**
 * SessionExtras — Price, age range, and skill focus fields for session creation.
 */
import { memo } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';
import type { FootballObjective } from '@/constants/types';

const SKILLS: FootballObjective[] = [
  'Dribbling', 'Passing', 'Defending', 'Finishing', 'Goalkeeping', 'Conditioning',
];

interface SessionExtrasProps {
  price: string;
  onPriceChange: (value: string) => void;
  ageMin: string;
  onAgeMinChange: (value: string) => void;
  ageMax: string;
  onAgeMaxChange: (value: string) => void;
  footballSkill: FootballObjective | '';
  onFootballSkillChange: (skill: FootballObjective | '') => void;
}

function SessionExtrasInner({
  price,
  onPriceChange,
  ageMin,
  onAgeMinChange,
  ageMax,
  onAgeMaxChange,
  footballSkill,
  onFootballSkillChange,
}: SessionExtrasProps) {
  const { colors: palette } = useTheme();

  const inputBase = [styles.input, { backgroundColor: palette.card, borderColor: palette.border, color: palette.text }];

  return (
    <View style={styles.container}>
      {/* Price */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Price (£) - Optional</ThemedText>
        <View style={styles.priceRow}>
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
          />
        </View>
      </View>

      {/* Age Range */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Age Range - Optional</ThemedText>
        <View style={styles.ageRow}>
          <TextInput
            style={[...inputBase, styles.ageInput]}
            placeholder="Min"
            placeholderTextColor={palette.muted}
            value={ageMin}
            onChangeText={onAgeMinChange}
            keyboardType="number-pad"
            accessibilityLabel="Minimum age"
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
          />
        </View>
      </View>

      {/* Skill Focus */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Skill Focus - Optional</ThemedText>
        <View style={styles.skillPicker}>
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
        </View>
      </View>
    </View>
  );
}

export const SessionExtras = memo(SessionExtrasInner);

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  field: {
    gap: 8,
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: scaleFont(16),
    lineHeight: scaleFont(20),
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  currencyPrefix: {
    paddingHorizontal: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + Spacing.xxs,
  },
  ageInput: {
    flex: 1,
  },
  ageSeparator: {
    fontSize: scaleFont(15),
    paddingHorizontal: 8,
    fontWeight: '600',
  },
  skillPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skillButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
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
