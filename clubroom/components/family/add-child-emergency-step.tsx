import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ─── Types ──────────────────────────────────────────────────────

export interface AddChildEmergencyStepProps {
  // Primary contact
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  // Secondary contact
  secondaryName: string;
  secondaryPhone: string;
  // Change handlers
  onEmergencyNameChange: (value: string) => void;
  onEmergencyPhoneChange: (value: string) => void;
  onEmergencyRelationChange: (value: string) => void;
  onSecondaryNameChange: (value: string) => void;
  onSecondaryPhoneChange: (value: string) => void;
}

export interface AddChildConsentsStepProps {
  photoConsent: boolean;
  videoConsent: boolean;
  socialMediaConsent: boolean;
  emergencyTreatmentConsent: boolean;
  onPhotoConsentChange: (value: boolean) => void;
  onVideoConsentChange: (value: boolean) => void;
  onSocialMediaConsentChange: (value: boolean) => void;
  onEmergencyTreatmentConsentChange: (value: boolean) => void;
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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

// ─── Consents Step ──────────────────────────────────────────────

function AddChildConsentsStepInner({
  photoConsent,
  videoConsent,
  socialMediaConsent,
  emergencyTreatmentConsent,
  onPhotoConsentChange,
  onVideoConsentChange,
  onSocialMediaConsentChange,
  onEmergencyTreatmentConsentChange,
}: AddChildConsentsStepProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const consentItems = [
    {
      title: 'Photography',
      description: 'Allow photos during sessions for training purposes',
      value: photoConsent,
      onChange: onPhotoConsentChange,
    },
    {
      title: 'Video Recording',
      description: 'Allow video recording for training review',
      value: videoConsent,
      onChange: onVideoConsentChange,
    },
    {
      title: 'Social Media',
      description: 'Allow use in club social media posts',
      value: socialMediaConsent,
      onChange: onSocialMediaConsentChange,
    },
    {
      title: 'Emergency Treatment',
      description: 'Authorize emergency medical treatment if parent unavailable',
      value: emergencyTreatmentConsent,
      onChange: onEmergencyTreatmentConsentChange,
    },
  ];

  return (
    <View style={styles.stepContent}>
      <SurfaceCard style={styles.infoCard}>
        <Ionicons name="shield-checkmark-outline" size={24} color={palette.success} />
        <ThemedText style={[styles.infoText, { color: palette.muted }]}>
          These permissions help us provide the best experience while keeping your
          child safe.
        </ThemedText>
      </SurfaceCard>

      {consentItems.map((item) => (
        <Clickable
          key={item.title}
          onPress={() => item.onChange(!item.value)}
          style={[styles.consentRow, { borderColor: palette.border }]}
        >
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
            <ThemedText style={[styles.consentDesc, { color: palette.muted }]}>
              {item.description}
            </ThemedText>
          </View>
          <View
            style={[
              styles.toggle,
              {
                backgroundColor: item.value ? palette.success : palette.border,
              },
            ]}
          >
            <View
              style={[
                styles.toggleKnob,
                { transform: [{ translateX: item.value ? 18 : 2 }] },
              ]}
            />
          </View>
        </Clickable>
      ))}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  stepContent: {
    gap: Spacing.md,
  },
  infoCard: {
    flexDirection: 'row',
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
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radii.md,
    gap: Spacing.md,
  },
  consentDesc: {
    ...Typography.small,
    marginTop: Spacing.micro,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: Radii.full,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: Radii.full,
    backgroundColor: Colors.light.onPrimary,
  },
});

// ─── Exports ────────────────────────────────────────────────────

export const AddChildEmergencyStep = React.memo(AddChildEmergencyStepInner);
export const AddChildConsentsStep = React.memo(AddChildConsentsStepInner);
export default AddChildEmergencyStep;
