import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ─── Types ──────────────────────────────────────────────────────

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

// ─── Consent Items ──────────────────────────────────────────────

interface ConsentItem {
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function buildConsentItems(props: AddChildConsentsStepProps): ConsentItem[] {
  return [
    {
      title: 'Photography',
      description: 'Allow photos during sessions for training purposes',
      value: props.photoConsent,
      onChange: props.onPhotoConsentChange,
    },
    {
      title: 'Video Recording',
      description: 'Allow video recording for training review',
      value: props.videoConsent,
      onChange: props.onVideoConsentChange,
    },
    {
      title: 'Social Media',
      description: 'Allow use in club social media posts',
      value: props.socialMediaConsent,
      onChange: props.onSocialMediaConsentChange,
    },
    {
      title: 'Emergency Treatment',
      description: 'Authorize emergency medical treatment if parent unavailable',
      value: props.emergencyTreatmentConsent,
      onChange: props.onEmergencyTreatmentConsentChange,
    },
  ];
}

// ─── Component ──────────────────────────────────────────────────

function AddChildConsentsStepInner(props: AddChildConsentsStepProps) {
  const { colors: palette } = useTheme();
  const consentItems = buildConsentItems(props);

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
              { backgroundColor: item.value ? palette.success : palette.border },
            ]}
          >
            <View
              style={[
                styles.toggleKnob,
                { backgroundColor: palette.onPrimary, transform: [{ translateX: item.value ? 18 : 2 }] },
              ]}
            />
          </View>
        </Clickable>
      ))}
    </View>
  );
}

export const AddChildConsentsStep = React.memo(AddChildConsentsStepInner);

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
  consentRow: {
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
  },
});
