import { memo } from 'react';
import { View, StyleSheet } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Consent, ConsentType } from '@/constants/types';

const CONSENT_LABELS: Record<ConsentType, { title: string; description: string }> = {
  PHOTO: { title: 'Photography', description: 'Allow photos to be taken during sessions' },
  VIDEO: { title: 'Video Recording', description: 'Allow video recording for training review' },
  SOCIAL_MEDIA: { title: 'Social Media', description: 'Allow use in club social media posts' },
  EMERGENCY_TREATMENT: { title: 'Emergency Treatment', description: 'Authorize emergency medical treatment if parent unavailable' },
};

interface MedicalConsentToggleProps {
  consent: Consent;
  onToggle: (type: ConsentType, granted: boolean) => void;
}

export const MedicalConsentToggle = memo(function MedicalConsentToggle({ consent, onToggle }: MedicalConsentToggleProps) {
  const { colors } = useTheme();
  const info = CONSENT_LABELS[consent.type];

  return (
    <Clickable onPress={() => onToggle(consent.type, !consent.granted)} style={styles.row}>
      <View style={{ flex: 1 }}>
        <ThemedText type="defaultSemiBold">{info.title}</ThemedText>
        <ThemedText style={{ color: colors.muted, ...Typography.small }}>{info.description}</ThemedText>
      </View>
      <View style={[styles.toggle, { backgroundColor: consent.granted ? colors.success : colors.border }]}>
        <View style={[styles.toggleKnob, { backgroundColor: colors.surface, transform: [{ translateX: consent.granted ? 18 : 2 }] }]} />
      </View>
    </Clickable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  toggle: { width: 48, height: 28, borderRadius: Radii.lg, justifyContent: 'center' },
  toggleKnob: { width: 24, height: 24, borderRadius: Radii.md },
});
