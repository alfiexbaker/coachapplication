import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { Disability, SpecialNeed } from '@/services/child-service';

import { DisabilitySelector, SpecialNeedEntrySection } from './medical-special-needs-form-sections';
import { Row } from '@/components/primitives';

// Re-export extracted components for backward compat
export { DisabilitySelector, SpecialNeedEntrySection } from './medical-special-needs-form-sections';
export type {
  DisabilitySelectorProps,
  SpecialNeedEntrySectionProps,
} from './medical-special-needs-form-sections';

interface SpecialNeedsFormProps {
  firstName: string;
  hasSpecialNeeds: boolean | null;
  disabilities: Disability[];
  selectedDisabilityType: string | null;
  disabilityDescription: string;
  communicationNotes: string;
  behavioralNotes: string;
  // Disability detail fields
  diagnosisDate: string;
  supportRequired: string;
  commPrefs: string[];
  triggers: string[];
  calmingStrategies: string[];
  // Special need form fields
  specialNeeds: SpecialNeed[];
  snCategory: SpecialNeed['category'] | null;
  snName: string;
  snDescription: string;
  snSeverity: SpecialNeed['severity'] | undefined;
  snAccommodations: string[];
  snParentHints: string;
  // Callbacks
  onHasSpecialNeedsChange: (value: boolean) => void;
  onDisabilitiesChange: (value: Disability[]) => void;
  onSelectedDisabilityTypeChange: (value: string | null) => void;
  onDisabilityDescriptionChange: (value: string) => void;
  onCommunicationNotesChange: (value: string) => void;
  onBehavioralNotesChange: (value: string) => void;
  onAddDisability: () => void;
  onDiagnosisDateChange: (value: string) => void;
  onSupportRequiredChange: (value: string) => void;
  onCommPrefsChange: (value: string[]) => void;
  onTriggersChange: (value: string[]) => void;
  onCalmingStrategiesChange: (value: string[]) => void;
  onSnCategoryChange: (v: SpecialNeed['category'] | null) => void;
  onSnNameChange: (v: string) => void;
  onSnDescriptionChange: (v: string) => void;
  onSnSeverityChange: (v: SpecialNeed['severity']) => void;
  onSnAccommodationsChange: (v: string[]) => void;
  onSnParentHintsChange: (v: string) => void;
  onAddSpecialNeed: () => void;
  onCancelSpecialNeed: () => void;
  onRemoveSpecialNeed: (id: string) => void;
  palette: ThemeColors;
}

