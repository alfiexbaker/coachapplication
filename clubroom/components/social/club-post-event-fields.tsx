import React, { memo } from 'react';
import { View, StyleSheet, TextInput, Platform } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface ClubPostEventFieldsProps {
  eventDate: Date | null;
  eventLocation: string;
  showDatePicker: boolean;
  onOpenDatePicker: () => void;
  onCloseDatePicker: () => void;
  onSetDate: (date: Date) => void;
  onChangeLocation: (text: string) => void;
}

export const ClubPostEventFields = memo(function ClubPostEventFields({
  eventDate,
  eventLocation,
  showDatePicker,
  onOpenDatePicker,
  onCloseDatePicker,
  onSetDate,
  onChangeLocation,
}: ClubPostEventFieldsProps) {
  const { colors: palette, isDark } = useTheme();

  return (
    <View style={[styles.container, { borderColor: palette.border }]}>
      <ThemedText style={[styles.label, { color: palette.muted }]}>Event Details</ThemedText>
      <Clickable style={[styles.field, { borderColor: palette.border }]} onPress={onOpenDatePicker}>
        <Ionicons name="calendar-outline" size={20} color={palette.muted} />
        <ThemedText style={{ color: eventDate ? palette.text : palette.muted, flex: 1 }}>
          {eventDate
            ? eventDate.toLocaleDateString('en-GB', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })
            : 'Select date'}
        </ThemedText>
      </Clickable>
      {showDatePicker && (
        <DateTimePicker
          value={eventDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          textColor={palette.text}
          themeVariant={isDark ? 'dark' : 'light'}
          minimumDate={new Date()}
          onChange={(_, selectedDate) => {
            onCloseDatePicker();
            if (selectedDate) onSetDate(selectedDate);
          }}
        />
      )}
      <Row align="center" gap="sm" style={[styles.locationField, { borderColor: palette.border }]}>
        <Ionicons name="location-outline" size={20} color={palette.muted} />
        <TextInput
          style={[styles.input, { color: palette.text }]}
          placeholder="Location"
          placeholderTextColor={palette.muted}
          value={eventLocation}
          onChangeText={onChangeLocation}

            maxLength={100}
          />
      </Row>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  label: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  locationField: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  input: { flex: 1, ...Typography.body },
});
