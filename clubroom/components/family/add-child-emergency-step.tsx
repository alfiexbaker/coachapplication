import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted components for backward compat
export { AddChildConsentsStep } from './add-child-emergency-step-sections';
export type { AddChildConsentsStepProps } from './add-child-emergency-step-sections';

// ─── Types ──────────────────────────────────────────────────────

export interface AddChildEmergencyStepProps {
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  secondaryName: string;
  secondaryPhone: string;
  onEmergencyNameChange: (value: string) => void;
  onEmergencyPhoneChange: (value: string) => void;
  onEmergencyRelationChange: (value: string) => void;
  onSecondaryNameChange: (value: string) => void;
  onSecondaryPhoneChange: (value: string) => void;
}

// ─── Emergency Step ─────────────────────────────────────────────

function AddChildEmergencyStepInner({
  emergencyName,
  emergencyPhone,
  emergencyRelation,
  secondaryName,
  secondaryPhone,
  onEmergencyNameChange,
  onEmergencyPhoneChange,
  onEmergencyRelationChange,
  onSecondaryNameChange,
  onSecondaryPhoneChange,
}: AddChildEmergencyStepProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.stepContent}>
      <SurfaceCard style={styles.infoCard}>
        <Ionicons name="call-outline" size={24} color={palette.error} />
        <ThemedText style={[styles.infoText, { color: palette.muted }]}>
          Emergency contacts will be called if we cannot reach you during a session.
        </ThemedText>
      </SurfaceCard>

      {/* Primary Contact */}
      <View style={styles.field}>
        <ThemedText type="defaultSemiBold">Primary Emergency Contact *</ThemedText>
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Full Name *</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
          placeholder="Contact name"
          placeholderTextColor={palette.muted}
          value={emergencyName}
          onChangeText={onEmergencyNameChange}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Phone Number *</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
          placeholder="+44 7700 900123"
          placeholderTextColor={palette.muted}
          value={emergencyPhone}
          onChangeText={onEmergencyPhoneChange}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Relationship to Child *</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
          placeholder="e.g., Mother, Father, Grandparent"
          placeholderTextColor={palette.muted}
          value={emergencyRelation}
          onChangeText={onEmergencyRelationChange}
        />
      </View>

      {/* Secondary Contact */}
      <View style={[styles.field, { marginTop: Spacing.lg }]}>
        <ThemedText type="defaultSemiBold">Secondary Contact (Optional)</ThemedText>
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Full Name</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
          placeholder="Secondary contact name"
          placeholderTextColor={palette.muted}
          value={secondaryName}
          onChangeText={onSecondaryNameChange}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Phone Number</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
          placeholder="+44 7700 900456"
          placeholderTextColor={palette.muted}
          value={secondaryPhone}
          onChangeText={onSecondaryPhoneChange}
          keyboardType="phone-pad"
        />
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

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
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
  },
});

// ─── Exports ────────────────────────────────────────────────────

export const AddChildEmergencyStep = React.memo(AddChildEmergencyStepInner);
export default AddChildEmergencyStep;
