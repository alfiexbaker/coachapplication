import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, Components, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface ReminderOption {
  value: number;
  label: string;
}

const REMINDER_OPTIONS: ReminderOption[] = [
  { value: 0, label: 'No reminder' },
  { value: 15, label: '15 minutes before' },
  { value: 30, label: '30 minutes before' },
  { value: 60, label: '1 hour before' },
  { value: 120, label: '2 hours before' },
  { value: 1440, label: '1 day before' },
];

export interface SyncSettingsCardProps {
  reminderMinutes: number;
  onReminderChange: (minutes: number) => void;
  disabled?: boolean;
}

export function SyncSettingsCard({
  reminderMinutes,
  onReminderChange,
  disabled = false,
}: SyncSettingsCardProps) {
  const { colors: palette } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedOption = REMINDER_OPTIONS.find((opt) => opt.value === reminderMinutes);
  const displayLabel = selectedOption?.label ?? 'Select reminder';

  const handleSelect = (value: number) => {
    onReminderChange(value);
    setIsExpanded(false);
  };

  return (
    <View style={styles.container}>
      {/* Header/Toggle */}
      <Clickable
        onPress={() => !disabled && setIsExpanded(!isExpanded)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Session reminder options"
        accessibilityState={{ expanded: isExpanded, disabled }}
        style={({ pressed }) => [
          styles.header,
          {
            backgroundColor: palette.card,
            opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: withAlpha(palette.accent, 0.09) }]}>
          <Ionicons name="alarm" size={22} color={palette.accent} />
        </View>
        <View style={styles.headerContent}>
          <ThemedText style={styles.headerTitle}>Session Reminder</ThemedText>
          <ThemedText style={[styles.headerValue, { color: palette.muted }]}>
            {displayLabel}
          </ThemedText>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={palette.muted}
        />
      </Clickable>

      {/* Expanded Options */}
      {isExpanded && !disabled && (
        <View style={[styles.optionsContainer, { borderColor: palette.border }]}>
          {REMINDER_OPTIONS.map((option) => {
            const isSelected = reminderMinutes === option.value;

            return (
              <Clickable
                key={option.value}
                onPress={() => handleSelect(option.value)}
                accessibilityRole="button"
                accessibilityLabel={`Set reminder to ${option.label}`}
                accessibilityState={{ selected: isSelected }}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: isSelected ? withAlpha(palette.accent, 0.06) : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.optionLabel,
                    { color: isSelected ? palette.accent : palette.text },
                  ]}
                >
                  {option.label}
                </ThemedText>
                {isSelected && <Ionicons name="checkmark" size={20} color={palette.accent} />}
              </Clickable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    padding: Components.card.padding,
    minHeight: 44,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  headerTitle: { ...Typography.subheading },
  headerValue: { ...Typography.bodySmall },
  optionsContainer: {
    borderTopWidth: 1,
    paddingVertical: Spacing.xs,
  },
  option: {
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  optionLabel: { ...Typography.body },
});
