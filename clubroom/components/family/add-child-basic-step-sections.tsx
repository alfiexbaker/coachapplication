import { useState } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import { styles } from './add-child-basic-step-styles';

// ─── PhotoUploadSection ──────────────────────────────────────────────────────

interface PhotoUploadSectionProps {
  photoUri: string | null;
  onPickImage: () => void;
  palette: ThemeColors;
}

export const PhotoUploadSection = function PhotoUploadSection({
  photoUri,
  onPickImage,
  palette,
}: PhotoUploadSectionProps) {
  return (
    <Clickable
      accessibilityRole="button"
      accessibilityLabel={photoUri ? 'Change player photo' : 'Add player photo'}
      onPress={onPickImage}
      style={[styles.photoSection, { borderColor: palette.border }]}
    >
      <View style={styles.photoPickerContainer}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <View
            style={[styles.photoPlaceholder, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
          >
            <Ionicons name="camera-outline" size={22} color={palette.tint} />
          </View>
        )}
      </View>
      <View style={styles.photoCopy}>
        <ThemedText style={styles.label}>Player photo</ThemedText>
        <ThemedText style={[styles.photoHint, { color: palette.muted }]}>Optional</ThemedText>
      </View>
      <ThemedText style={[styles.photoAction, { color: palette.tint }]}>
        {photoUri ? 'Change' : 'Add'}
      </ThemedText>
    </Clickable>
  );
};

// ─── NameFieldsRow ───────────────────────────────────────────────────────────

interface NameFieldsRowProps {
  firstName: string;
  lastName: string;
  nickname: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onNicknameChange: (value: string) => void;
  palette: ThemeColors;
}

export const NameFieldsRow = function NameFieldsRow({
  firstName,
  lastName,
  nickname,
  onFirstNameChange,
  onLastNameChange,
  onNicknameChange,
  palette,
}: NameFieldsRowProps) {
  return (
    <>
      <View style={styles.field}>
        <ThemedText style={styles.label}>First name *</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
          accessibilityLabel="First name"
          placeholder="First name"
          placeholderTextColor={palette.muted}
          value={firstName}
          onChangeText={onFirstNameChange}
          autoCapitalize="words"
          maxLength={50}
        />
      </View>
      <View style={styles.field}>
        <ThemedText style={styles.label}>Last name *</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
          accessibilityLabel="Last name"
          placeholder="Last name"
          placeholderTextColor={palette.muted}
          value={lastName}
          onChangeText={onLastNameChange}
          autoCapitalize="words"
          maxLength={50}
        />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Preferred name</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
          accessibilityLabel="Preferred name, optional"
          placeholder="Optional"
          placeholderTextColor={palette.muted}
          value={nickname}
          onChangeText={onNicknameChange}
          maxLength={50}
        />
      </View>
    </>
  );
};

// ─── DateOfBirthField ────────────────────────────────────────────────────────

interface DateOfBirthFieldProps {
  dateOfBirth: Date | null;
  showDatePicker: boolean;
  onDateOfBirthChange: (date: Date | null) => void;
  onShowDatePicker: (show: boolean) => void;
  palette: ThemeColors;
  isDark: boolean;
}

export const DateOfBirthField = function DateOfBirthField({
  dateOfBirth,
  showDatePicker,
  onDateOfBirthChange,
  onShowDatePicker,
  palette,
  isDark,
}: DateOfBirthFieldProps) {
  const [today] = useState(() => new Date());
  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>Date of birth</ThemedText>
      <Clickable
        accessibilityRole="button"
        accessibilityLabel="Date of birth, optional"
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
        <View style={[styles.datePickerPanel, { borderColor: palette.border }]}>
          <DateTimePicker
            value={dateOfBirth || new Date(2015, 0, 1)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            textColor={palette.text}
            themeVariant={isDark ? 'dark' : 'light'}
            maximumDate={today}
            minimumDate={new Date(2000, 0, 1)}
            onChange={(event, selectedDate) => {
              onShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) onDateOfBirthChange(selectedDate);
            }}
          />
          {Platform.OS === 'ios' ? (
            <Clickable
              accessibilityRole="button"
              accessibilityLabel="Done selecting date of birth"
              onPress={() => onShowDatePicker(false)}
              style={styles.datePickerDone}
            >
              <ThemedText style={[styles.photoAction, { color: palette.tint }]}>Done</ThemedText>
            </Clickable>
          ) : null}
        </View>
      )}
    </View>
  );
};

// ─── OptionChipGrid ──────────────────────────────────────────────────────────

interface OptionChipGridProps<T extends string> {
  label: string;
  options: { id: T; label: string }[];
  selected: T | null;
  onSelect: (id: T) => void;
  palette: ThemeColors;
}

export const OptionChipGrid = function OptionChipGrid<T extends string>({
  label,
  options,
  selected,
  onSelect,
  palette,
}: OptionChipGridProps<T>) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <Row style={styles.optionGrid}>
        {options.map((opt) => (
          <Clickable
            key={opt.id}
            onPress={() => onSelect(opt.id)}
            accessibilityRole="radio"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: selected === opt.id, checked: selected === opt.id }}
            style={[
              styles.optionChip,
              {
                backgroundColor: selected === opt.id ? palette.tint : palette.surface,
                borderColor: selected === opt.id ? palette.tint : palette.border,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.optionText,
                { color: selected === opt.id ? palette.onPrimary : palette.text },
              ]}
            >
              {opt.label}
            </ThemedText>
          </Clickable>
        ))}
      </Row>
    </View>
  );
} as <T extends string>(props: OptionChipGridProps<T>) => React.ReactElement;
