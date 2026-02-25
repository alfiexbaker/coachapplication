/**
 * CreateDetailsStep — Step 1 of session creation wizard.
 *
 * Session type selection, title, max participants,
 * description, and focus area chips.
 */

import React, { memo } from 'react';
import { StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row, Column } from '@/components/primitives';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { FootballObjective } from '@/constants/types';
import {
  type SessionType,
  SESSION_TYPES,
  FOCUS_AREAS,
} from './create-session-types';

interface CreateDetailsStepProps {
  colors: ThemeColors;
  sessionType: SessionType;
  title: string;
  description: string;
  focusAreas: FootballObjective[];
  maxParticipants: string;
  defaultMaxParticipants: number;
  onSessionTypeChange: (v: SessionType) => void;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onToggleFocusArea: (area: FootballObjective) => void;
  onMaxParticipantsChange: (v: string) => void;
}

export const CreateDetailsStep = memo(function CreateDetailsStep({
  colors,
  sessionType,
  title,
  description,
  focusAreas,
  maxParticipants,
  defaultMaxParticipants,
  onSessionTypeChange,
  onTitleChange,
  onDescriptionChange,
  onToggleFocusArea,
  onMaxParticipantsChange,
}: CreateDetailsStepProps) {
  const { width } = useWindowDimensions();
  const useSingleColumnTypeCards = width < 360;
  const participantRuleText =
    sessionType === 'small_group'
      ? '2-4 athletes'
      : sessionType === 'group'
        ? '5+ athletes'
        : '6+ athletes recommended for camps';

  const inputColors = {
    backgroundColor: colors.surface,
    color: colors.text,
    borderColor: colors.border,
  };

  return (
    <Animated.View entering={FadeInRight.springify()}>
      <Column gap="lg">
        {/* Session Type */}
        <Column gap="sm">
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Session Type
          </ThemedText>
          <Row wrap justify="between" style={styles.typeGrid}>
            {SESSION_TYPES.map((type) => {
              const selected = sessionType === type.key;
              return (
                <Clickable
                  key={type.key}
                  onPress={() => onSessionTypeChange(type.key)}
                  accessibilityLabel={`Select ${type.label} session type`}
                  style={[
                    styles.typeCard,
                    useSingleColumnTypeCards ? styles.typeCardFull : styles.typeCardHalf,
                    {
                      backgroundColor: selected ? withAlpha(colors.tint, 0.07) : colors.surface,
                      borderColor: selected ? colors.tint : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.typeIcon,
                      {
                        backgroundColor: selected ? colors.tint : withAlpha(colors.muted, 0.12),
                      },
                    ]}
                  >
                    <Ionicons
                      name={type.icon}
                      size={22}
                      color={selected ? colors.onPrimary : colors.muted}
                    />
                  </View>
                  <ThemedText
                    style={[styles.typeLabel, { color: selected ? colors.tint : colors.text }]}
                  >
                    {type.label}
                  </ThemedText>
                  <ThemedText style={[styles.typeDesc, { color: colors.muted }]}>
                    {type.description}
                  </ThemedText>
                </Clickable>
              );
            })}
          </Row>
        </Column>

        {/* Title */}
        <Column gap="sm">
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Session Name *
          </ThemedText>
          <TextInput
            style={[styles.input, inputColors]}
            placeholder="e.g., Striker Finishing Clinic"
            placeholderTextColor={colors.muted}
            value={title}
            onChangeText={onTitleChange}
            accessibilityLabel="Session name"
          />
        </Column>

        {/* Max Participants (non-1on1) */}
        {sessionType !== '1on1' && (
          <Column gap="sm">
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Max Participants
            </ThemedText>
            <TextInput
              style={[styles.input, styles.smallInput, inputColors]}
              placeholder={`Default: ${defaultMaxParticipants}`}
              placeholderTextColor={colors.muted}
              value={maxParticipants}
              onChangeText={(value) =>
                onMaxParticipantsChange(value.replace(/[^0-9]/g, ''))
              }
              keyboardType="number-pad"
              accessibilityLabel="Max participants"
            />
            <ThemedText style={[styles.caption, { color: colors.muted }]}>
              {participantRuleText}
            </ThemedText>
          </Column>
        )}

        {/* Description */}
        <Column gap="sm">
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Description
          </ThemedText>
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
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Focus Areas
          </ThemedText>
          <Row wrap gap="sm">
            {FOCUS_AREAS.map((area) => {
              const selected = focusAreas.includes(area);
              return (
                <Clickable
                  key={area}
                  onPress={() => onToggleFocusArea(area)}
                  accessibilityLabel={`${selected ? 'Remove' : 'Add'} ${area} focus area`}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.tint : colors.surface,
                      borderColor: selected ? colors.tint : colors.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[styles.focusText, { color: selected ? colors.onPrimary : colors.text }]}
                  >
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
  input: {
    height: 48,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
    borderWidth: 1,
  },
  smallInput: { width: 140 },
  caption: {
    ...Typography.caption,
  },
  textArea: { height: 100, paddingTop: Spacing.sm, textAlignVertical: 'top' },
  typeCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  typeGrid: {
    rowGap: Spacing.sm,
  },
  typeCardHalf: {
    width: '48.6%',
  },
  typeCardFull: {
    width: '100%',
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: { ...Typography.bodySmallSemiBold },
  typeDesc: { ...Typography.caption },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  chipText: { ...Typography.bodySmallSemiBold },
  focusText: { ...Typography.smallSemiBold },
});
