import React from 'react';
import { View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { Gender, Relationship } from '@/services/child-service';
import type { PositionRole } from '@/types/progress-types';

import {
  GENDERS,
  RELATIONSHIPS,
  PhotoUploadSection,
  NameFieldsRow,
  DateOfBirthField,
  OptionChipGrid,
  PositionOptionGrid,
  styles,
} from './add-child-basic-step-sections';

// ─── Types ──────────────────────────────────────────────────────

export interface AddChildBasicStepProps {
  firstName: string;
  lastName: string;
  nickname: string;
  dateOfBirth: Date | null;
  gender: Gender | null;
  relationship: Relationship | null;
  primaryPosition: PositionRole | null;
  photoUri: string | null;
  showDatePicker: boolean;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onNicknameChange: (value: string) => void;
  onDateOfBirthChange: (date: Date | null) => void;
  onGenderChange: (gender: Gender) => void;
  onRelationshipChange: (relationship: Relationship) => void;
  onPrimaryPositionChange: (position: PositionRole | null) => void;
  onPickImage: () => void;
  onShowDatePicker: (show: boolean) => void;
}

// ─── Component ──────────────────────────────────────────────────

function AddChildBasicStepInner({
  firstName,
  lastName,
  nickname,
  dateOfBirth,
  gender,
  relationship,
  primaryPosition,
  photoUri,
  showDatePicker,
  onFirstNameChange,
  onLastNameChange,
  onNicknameChange,
  onDateOfBirthChange,
  onGenderChange,
  onRelationshipChange,
  onPrimaryPositionChange,
  onPickImage,
  onShowDatePicker,
}: AddChildBasicStepProps) {
  const { colors: palette, isDark } = useTheme();

  return (
    <View style={styles.stepContent}>
      <PhotoUploadSection photoUri={photoUri} onPickImage={onPickImage} palette={palette} />

      <NameFieldsRow
        firstName={firstName}
        lastName={lastName}
        nickname={nickname}
        onFirstNameChange={onFirstNameChange}
        onLastNameChange={onLastNameChange}
        onNicknameChange={onNicknameChange}
        palette={palette}
      />

      <DateOfBirthField
        dateOfBirth={dateOfBirth}
        showDatePicker={showDatePicker}
        onDateOfBirthChange={onDateOfBirthChange}
        onShowDatePicker={onShowDatePicker}
        palette={palette}
        isDark={isDark}
      />

      <OptionChipGrid
        label="Gender *"
        options={GENDERS}
        selected={gender}
        onSelect={onGenderChange}
        palette={palette}
      />

      <OptionChipGrid
        label="Relationship *"
        options={RELATIONSHIPS}
        selected={relationship}
        onSelect={onRelationshipChange}
        palette={palette}
      />

      <PositionOptionGrid
        selected={primaryPosition}
        onSelect={onPrimaryPositionChange}
        palette={palette}
      />
    </View>
  );
}

// ─── Exports ────────────────────────────────────────────────────

export const AddChildBasicStep = React.memo(AddChildBasicStepInner);
export default AddChildBasicStep;
