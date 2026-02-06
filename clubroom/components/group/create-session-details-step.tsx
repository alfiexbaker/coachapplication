import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { InlineSquadSelector } from '@/components/squad/squad-picker';
import { Colors, Spacing, Radii, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { GroupSession, FootballObjective } from '@/constants/types';

const SKILL_LEVELS: { key: GroupSession['skillLevel']; label: string }[] = [
  { key: 'ALL', label: 'All Levels' },
  { key: 'BEGINNER', label: 'Beginner' },
  { key: 'INTERMEDIATE', label: 'Intermediate' },
  { key: 'ADVANCED', label: 'Advanced' },
];

const FOCUS_OPTIONS: FootballObjective[] = [
  'Dribbling',
  'Passing',
  'Finishing',
  'Defending',
  'Goalkeeping',
  'Conditioning',
];

interface CreateSessionDetailsStepProps {
  title: string;
  description: string;
  location: string;
  ageMin: string;
  ageMax: string;
  skillLevel: GroupSession['skillLevel'];
  focus: FootballObjective[];
  isSquadSession: boolean;
  clubId: string;
  selectedSquadIds: string[];
  onFieldChange: (field: string, value: unknown) => void;
}

function CreateSessionDetailsStepInner({
  title,
  description,
  location,
  ageMin,
  ageMax,
  skillLevel,
  focus,
  isSquadSession,
  clubId,
  selectedSquadIds,
  onFieldChange,
}: CreateSessionDetailsStepProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const toggleFocus = (f: FootballObjective) => {
    if (focus.includes(f)) {
      onFieldChange('focus', focus.filter((x) => x !== f));
    } else {
      onFieldChange('focus', [...focus, f]);
    }
  };

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>
        Session details
      </ThemedText>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Title *</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
          placeholder="e.g., Half-Term Football Camp"
          placeholderTextColor={palette.muted}
          value={title}
          onChangeText={(v) => onFieldChange('title', v)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Description</ThemedText>
        <TextInput
          style={[styles.textArea, { backgroundColor: palette.surface, color: palette.text }]}
          placeholder="Tell parents what to expect..."
          placeholderTextColor={palette.muted}
          value={description}
          onChangeText={(v) => onFieldChange('description', v)}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Location *</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
          placeholder="e.g., Victoria Park, London"
          placeholderTextColor={palette.muted}
          value={location}
          onChangeText={(v) => onFieldChange('location', v)}
        />
      </View>

      <View style={styles.rowInputs}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <ThemedText style={styles.inputLabel}>Age Min</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
            placeholder="e.g., 8"
            placeholderTextColor={palette.muted}
            value={ageMin}
            onChangeText={(v) => onFieldChange('ageMin', v)}
            keyboardType="number-pad"
          />
        </View>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <ThemedText style={styles.inputLabel}>Age Max</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
            placeholder="e.g., 12"
            placeholderTextColor={palette.muted}
            value={ageMax}
            onChangeText={(v) => onFieldChange('ageMax', v)}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Skill Level</ThemedText>
        <View style={styles.chipRow}>
          {SKILL_LEVELS.map((level) => (
            <Clickable
              key={level.key}
              onPress={() => onFieldChange('skillLevel', level.key)}
              style={[
                styles.chip,
                {
                  backgroundColor: skillLevel === level.key ? palette.tint : palette.surface,
                  borderColor: skillLevel === level.key ? palette.tint : palette.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.chipText,
                  { color: skillLevel === level.key ? Colors.light.onPrimary : palette.text },
                ]}
              >
                {level.label}
              </ThemedText>
            </Clickable>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Focus Areas</ThemedText>
        <View style={styles.chipRow}>
          {FOCUS_OPTIONS.map((f) => (
            <Clickable
              key={f}
              onPress={() => toggleFocus(f)}
              style={[
                styles.chip,
                {
                  backgroundColor: focus.includes(f) ? palette.tint : palette.surface,
                  borderColor: focus.includes(f) ? palette.tint : palette.border,
                },
              ]}
            >
              <ThemedText
                style={[styles.chipText, { color: focus.includes(f) ? Colors.light.onPrimary : palette.text }]}
              >
                {f}
              </ThemedText>
            </Clickable>
          ))}
        </View>
      </View>

      {isSquadSession && (
        <View style={styles.inputGroup}>
          <ThemedText style={styles.inputLabel}>Link to Squad (Optional)</ThemedText>
          <ThemedText style={[{ color: palette.muted, ...Typography.caption, marginBottom: Spacing.xs }]}>
            Link this session to a squad for easy invite management
          </ThemedText>
          <InlineSquadSelector
            clubId={clubId}
            selectedSquadIds={selectedSquadIds}
            onSelectionChange={(ids: string[]) => onFieldChange('selectedSquadIds', ids)}
            multiSelect={false}
          />
        </View>
      )}
    </Animated.View>
  );
}

export const CreateSessionDetailsStep = React.memo(CreateSessionDetailsStepInner);

const styles = StyleSheet.create({
  stepContent: {
    gap: Spacing.lg,
  },
  stepTitle: {
    textAlign: 'center',
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    ...Typography.smallSemiBold,
  },
  input: {
    height: 48,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  textArea: {
    minHeight: 100,
    borderRadius: Radii.md,
    padding: Spacing.md,
    ...Typography.body,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  chipText: {
    ...Typography.smallSemiBold,
  },
});
