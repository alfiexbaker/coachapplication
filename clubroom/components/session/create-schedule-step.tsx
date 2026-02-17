/**
 * CreateScheduleStep — Step 2 of session creation wizard.
 *
 * Frequency, date, time, location with saved locations, and pricing.
 */

import React, { memo, useMemo } from 'react';
import { StyleSheet, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { DateTimeField } from '@/components/ui/primitives/DateTimeField';
import { Row, Column } from '@/components/primitives';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { type RecurrenceType, RECURRENCE_OPTIONS } from './create-session-types';

interface CreateScheduleStepProps {
  colors: ThemeColors;
  recurrence: RecurrenceType;
  selectedDate: string;
  selectedTime: string;
  location: string;
  price: string;
  savedLocations: string[];
  onRecurrenceChange: (v: RecurrenceType) => void;
  onDateChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onPriceChange: (v: string) => void;
}

export const CreateScheduleStep = memo(function CreateScheduleStep({
  colors,
  recurrence,
  selectedDate,
  selectedTime,
  location,
  price,
  savedLocations,
  onRecurrenceChange,
  onDateChange,
  onTimeChange,
  onLocationChange,
  onPriceChange,
}: CreateScheduleStepProps) {
  const today = useMemo(() => new Date(), []);
  const inputColors = {
    backgroundColor: colors.surface,
    color: colors.text,
    borderColor: colors.border,
  };

  return (
    <Animated.View entering={FadeInRight.springify()}>
      <Column gap="lg">
        {/* Frequency */}
        <Column gap="sm">
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Frequency
          </ThemedText>
          <Row wrap gap="sm">
            {RECURRENCE_OPTIONS.map((opt) => {
              const selected = recurrence === opt.key;
              return (
                <Clickable
                  key={opt.key}
                  onPress={() => onRecurrenceChange(opt.key)}
                  accessibilityLabel={`Select ${opt.label} frequency`}
                  style={[
                    styles.recurrenceCard,
                    {
                      backgroundColor: selected ? withAlpha(colors.tint, 0.07) : colors.surface,
                      borderColor: selected ? colors.tint : colors.border,
                    },
                  ]}
                >
                  <Row align="center" gap="xs">
                    <Ionicons
                      name={opt.icon}
                      size={20}
                      color={selected ? colors.tint : colors.muted}
                    />
                    <ThemedText
                      style={[
                        styles.recurrenceLabel,
                        { color: selected ? colors.tint : colors.text },
                      ]}
                    >
                      {opt.label}
                    </ThemedText>
                  </Row>
                </Clickable>
              );
            })}
          </Row>
        </Column>

        {/* Date */}
        <DateTimeField
          mode="date"
          label={recurrence === 'once' ? 'Date *' : 'Start Date *'}
          value={selectedDate}
          onChange={onDateChange}
          minimumDate={today}
        />

        {/* Time */}
        <DateTimeField
          mode="time"
          label="Time"
          value={selectedTime}
          onChange={onTimeChange}
          minuteInterval={5}
        />

        {/* Location with saved */}
        <Column gap="sm">
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Location *
          </ThemedText>
          <TextInput
            style={[styles.input, inputColors]}
            placeholder="e.g., Central Park Field 1"
            placeholderTextColor={colors.muted}
            value={location}
            onChangeText={onLocationChange}
            accessibilityLabel="Session location"
          />
          {savedLocations.length > 0 && (
            <Column gap="xs" style={styles.savedSection}>
              <ThemedText style={[styles.caption, { color: colors.muted }]}>Recent:</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Row gap="sm">
                  {savedLocations.map((loc) => (
                    <Clickable
                      key={`loc-${loc}`}
                      onPress={() => onLocationChange(loc)}
                      accessibilityLabel={`Select saved location: ${loc}`}
                      style={[
                        styles.savedChip,
                        {
                          backgroundColor:
                            location === loc ? withAlpha(colors.tint, 0.07) : colors.surface,
                          borderColor: location === loc ? colors.tint : colors.border,
                        },
                      ]}
                    >
                      <Row align="center" gap="xxs">
                        <Ionicons name="location" size={12} color={colors.muted} />
                        <ThemedText
                          style={[styles.caption, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {loc}
                        </ThemedText>
                      </Row>
                    </Clickable>
                  ))}
                </Row>
              </ScrollView>
            </Column>
          )}
        </Column>

        {/* Price */}
        <Column gap="sm">
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Price per Session (GBP)
          </ThemedText>
          <Row align="center" gap="sm">
            <ThemedText style={[styles.currency, { color: colors.muted }]}>£</ThemedText>
            <TextInput
              style={[styles.input, styles.priceInput, inputColors]}
              placeholder="0 for free"
              placeholderTextColor={colors.muted}
              value={price}
              onChangeText={onPriceChange}
              keyboardType="decimal-pad"
              accessibilityLabel="Session price"
            />
          </Row>
          <ThemedText style={[styles.hint, { color: colors.muted }]}>
            Leave empty or set to 0 for free sessions
          </ThemedText>
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
  recurrenceCard: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  recurrenceLabel: { ...Typography.smallSemiBold },
  savedSection: { marginTop: Spacing.xs },
  caption: { ...Typography.caption },
  savedChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    borderWidth: 1,
    maxWidth: 180,
  },
  currency: { ...Typography.heading },
  priceInput: { flex: 1, maxWidth: 120 },
  hint: { ...Typography.caption, marginTop: Spacing.xs },
});
