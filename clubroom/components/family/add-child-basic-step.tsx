import React from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Gender, Relationship } from '@/services/child-service';

// ─── Types ──────────────────────────────────────────────────────

export interface AddChildBasicStepProps {
  firstName: string;
  lastName: string;
  nickname: string;
  dateOfBirth: Date | null;
  gender: Gender | null;
  relationship: Relationship | null;
  photoUri: string | null;
  showDatePicker: boolean;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onNicknameChange: (value: string) => void;
  onDateOfBirthChange: (date: Date | null) => void;
  onGenderChange: (gender: Gender) => void;
  onRelationshipChange: (relationship: Relationship) => void;
  onPickImage: () => void;
  onShowDatePicker: (show: boolean) => void;
}

// ─── Constants ──────────────────────────────────────────────────

const GENDERS: { id: Gender; label: string }[] = [
  { id: 'MALE', label: 'Male' },
  { id: 'FEMALE', label: 'Female' },
  { id: 'OTHER', label: 'Other' },
  { id: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

const RELATIONSHIPS: { id: Relationship; label: string }[] = [
  { id: 'SON', label: 'Son' },
  { id: 'DAUGHTER', label: 'Daughter' },
  { id: 'WARD', label: 'Ward' },
  { id: 'GRANDCHILD', label: 'Grandchild' },
  { id: 'OTHER', label: 'Other' },
];

// ─── Component ──────────────────────────────────────────────────

function AddChildBasicStepInner({
  firstName,
  lastName,
  nickname,
  dateOfBirth,
  gender,
  relationship,
  photoUri,
  showDatePicker,
  onFirstNameChange,
  onLastNameChange,
  onNicknameChange,
  onDateOfBirthChange,
  onGenderChange,
  onRelationshipChange,
  onPickImage,
  onShowDatePicker,
}: AddChildBasicStepProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.stepContent}>
      {/* Photo Upload */}
      <View style={styles.photoSection}>
        <Clickable onPress={onPickImage} style={styles.photoPickerContainer}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <Ionicons name="camera" size={32} color={palette.tint} />
            </View>
          )}
          <View style={[styles.photoEditBadge, { backgroundColor: palette.tint }]}>
            <Ionicons name="add" size={16} color={palette.onPrimary} />
          </View>
        </Clickable>
        <ThemedText style={[styles.photoHint, { color: palette.muted }]}>
          Add a photo (optional)
        </ThemedText>
      </View>

      {/* Name Fields */}
      <View style={styles.row}>
        <View style={styles.halfField}>
          <ThemedText style={styles.label}>First Name *</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: palette.border, color: palette.text }]}
            placeholder="First name"
            placeholderTextColor={palette.muted}
            value={firstName}
            onChangeText={onFirstNameChange}
            autoCapitalize="words"
          />
        </View>
        <View style={styles.halfField}>
          <ThemedText style={styles.label}>Last Name *</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: palette.border, color: palette.text }]}
            placeholder="Last name"
            placeholderTextColor={palette.muted}
            value={lastName}
            onChangeText={onLastNameChange}
            autoCapitalize="words"
          />
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Nickname (optional)</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
          placeholder="What do they like to be called?"
          placeholderTextColor={palette.muted}
          value={nickname}
          onChangeText={onNicknameChange}
        />
      </View>

      {/* Date of Birth */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Date of Birth (optional)</ThemedText>
        <Clickable
          onPress={() => onShowDatePicker(true)}
          style={[styles.input, styles.dateInput, { borderColor: palette.border }]}
        >
          <ThemedText style={dateOfBirth ? {} : { color: palette.muted }}>
            {dateOfBirth
              ? dateOfBirth.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : 'Select date of birth'}
          </ThemedText>
          <Ionicons name="calendar-outline" size={20} color={palette.muted} />
        </Clickable>
        {showDatePicker && (
          <DateTimePicker
            value={dateOfBirth || new Date(2015, 0, 1)}
            mode="date"
            display="spinner"
            maximumDate={new Date()}
            minimumDate={new Date(2000, 0, 1)}
            onChange={(event, selectedDate) => {
              onShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) onDateOfBirthChange(selectedDate);
            }}
          />
        )}
      </View>

      {/* Gender */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Gender *</ThemedText>
        <View style={styles.optionGrid}>
          {GENDERS.map((g) => (
            <Clickable
              key={g.id}
              onPress={() => onGenderChange(g.id)}
              style={[
                styles.optionChip,
                {
                  backgroundColor: gender === g.id ? palette.tint : palette.surface,
                  borderColor: gender === g.id ? palette.tint : palette.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.optionText,
                  { color: gender === g.id ? palette.onPrimary : palette.text },
                ]}
              >
                {g.label}
              </ThemedText>
            </Clickable>
          ))}
        </View>
      </View>

      {/* Relationship */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Relationship *</ThemedText>
        <View style={styles.optionGrid}>
          {RELATIONSHIPS.map((r) => (
            <Clickable
              key={r.id}
              onPress={() => onRelationshipChange(r.id)}
              style={[
                styles.optionChip,
                {
                  backgroundColor: relationship === r.id ? palette.tint : palette.surface,
                  borderColor: relationship === r.id ? palette.tint : palette.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.optionText,
                  { color: relationship === r.id ? palette.onPrimary : palette.text },
                ]}
              >
                {r.label}
              </ThemedText>
            </Clickable>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  stepContent: {
    gap: Spacing.md,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  photoPickerContainer: {
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: Radii.full,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHint: {
    ...Typography.small,
    marginTop: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  optionText: {
    ...Typography.small,
    fontWeight: '500',
  },
});

// ─── Exports ────────────────────────────────────────────────────

export const AddChildBasicStep = React.memo(AddChildBasicStepInner);
export default AddChildBasicStep;
