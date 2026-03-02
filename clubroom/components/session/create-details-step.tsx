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
  postingAs?: 'self' | 'club';
  clubOptions?: { id: string; name: string }[];
  selectedClubId?: string | null;
  assigneeOptions?: { id: string; label: string; role: string }[];
  selectedAssigneeId?: string | null;
  onPostingAsChange?: (v: 'self' | 'club') => void;
  onSelectedClubIdChange?: (v: string | null) => void;
  onSelectedAssigneeIdChange?: (v: string | null) => void;
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
  postingAs = 'self',
  clubOptions = [],
  selectedClubId = null,
  assigneeOptions = [],
  selectedAssigneeId = null,
  onPostingAsChange,
  onSelectedClubIdChange,
  onSelectedAssigneeIdChange,
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

        {clubOptions.length > 0 &&
          onPostingAsChange &&
          onSelectedClubIdChange &&
          onSelectedAssigneeIdChange && (
            <Column gap="sm">
              <ThemedText type="defaultSemiBold" style={styles.label}>
                Ownership
              </ThemedText>
              <Row gap="sm">
                <Clickable
                  onPress={() => onPostingAsChange('self')}
                  style={[
                    styles.modePill,
                    {
                      borderColor: postingAs === 'self' ? colors.tint : colors.border,
                      backgroundColor:
                        postingAs === 'self'
                          ? withAlpha(colors.tint, 0.07)
                          : colors.surface,
                    },
                  ]}
                >
                  <ThemedText style={{ color: postingAs === 'self' ? colors.tint : colors.text }}>
                    As me
                  </ThemedText>
                </Clickable>
                <Clickable
                  onPress={() => onPostingAsChange('club')}
                  style={[
                    styles.modePill,
                    {
                      borderColor: postingAs === 'club' ? colors.tint : colors.border,
                      backgroundColor:
                        postingAs === 'club'
                          ? withAlpha(colors.tint, 0.07)
                          : colors.surface,
                    },
                  ]}
                >
                  <ThemedText style={{ color: postingAs === 'club' ? colors.tint : colors.text }}>
                    On behalf of club
                  </ThemedText>
                </Clickable>
              </Row>

              {postingAs === 'club' && (
                <Column gap="xs">
                  {clubOptions.map((club) => {
                    const selected = selectedClubId === club.id;
                    return (
                      <Clickable
                        key={club.id}
                        onPress={() => onSelectedClubIdChange(club.id)}
                        style={[
                          styles.inlineOption,
                          {
                            borderColor: selected ? colors.success : colors.border,
                            backgroundColor: selected
                              ? withAlpha(colors.success, 0.08)
                              : colors.surface,
                          },
                        ]}
                      >
                        <ThemedText style={{ color: selected ? colors.success : colors.text }}>
                          {club.name}
                        </ThemedText>
                      </Clickable>
                    );
                  })}

                  <ThemedText style={[styles.caption, { color: colors.muted }]}>
                    Assign coach
                  </ThemedText>
                  <Row wrap gap="xs">
                    {assigneeOptions.map((assignee) => {
                      const selected = selectedAssigneeId === assignee.id;
                      return (
                        <Clickable
                          key={assignee.id}
                          onPress={() => onSelectedAssigneeIdChange(assignee.id)}
                          style={[
                            styles.assigneeChip,
                            {
                              borderColor: selected ? colors.tint : colors.border,
                              backgroundColor: selected
                                ? withAlpha(colors.tint, 0.07)
                                : colors.surface,
                            },
                          ]}
                        >
                          <ThemedText
                            style={{
                              color: selected ? colors.tint : colors.text,
                              ...Typography.smallSemiBold,
                            }}
                          >
                            {assignee.label}
                          </ThemedText>
                          <ThemedText style={[styles.caption, { color: colors.muted }]}>
                            {assignee.role.replace('_', ' ')}
                          </ThemedText>
                        </Clickable>
                      );
                    })}
                  </Row>
                </Column>
              )}
            </Column>
          )}

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

            maxLength={50}
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

            maxLength={500}
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
  modePill: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineOption: {
    borderWidth: 1,
    borderRadius: Radii.md,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  assigneeChip: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    minWidth: 120,
    gap: Spacing.micro,
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
