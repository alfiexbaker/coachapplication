/**
 * CreateTypeStep — Session type, focus area, and invite type selection step.
 *
 * Displays session template chips, focus area chips, and invite type chips.
 */

import React, { memo, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row, Column } from '@/components/primitives';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { SessionTemplate, SessionInviteType } from '@/constants/types';

const FOCUSES = ['Dribbling', 'Passing', 'Finishing', 'Defending', 'Goalkeeping', 'Conditioning'];

const INVITE_TYPE_OPTIONS: {
  key: SessionInviteType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'OPEN', label: 'Open', icon: 'globe-outline' },
  { key: 'CLOSED', label: 'Closed', icon: 'lock-closed-outline' },
  { key: 'SQUAD_ONLY', label: 'Squad Only', icon: 'people-outline' },
];

export interface CreateTypeStepProps {
  sessionTemplates: SessionTemplate[];
  selectedTemplate: SessionTemplate | null;
  focus: string;
  sessionInviteType: SessionInviteType;
  price: string;
  onSelectTemplate: (template: SessionTemplate) => void;
  onSelectFocus: (focus: string) => void;
  onSelectInviteType: (type: SessionInviteType) => void;
  colors: ThemeColors;
}

interface TemplateChipProps {
  template: SessionTemplate;
  isSelected: boolean;
  onSelect: (template: SessionTemplate) => void;
  colors: ThemeColors;
}

const TemplateChip = memo(function TemplateChip({
  template,
  isSelected,
  onSelect,
  colors,
}: TemplateChipProps) {
  const handlePress = useCallback(() => {
    onSelect(template);
  }, [template, onSelect]);

  return (
    <Clickable
      onPress={handlePress}
      style={[
        styles.templateChip,
        {
          backgroundColor: isSelected ? colors.tint : colors.surface,
          borderColor: isSelected ? colors.tint : colors.border,
        },
      ]}
      accessibilityLabel={`Select ${template.name} session type`}
      accessibilityRole="button"
    >
      <ThemedText
        style={{ color: isSelected ? colors.onPrimary : colors.text, ...Typography.smallSemiBold }}
        numberOfLines={1}
      >
        {template.name}
      </ThemedText>
      <Row gap="sm" justify="center">
        <ThemedText
          style={{
            color: isSelected ? withAlpha(colors.onPrimary, 0.8) : colors.muted,
            ...Typography.micro,
          }}
        >
          {template.duration}m
        </ThemedText>
        <ThemedText
          style={{
            color: isSelected ? withAlpha(colors.onPrimary, 0.8) : colors.muted,
            ...Typography.micro,
          }}
        >
          {'\u00A3'}
          {template.defaultPrice}
        </ThemedText>
      </Row>
    </Clickable>
  );
});

export const CreateTypeStep = memo(function CreateTypeStep({
  sessionTemplates,
  selectedTemplate,
  focus,
  sessionInviteType,
  onSelectTemplate,
  onSelectFocus,
  onSelectInviteType,
  colors,
}: CreateTypeStepProps) {
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <Column gap="md">
        <ThemedText type="subtitle" style={styles.stepTitle}>
          Session Details
        </ThemedText>

        {/* Session Template Picker */}
        <Column gap="xs">
          <ThemedText style={styles.formLabel}>Session Type</ThemedText>
          <Row wrap gap="xs">
            {sessionTemplates.map((tmpl) => (
              <TemplateChip
                key={tmpl.id}
                template={tmpl}
                isSelected={selectedTemplate?.id === tmpl.id}
                onSelect={onSelectTemplate}
                colors={colors}
              />
            ))}
          </Row>
          {selectedTemplate && (
            <Row
              gap="xs"
              align="center"
              style={[styles.autoFillBanner, { backgroundColor: withAlpha(colors.success, 0.06) }]}
            >
              <Ionicons name="sparkles" size={14} color={colors.success} />
              <ThemedText style={[styles.autoFillText, { color: colors.success }]}>
                {selectedTemplate.duration}min · {'\u00A3'}
                {selectedTemplate.defaultPrice}/session · Cap {selectedTemplate.capacity}
              </ThemedText>
            </Row>
          )}
        </Column>

        {/* Focus Area */}
        <Column gap="xs">
          <ThemedText style={styles.formLabel}>Focus Area</ThemedText>
          <Row wrap gap="xs">
            {FOCUSES.map((f) => (
              <FocusChip
                key={f}
                label={f}
                isSelected={focus === f}
                onSelect={onSelectFocus}
                colors={colors}
              />
            ))}
          </Row>
        </Column>

        {/* Invite Type */}
        <Column gap="xs">
          <ThemedText style={styles.formLabel}>Invite Type</ThemedText>
          <Row wrap gap="xs">
            {INVITE_TYPE_OPTIONS.map((opt) => (
              <InviteTypeChip
                key={opt.key}
                option={opt}
                isSelected={sessionInviteType === opt.key}
                onSelect={onSelectInviteType}
                colors={colors}
              />
            ))}
          </Row>
        </Column>
      </Column>
    </Animated.View>
  );
});

interface FocusChipProps {
  label: string;
  isSelected: boolean;
  onSelect: (focus: string) => void;
  colors: ThemeColors;
}

const FocusChip = memo(function FocusChip({ label, isSelected, onSelect, colors }: FocusChipProps) {
  const handlePress = useCallback(() => {
    onSelect(label);
  }, [label, onSelect]);

  return (
    <Clickable
      onPress={handlePress}
      style={[
        styles.optionChip,
        {
          backgroundColor: isSelected ? colors.tint : colors.surface,
          borderColor: isSelected ? colors.tint : colors.border,
        },
      ]}
      accessibilityLabel={`Select ${label} focus`}
      accessibilityRole="button"
    >
      <ThemedText
        style={{ color: isSelected ? colors.onPrimary : colors.text, ...Typography.small }}
      >
        {label}
      </ThemedText>
    </Clickable>
  );
});

interface InviteTypeChipProps {
  option: { key: SessionInviteType; label: string; icon: keyof typeof Ionicons.glyphMap };
  isSelected: boolean;
  onSelect: (type: SessionInviteType) => void;
  colors: ThemeColors;
}

const InviteTypeChip = memo(function InviteTypeChip({
  option,
  isSelected,
  onSelect,
  colors,
}: InviteTypeChipProps) {
  const handlePress = useCallback(() => {
    onSelect(option.key);
  }, [option.key, onSelect]);

  return (
    <Clickable
      onPress={handlePress}
      style={[
        styles.optionChip,
        {
          backgroundColor: isSelected ? colors.tint : colors.surface,
          borderColor: isSelected ? colors.tint : colors.border,
        },
      ]}
      accessibilityLabel={`Select ${option.label} invite type`}
      accessibilityRole="button"
    >
      <Row gap="xxs" align="center">
        <Ionicons
          name={option.icon}
          size={14}
          color={isSelected ? colors.onPrimary : colors.text}
        />
        <ThemedText
          style={{ color: isSelected ? colors.onPrimary : colors.text, ...Typography.small }}
        >
          {option.label}
        </ThemedText>
      </Row>
    </Clickable>
  );
});

const styles = StyleSheet.create({
  stepTitle: { ...Typography.title },
  formLabel: { ...Typography.bodySmallSemiBold, marginBottom: Spacing.xxs },
  templateChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.micro,
    minWidth: 100,
    alignItems: 'center',
    minHeight: 44,
  },
  optionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    minHeight: 44,
  },
  autoFillBanner: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.sm,
  },
  autoFillText: { ...Typography.smallSemiBold },
});