export const SpecialNeedsForm = function SpecialNeedsForm({
  firstName,
  hasSpecialNeeds,
  disabilities,
  selectedDisabilityType,
  disabilityDescription,
  communicationNotes,
  behavioralNotes,
  diagnosisDate,
  supportRequired,
  commPrefs,
  triggers,
  calmingStrategies,
  specialNeeds,
  snCategory,
  snName,
  snDescription,
  snSeverity,
  snAccommodations,
  snParentHints,
  onHasSpecialNeedsChange,
  onDisabilitiesChange,
  onSelectedDisabilityTypeChange,
  onDisabilityDescriptionChange,
  onCommunicationNotesChange,
  onBehavioralNotesChange,
  onAddDisability,
  onDiagnosisDateChange,
  onSupportRequiredChange,
  onCommPrefsChange,
  onTriggersChange,
  onCalmingStrategiesChange,
  onSnCategoryChange,
  onSnNameChange,
  onSnDescriptionChange,
  onSnSeverityChange,
  onSnAccommodationsChange,
  onSnParentHintsChange,
  onAddSpecialNeed,
  onCancelSpecialNeed,
  onRemoveSpecialNeed,
  palette,
}: SpecialNeedsFormProps) {
  return (
    <View style={styles.stepContent}>
      <ThemedText style={[styles.context, { color: palette.muted }]}>
        Coaches can see this only when assigned to {firstName || 'this player'}.
      </ThemedText>

      <View style={styles.field}>
        <ThemedText style={styles.label}>
          Does {firstName || 'this player'} need coaching adjustments? *
        </ThemedText>
        <Row style={styles.yesNoRow}>
          <Clickable
            onPress={() => onHasSpecialNeedsChange(true)}
            accessibilityRole="radio"
            accessibilityLabel="Yes, coaching adjustments are needed"
            accessibilityState={{
              selected: hasSpecialNeeds === true,
              checked: hasSpecialNeeds === true,
            }}
            style={[
              styles.yesNoButton,
              {
                backgroundColor: hasSpecialNeeds === true ? palette.tint : palette.surface,
                borderColor: hasSpecialNeeds === true ? palette.tint : palette.border,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.yesNoText,
                { color: hasSpecialNeeds === true ? palette.onPrimary : palette.text },
              ]}
            >
              Yes
            </ThemedText>
          </Clickable>
          <Clickable
            onPress={() => onHasSpecialNeedsChange(false)}
            accessibilityRole="radio"
            accessibilityLabel="No coaching adjustments are needed"
            accessibilityState={{
              selected: hasSpecialNeeds === false,
              checked: hasSpecialNeeds === false,
            }}
            style={[
              styles.yesNoButton,
              {
                backgroundColor: hasSpecialNeeds === false ? palette.tint : palette.surface,
                borderColor: hasSpecialNeeds === false ? palette.tint : palette.border,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.yesNoText,
                { color: hasSpecialNeeds === false ? palette.onPrimary : palette.text },
              ]}
            >
              No
            </ThemedText>
          </Clickable>
        </Row>
      </View>

      {hasSpecialNeeds === true && (
        <>
          <DisabilitySelector
            disabilities={disabilities}
            selectedDisabilityType={selectedDisabilityType}
            disabilityDescription={disabilityDescription}
            diagnosisDate={diagnosisDate}
            supportRequired={supportRequired}
            commPrefs={commPrefs}
            triggers={triggers}
            calmingStrategies={calmingStrategies}
            onDisabilitiesChange={onDisabilitiesChange}
            onSelectedDisabilityTypeChange={onSelectedDisabilityTypeChange}
            onDisabilityDescriptionChange={onDisabilityDescriptionChange}
            onDiagnosisDateChange={onDiagnosisDateChange}
            onSupportRequiredChange={onSupportRequiredChange}
            onCommPrefsChange={onCommPrefsChange}
            onTriggersChange={onTriggersChange}
            onCalmingStrategiesChange={onCalmingStrategiesChange}
            onAddDisability={onAddDisability}
            palette={palette}
          />

          <SpecialNeedEntrySection
            specialNeeds={specialNeeds}
            snCategory={snCategory}
            snName={snName}
            snDescription={snDescription}
            snSeverity={snSeverity}
            snAccommodations={snAccommodations}
            snParentHints={snParentHints}
            onSnCategoryChange={onSnCategoryChange}
            onSnNameChange={onSnNameChange}
            onSnDescriptionChange={onSnDescriptionChange}
            onSnSeverityChange={onSnSeverityChange}
            onSnAccommodationsChange={onSnAccommodationsChange}
            onSnParentHintsChange={onSnParentHintsChange}
            onAddSpecialNeed={onAddSpecialNeed}
            onCancelSpecialNeed={onCancelSpecialNeed}
            onRemoveSpecialNeed={onRemoveSpecialNeed}
            palette={palette}
          />

          <View style={styles.field}>
            <ThemedText style={styles.label}>Communication notes</ThemedText>
            <ThemedText style={[styles.hint, { color: palette.muted }]}>
              What helps {firstName || 'this player'} understand instructions?
            </ThemedText>
            <TextInput
              style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
              accessibilityLabel="Communication notes, optional"
              placeholder="For example, visual cues or direct instructions"
              placeholderTextColor={palette.muted}
              value={communicationNotes}
              onChangeText={onCommunicationNotesChange}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Behaviour notes</ThemedText>
            <ThemedText style={[styles.hint, { color: palette.muted }]}>
              Note any triggers, breaks or routines a coach should know.
            </ThemedText>
            <TextInput
              style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
              accessibilityLabel="Behaviour notes, optional"
              placeholder="Optional"
              placeholderTextColor={palette.muted}
              value={behavioralNotes}
              onChangeText={onBehavioralNotesChange}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  stepContent: {
    gap: Spacing.md,
  },
  context: {
    ...Typography.small,
    lineHeight: 18,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.bodySmall,
    fontWeight: '500',
  },
  hint: {
    ...Typography.small,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  yesNoRow: {
    gap: Spacing.xs,
  },
  yesNoButton: {
    flex: 1,
    minHeight: 48,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  yesNoText: {
    ...Typography.bodySemiBold,
  },
});
