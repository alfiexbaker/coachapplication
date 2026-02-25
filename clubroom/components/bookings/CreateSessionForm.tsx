/**
 * CreateSessionForm — Form for creating a new session offering.
 * Composes type selectors, basic fields, date picker, and extras.
 */
import { ScrollView, View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { FootballObjective } from '@/constants/types';
import { scaleFont, scale } from '@/utils/scale';
import { SessionTypeSelector } from './create-session-type-selector';
import { SessionDatePicker } from './create-session-date-picker';
import { SessionExtras } from './create-session-extras';

export type SessionType = '1on1' | 'group';
export type RecurrenceType = 'none' | 'weekly';

export interface CreateSessionFormProps {
  sessionType: SessionType;
  onSessionTypeChange: (type: SessionType) => void;
  recurrenceType: RecurrenceType;
  onRecurrenceTypeChange: (type: RecurrenceType) => void;
  sessionTitle: string;
  onSessionTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  maxParticipants: string;
  onMaxParticipantsChange: (value: string) => void;
  location: string;
  onLocationChange: (value: string) => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  showDatePicker: boolean;
  onShowDatePickerChange: (show: boolean) => void;
  showTimePicker: boolean;
  onShowTimePickerChange: (show: boolean) => void;
  price: string;
  onPriceChange: (value: string) => void;
  ageMin: string;
  onAgeMinChange: (value: string) => void;
  ageMax: string;
  onAgeMaxChange: (value: string) => void;
  footballSkill: FootballObjective | '';
  onFootballSkillChange: (skill: FootballObjective | '') => void;
  onSubmit: () => void;
}

export function CreateSessionForm(props: CreateSessionFormProps) {
  const { colors: palette, scheme } = useTheme();
  const parseAge = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const ageValidationError = (() => {
    const min = parseAge(props.ageMin);
    const max = parseAge(props.ageMax);
    if (min !== null && min < 4) return 'Minimum age must be at least 4';
    if (max !== null && max > 18) return 'Maximum age must be under 18';
    if (min !== null && max !== null && min > max) return 'Minimum age must be less than maximum';
    return null;
  })();

  const canSubmit = !ageValidationError;

  return (
    <ScrollView
      style={styles.formContainer}
      contentContainerStyle={styles.formContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Session + Recurrence Type */}
      <SessionTypeSelector
        sessionType={props.sessionType}
        onSessionTypeChange={props.onSessionTypeChange}
        recurrenceType={props.recurrenceType}
        onRecurrenceTypeChange={props.onRecurrenceTypeChange}
      />

      {/* Form Fields */}
      <View style={styles.formFields}>
        <View style={styles.fieldContainer}>
          <ThemedText style={styles.label}>Session Title *</ThemedText>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: palette.card, borderColor: palette.border, color: palette.text },
            ]}
            placeholder="e.g., Advanced Dribbling Skills, Goalkeeper Training"
            placeholderTextColor={palette.muted}
            value={props.sessionTitle}
            onChangeText={props.onSessionTitleChange}
            accessibilityLabel="Session title"
          />
        </View>

        <View style={styles.fieldContainer}>
          <ThemedText style={styles.label}>Description (Optional)</ThemedText>
          <TextInput
            style={[
              styles.input,
              styles.multilineInput,
              { backgroundColor: palette.card, borderColor: palette.border, color: palette.text },
            ]}
            placeholder="Add details about the session..."
            placeholderTextColor={palette.muted}
            value={props.description}
            onChangeText={props.onDescriptionChange}
            multiline
            numberOfLines={3}
            accessibilityLabel="Session description"
          />
        </View>

        {props.sessionType === 'group' && (
          <View style={styles.fieldContainer}>
            <ThemedText style={styles.label}>Max Participants</ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: palette.card, borderColor: palette.border, color: palette.text },
              ]}
              placeholder="Enter maximum number of participants"
              placeholderTextColor={palette.muted}
              value={props.maxParticipants}
              onChangeText={props.onMaxParticipantsChange}
              keyboardType="number-pad"
              accessibilityLabel="Maximum participants"
            />
          </View>
        )}

        <View style={styles.fieldContainer}>
          <ThemedText style={styles.label}>Location</ThemedText>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: palette.card, borderColor: palette.border, color: palette.text },
            ]}
            placeholder="Enter session location"
            placeholderTextColor={palette.muted}
            value={props.location}
            onChangeText={props.onLocationChange}
            accessibilityLabel="Session location"
          />
        </View>

        {/* Date & Time */}
        <SessionDatePicker
          selectedDate={props.selectedDate}
          onDateChange={props.onDateChange}
          showDatePicker={props.showDatePicker}
          onShowDatePickerChange={props.onShowDatePickerChange}
          showTimePicker={props.showTimePicker}
          onShowTimePickerChange={props.onShowTimePickerChange}
        />

        {/* Price, Age, Skill */}
        <SessionExtras
          price={props.price}
          onPriceChange={props.onPriceChange}
          ageMin={props.ageMin}
          onAgeMinChange={props.onAgeMinChange}
          ageMax={props.ageMax}
          onAgeMaxChange={props.onAgeMaxChange}
          ageError={ageValidationError}
          footballSkill={props.footballSkill}
          onFootballSkillChange={props.onFootballSkillChange}
        />
      </View>

      {/* Create Button */}
      <Clickable
        onPress={props.onSubmit}
        disabled={!canSubmit}
        accessibilityLabel="Create session offering"
        accessibilityState={{ disabled: !canSubmit }}
        style={[styles.createButton, { backgroundColor: palette.tint, ...Shadows[scheme].card }]}
      >
        <Ionicons name="checkmark-circle-outline" size={24} color={palette.onPrimary} />
        <ThemedText style={[styles.createButtonText, { color: palette.onPrimary }]}>
          Create Session Offering
        </ThemedText>
      </Clickable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  formContainer: { flex: 1 },
  formContent: { padding: Spacing.sm, paddingTop: Spacing.sm, gap: Spacing.md },
  formFields: { gap: Spacing.sm },
  fieldContainer: { gap: Spacing.xs },
  label: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    marginBottom: Spacing.xxs,
    letterSpacing: -0.2,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: scaleFont(16),
    lineHeight: scaleFont(20),
  },
  multilineInput: {
    minHeight: scale(100),
    textAlignVertical: 'top',
    paddingTop: Spacing.sm,
  },
  createButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.xs + Spacing.xxs,
    marginBottom: Spacing.lg,
    minHeight: 44,
  },
  createButtonText: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    letterSpacing: -0.4,
  },
});
