/**
 * CreateDetailsStep — Step 1 of session creation wizard.
 *
 * Session type selection, title, duration, max participants,
 * description, and focus area chips.
 */

import React, { memo } from 'react';
import { StyleSheet, TextInput, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row, Column } from '@/components/primitives';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { FootballObjective } from '@/constants/types';
import { type SessionType, SESSION_TYPES, DURATION_OPTIONS, FOCUS_AREAS } from './create-session-types';

interface CreateDetailsStepProps {
  colors: ThemeColors;
  sessionType: SessionType;
  title: string;
  description: string;
  duration: number;
  focusAreas: FootballObjective[];
  maxParticipants: string;
  defaultMaxParticipants: number;
  onSessionTypeChange: (v: SessionType) => void;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onDurationChange: (v: number) => void;
  onToggleFocusArea: (area: FootballObjective) => void;
  onMaxParticipantsChange: (v: string) => void;
}

export const CreateDetailsStep = memo(function CreateDetailsStep({
  colors, sessionType, title, description, duration, focusAreas,
  maxParticipants, defaultMaxParticipants, onSessionTypeChange,
  onTitleChange, onDescriptionChange, onDurationChange,
  onToggleFocusArea, onMaxParticipantsChange,
}: CreateDetailsStepProps) {
  const inputColors = { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border };

  return (
    <Animated.View entering={FadeInRight.springify()}>
      <Column gap="lg">
        {/* Session Type */}
        <Column gap="sm">
          <ThemedText type="defaultSemiBold" style={styles.label}>Session Type</ThemedText>
          <Row wrap gap="sm">
            {SESSION_TYPES.map((type) => {
              const selected = sessionType === type.key;
              return (
                <Clickable
                  key={type.key}
                  onPress={() => onSessionTypeChange(type.key)}
                  accessibilityLabel={`Select ${type.label} session type`}
                  style={[styles.typeCard, {
                    backgroundColor: selected ? withAlpha(colors.tint, 0.07) : colors.surface,
                    borderColor: selected ? colors.tint : colors.border,
                  }]}
                >
                  <View style={[styles.typeIcon, {
                    backgroundColor: selected ? colors.tint : withAlpha(colors.muted, 0.12),
                  }]}>
                    <Ionicons name={type.icon} size={22} color={selected ? colors.onPrimary : colors.muted} />
                  </View>
                  <ThemedText style={[styles.typeLabel, { color: selected ? colors.tint : colors.text }]}>
                    {type.label}
                  </ThemedText>
                  <ThemedText style={[styles.typeDesc, { color: colors.muted }]}>{type.description}</ThemedText>
                </Clickable>
              );
            })}
          </Row>
        </Column>

        {/* Title */}
        <Column gap="sm">
          <ThemedText type="defaultSemiBold" style={styles.label}>Session Name *</ThemedText>
          <TextInput
            style={[styles.input, inputColors]}
            placeholder="e.g., Striker Finishing Clinic"
            placeholderTextColor={colors.muted}
            value={title}
            onChangeText={onTitleChange}
            accessibilityLabel="Session name"
          />
        </Column>

        {/* Duration */}
        <Column gap="sm">
          <ThemedText type="defaultSemiBold" style={styles.label}>Duration</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Row gap="sm">
              {DURATION_OPTIONS.map((opt) => {
                const selected = duration === opt.value;
                return (
                  <Clickable
                    key={opt.value}
                    onPress={() => onDurationChange(opt.value)}
                    accessibilityLabel={`Select ${opt.label} duration`}
                    style={[styles.chip, {
                      backgroundColor: selected ? colors.tint : colors.surface,
                      borderColor: selected ? colors.tint : colors.border,
                    }]}
                  >
                    <ThemedText style={[styles.chipText, { color: selected ? colors.onPrimary : colors.text }]}>
                      {opt.label}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </Row>
          </ScrollView>
        </Column>

        {/* Max Participants (non-1on1) */}
        {sessionType !== '1on1' && (
          <Column gap="sm">
            <ThemedText type="defaultSemiBold" style={styles.label}>Max Participants</ThemedText>
            <TextInput
              style={[styles.input, styles.smallInput, inputColors]}
              placeholder={`Default: ${defaultMaxParticipants}`}
              placeholderTextColor={colors.muted}
              value={maxParticipants}
              onChangeText={onMaxParticipantsChange}
              keyboardType="number-pad"
              accessibilityLabel="Max participants"
            />
          </Column>
        )}

        {/* Description */}
        <Column gap="sm">
          <ThemedText type="defaultSemiBold" style={styles.label}>Description</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea, inputColors]}
            placeholder="What will athletes learn or work on?"
            placeholderTextColor={colors.muted}
            value={description}
            onChangeText={onDescriptionChange}
            multiline
            numberOfLines={3}
            accessibilityLabel="Session description"
          />
        </Column>

        {/* Focus Areas */}
        <Column gap="sm">
          <ThemedText type="defaultSemiBold" style={styles.label}>Focus Areas</ThemedText>
          <Row wrap gap="sm">
            {FOCUS_AREAS.map((area) => {
              const selected = focusAreas.includes(area);
              return (
                <Clickable
                  key={area}
                  onPress={() => onToggleFocusArea(area)}
                  accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${area} focus area`}
                  style={[styles.chip, {
                    backgroundColor: selected ? colors.tint : colors.surface,
                    borderColor: selected ? colors.tint : colors.border,
                  }]}
                >
                  <ThemedText style={[styles.focusText, { color: selected ? colors.onPrimary : colors.text }]}>
                    {area}
                  </ThemedText>
                </Clickable>
              );
            })}
          </Row>
        </Column>
      </Column>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  label: { ...Typography.bodySmall },
  input: { height: 48, borderRadius: Radii.md, paddingHorizontal: Spacing.md, ...Typography.body, borderWidth: 1 },
  smallInput: { width: 140 },
  textArea: { height: 100, paddingTop: Spacing.sm, textAlignVertical: 'top' },
  typeCard: { width: '48%', padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1.5, alignItems: 'center', gap: Spacing.xs },
  typeIcon: { width: 44, height: 44, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { ...Typography.bodySmallSemiBold },
  typeDesc: { ...Typography.caption },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  chipText: { ...Typography.bodySmallSemiBold },
  focusText: { ...Typography.smallSemiBold },
});
