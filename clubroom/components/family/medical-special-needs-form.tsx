import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { Disability } from '@/services/child-service';

// Re-export extracted components for backward compat
export { DisabilitySelector } from './medical-special-needs-form-sections';
export type { DisabilitySelectorProps } from './medical-special-needs-form-sections';

import { DisabilitySelector } from './medical-special-needs-form-sections';
import { Row } from '@/components/primitives';

interface SpecialNeedsFormProps {
  firstName: string;
  hasSpecialNeeds: boolean | null;
  disabilities: Disability[];
  selectedDisabilityType: string | null;
  disabilityDescription: string;
  communicationNotes: string;
  behavioralNotes: string;
  onHasSpecialNeedsChange: (value: boolean) => void;
  onDisabilitiesChange: (value: Disability[]) => void;
  onSelectedDisabilityTypeChange: (value: string | null) => void;
  onDisabilityDescriptionChange: (value: string) => void;
  onCommunicationNotesChange: (value: string) => void;
  onBehavioralNotesChange: (value: string) => void;
  onAddDisability: () => void;
  palette: ThemeColors;
}

export const SpecialNeedsForm = React.memo(function SpecialNeedsForm({
  firstName,
  hasSpecialNeeds,
  disabilities,
  selectedDisabilityType,
  disabilityDescription,
  communicationNotes,
  behavioralNotes,
  onHasSpecialNeedsChange,
  onDisabilitiesChange,
  onSelectedDisabilityTypeChange,
  onDisabilityDescriptionChange,
  onCommunicationNotesChange,
  onBehavioralNotesChange,
  onAddDisability,
  palette,
}: SpecialNeedsFormProps) {
  return (
    <View style={styles.stepContent}>
      <SurfaceCard style={styles.infoCard}>
        <Ionicons name="heart-outline" size={24} color={palette.tint} />
        <ThemedText style={[styles.infoText, { color: palette.muted }]}>
          This information helps coaches provide the best experience for your child.
          It will be shared with coaches who work with {firstName || 'your child'}.
        </ThemedText>
      </SurfaceCard>

      <View style={styles.field}>
        <ThemedText style={styles.label}>
          Does {firstName || 'your child'} have any disabilities or special needs? *
        </ThemedText>
        <Row style={styles.yesNoRow}>
          <Clickable
            onPress={() => onHasSpecialNeedsChange(true)}
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
            onDisabilitiesChange={onDisabilitiesChange}
            onSelectedDisabilityTypeChange={onSelectedDisabilityTypeChange}
            onDisabilityDescriptionChange={onDisabilityDescriptionChange}
            onAddDisability={onAddDisability}
            palette={palette}
          />

          <View style={styles.field}>
            <ThemedText style={styles.label}>Communication Preferences</ThemedText>
            <ThemedText style={[styles.hint, { color: palette.muted }]}>
              How does {firstName || 'your child'} communicate best?
            </ThemedText>
            <TextInput
              style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
              placeholder="e.g., Responds well to visual cues, prefers direct instructions..."
              placeholderTextColor={palette.muted}
              value={communicationNotes}
              onChangeText={onCommunicationNotesChange}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Behavioral Considerations</ThemedText>
            <ThemedText style={[styles.hint, { color: palette.muted }]}>
              Anything coaches should know about behavior or triggers?
            </ThemedText>
            <TextInput
              style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
              placeholder="e.g., May need breaks, gets overwhelmed in large groups..."
              placeholderTextColor={palette.muted}
              value={behavioralNotes}
              onChangeText={onBehavioralNotesChange}
              multiline
              numberOfLines={3}
            />
          </View>
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  stepContent: {
    gap: Spacing.md,
  },
  infoCard: {
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoText: {
    flex: 1,
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
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  yesNoRow: {
    gap: Spacing.md,
  },
  yesNoButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  yesNoText: {
    ...Typography.bodySemiBold,
  },
});
