import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography, Components , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
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
      <Pressable
        onPress={() => !disabled && setIsExpanded(!isExpanded)}
        disabled={disabled}
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
      </Pressable>

      {/* Expanded Options */}
      {isExpanded && !disabled && (
        <View style={[styles.optionsContainer, { borderColor: palette.border }]}>
          {REMINDER_OPTIONS.map((option) => {
            const isSelected = reminderMinutes === option.value;

            return (
              <Pressable
                key={option.value}
                onPress={() => handleSelect(option.value)}
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
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color={palette.accent} />
                )}
              </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: Components.card.padding,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  optionLabel: { ...Typography.body },
});
