/**
 * Extracted sub-components for AddChildBasicStep.
 *
 * GENDERS, RELATIONSHIPS — option constants.
 * PhotoUploadSection — photo picker with edit badge.
 * NameFieldsRow — first/last name + nickname inputs.
 * DateOfBirthField — date picker trigger + DateTimePicker.
 * OptionChipGrid — reusable chip grid for gender/relationship.
 */

import { memo } from 'react';
import { Platform, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import { POSITION_OPTIONS_WITH_ROTATE } from '@/constants/position-skills';
import type { ThemeColors } from '@/hooks/useTheme';
import type { Gender, Relationship } from '@/services/child-service';
import type { PositionRole } from '@/types/progress-types';
import { Row } from '@/components/primitives';
import { styles } from './add-child-basic-step-styles';

// ─── Constants ───────────────────────────────────────────────────────────────

export const GENDERS: { id: Gender; label: string }[] = [
  { id: 'MALE', label: 'Male' },
  { id: 'FEMALE', label: 'Female' },
  { id: 'OTHER', label: 'Other' },
  { id: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

export const RELATIONSHIPS: { id: Relationship; label: string }[] = [
  { id: 'SON', label: 'Son' },
  { id: 'DAUGHTER', label: 'Daughter' },
  { id: 'WARD', label: 'Ward' },
  { id: 'GRANDCHILD', label: 'Grandchild' },
  { id: 'OTHER', label: 'Other' },
];

// ─── PhotoUploadSection ──────────────────────────────────────────────────────

interface PhotoUploadSectionProps {
  photoUri: string | null;
  onPickImage: () => void;
  palette: ThemeColors;
}

export const PhotoUploadSection = memo(function PhotoUploadSection({
  photoUri,
  onPickImage,
  palette,
}: PhotoUploadSectionProps) {
  return (
    <View style={styles.photoSection}>
      <Clickable
        accessibilityLabel="Upload photo"
        onPress={onPickImage}
        style={styles.photoPickerContainer}
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <View
            style={[styles.photoPlaceholder, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
          >
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
  );
});

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

export const NameFieldsRow = memo(function NameFieldsRow({
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
      <Row style={styles.row}>
        <View style={styles.halfField}>
          <ThemedText style={styles.label}>First Name *</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: palette.border, color: palette.text }]}
            placeholder="First name"
            placeholderTextColor={palette.muted}
            value={firstName}
            onChangeText={onFirstNameChange}
            autoCapitalize="words"

            maxLength={50}
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

            maxLength={50}
          />
        </View>
      </Row>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Nickname (optional)</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
          placeholder="What do they like to be called?"
          placeholderTextColor={palette.muted}
          value={nickname}
          onChangeText={onNicknameChange}

            maxLength={50}
          />
      </View>
    </>
  );
});

// ─── DateOfBirthField ────────────────────────────────────────────────────────

interface DateOfBirthFieldProps {
  dateOfBirth: Date | null;
  showDatePicker: boolean;
  onDateOfBirthChange: (date: Date | null) => void;
  onShowDatePicker: (show: boolean) => void;
  palette: ThemeColors;
  isDark: boolean;
}

export const DateOfBirthField = memo(function DateOfBirthField({
  dateOfBirth,
  showDatePicker,
  onDateOfBirthChange,
  onShowDatePicker,
  palette,
  isDark,
}: DateOfBirthFieldProps) {
  return (
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
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          textColor={palette.text}
          themeVariant={isDark ? 'dark' : 'light'}
          maximumDate={new Date()}
          minimumDate={new Date(2000, 0, 1)}
          onChange={(event, selectedDate) => {
            onShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) onDateOfBirthChange(selectedDate);
          }}
        />
      )}
    </View>
  );
});

// ─── OptionChipGrid ──────────────────────────────────────────────────────────

interface OptionChipGridProps<T extends string> {
  label: string;
  options: { id: T; label: string }[];
  selected: T | null;
  onSelect: (id: T) => void;
  palette: ThemeColors;
}

export const OptionChipGrid = memo(function OptionChipGrid<T extends string>({
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
}) as <T extends string>(props: OptionChipGridProps<T>) => React.ReactElement;

interface PositionOptionGridProps {
  selected: PositionRole | null;
  onSelect: (position: PositionRole | null) => void;
  palette: ThemeColors;
}

export const PositionOptionGrid = memo(function PositionOptionGrid({
  selected,
  onSelect,
  palette,
}: PositionOptionGridProps) {
  const toDisplayLabel = (key: PositionRole | null): string => {
    if (key === null) {
      return 'They rotate';
    }
    if (key === 'ATT') {
      return 'Striker';
    }
    return key;
  };

  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>Primary Position</ThemedText>
      <Row style={styles.optionGrid}>
        {POSITION_OPTIONS_WITH_ROTATE.map((option) => {
          const isSelected = selected === option.key;
          return (
            <Clickable
              key={option.key ?? 'rotate'}
              onPress={() => onSelect(option.key)}
              style={[
                styles.optionChip,
                {
                  backgroundColor: isSelected ? palette.tint : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Set primary position to ${option.label}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Row align="center" gap="xxs">
                <Ionicons
                  name={option.icon as keyof typeof Ionicons.glyphMap}
                  size={14}
                  color={isSelected ? palette.onPrimary : palette.muted}
                />
                <ThemedText
                  style={[
                    styles.optionText,
                    { color: isSelected ? palette.onPrimary : palette.text },
                  ]}
                >
                  {toDisplayLabel(option.key)}
                </ThemedText>
              </Row>
            </Clickable>
          );
        })}
      </Row>
      <ThemedText style={[styles.photoHint, { color: palette.muted }]}>
        Pick a default position for coaches. Choose rotate if they play multiple roles.
      </ThemedText>
    </View>
  );
});

export { styles };
