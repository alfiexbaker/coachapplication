import { memo, useCallback } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { Spacer } from '@/components/primitives/spacer';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Consent, ConsentType } from '@/constants/types';

const CONSENT_LABELS: Record<ConsentType, { title: string; description: string }> = {
  PHOTO: { title: 'Photography', description: 'Allow photos to be taken during sessions' },
  VIDEO: { title: 'Video Recording', description: 'Allow video recording for training review' },
  SOCIAL_MEDIA: { title: 'Social Media', description: 'Allow use in club social media posts' },
  EMERGENCY_TREATMENT: {
    title: 'Emergency Treatment',
    description: 'Authorize emergency medical treatment if parent unavailable',
  },
};

interface MedicalConsentToggleProps {
  consent: Consent;
  onToggle: (type: ConsentType, granted: boolean) => void;
}

export const MedicalConsentToggle = memo(function MedicalConsentToggle({
  consent,
  onToggle,
}: MedicalConsentToggleProps) {
  const { colors } = useTheme();
  const info = CONSENT_LABELS[consent.type];

  const handlePress = useCallback(() => {
    const newValue = !consent.granted;

    // Confirmation dialog when toggling OFF emergency treatment
    if (!newValue && consent.type === 'EMERGENCY_TREATMENT') {
      Alert.alert(
        'Remove Emergency Treatment Consent',
        'Are you sure you want to remove permission for emergency medical treatment?\n\nWithout this consent, coaches cannot authorize emergency medical care for your child during sessions.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove Consent',
            style: 'destructive',
            onPress: () => {
              if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              onToggle(consent.type, newValue);
            },
          },
        ],
      );
      return;
    }

    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(consent.type, newValue);
  }, [consent.type, consent.granted, onToggle]);

  return (
    <Column>
      <Clickable onPress={handlePress} style={styles.row}>
        <Column flex>
          <ThemedText type="defaultSemiBold">{info.title}</ThemedText>
          <ThemedText style={{ color: colors.muted, ...Typography.small }}>
            {info.description}
          </ThemedText>
        </Column>
        <View
          style={[
            styles.toggle,
            { backgroundColor: consent.granted ? colors.success : colors.border },
          ]}
        >
          <View
            style={[
              styles.toggleKnob,
              {
                backgroundColor: colors.surface,
                transform: [{ translateX: consent.granted ? 18 : 2 }],
              },
            ]}
          />
        </View>
      </Clickable>

      {consent.type === 'EMERGENCY_TREATMENT' && !consent.granted && (
        <Row
          style={[
            styles.warningBanner,
            {
              backgroundColor: withAlpha(colors.error, 0.08),
              borderLeftColor: colors.error,
            },
          ]}
          align="center"
        >
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Spacer size="xs" horizontal />
          <Column flex>
            <ThemedText style={[Typography.small, { color: colors.error }]}>
              Emergency treatment permission not granted
            </ThemedText>
            <ThemedText style={[Typography.caption, { marginTop: Spacing.micro, color: colors.error }]}>
              Coaches cannot authorize emergency medical care
            </ThemedText>
          </Column>
        </Row>
      )}
    </Column>
  );
});

const styles = StyleSheet.create({
  row: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  toggle: { width: 48, height: 28, borderRadius: Radii.lg, justifyContent: 'center' },
  toggleKnob: { width: 24, height: 24, borderRadius: Radii.md },
  warningBanner: {
    marginTop: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    borderLeftWidth: 3,
  },
});
