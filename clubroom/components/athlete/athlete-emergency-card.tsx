import React, { useCallback } from 'react';
import { View, StyleSheet, Platform, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { MedicalAlertBadge } from '@/components/safety/MedicalAlertBadge';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { safetyService } from '@/services/safety-service';
import { createLogger } from '@/utils/logger';
import type { RosterEntry, EmergencyContact } from '@/constants/types';
import type { AthleteEmergencyQuickView } from '@/services/safety-service';

const logger = createLogger('AthleteEmergencyCard');

export const AthleteEmergencyCard = React.memo(function AthleteEmergencyCard({
  athlete,
  emergencyData,
}: {
  athlete: RosterEntry;
  emergencyData: AthleteEmergencyQuickView | null;
}) {
  const { colors } = useTheme();

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(Routes.rosterAthleteEmergency(athlete.athleteId));
  }, [athlete.athleteId]);

  const handleCallContact = useCallback((contact: EmergencyContact) => {
    const phoneNumber = contact.phone.replace(/\s/g, '');
    const telUrl = `tel:${phoneNumber}`;

    Alert.alert(
      'Call Emergency Contact',
      `Call ${contact.name} at ${contact.phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          style: 'destructive',
          onPress: async () => {
            if (Platform.OS !== 'web') {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
            const canOpen = await Linking.canOpenURL(telUrl);
            if (canOpen) {
              await Linking.openURL(telUrl);
              logger.info('Emergency contact called', { contactId: contact.id });
            } else {
              Alert.alert('Cannot Make Call', 'This device cannot make phone calls');
            }
          },
        },
      ],
    );
  }, []);

  const alertColor = emergencyData?.hasAlerts
    ? safetyService.getAlertLevelColor(emergencyData.alertLevel)
    : colors.success;

  return (
    <SurfaceCard
      style={[
        styles.card,
        {
          borderColor: emergencyData?.hasAlerts ? withAlpha(alertColor, 0.25) : colors.border,
        },
      ]}
      onPress={handlePress}
    >
      <Row gap="sm" align="center" style={styles.header}>
        <View style={[styles.icon, { backgroundColor: withAlpha(alertColor, 0.09) }]}>
          <Ionicons
            name={emergencyData?.hasAlerts ? 'warning' : 'shield-checkmark'}
            size={20}
            color={alertColor}
          />
        </View>
        <Column gap="micro" style={styles.flex1}>
          <ThemedText type="defaultSemiBold">Emergency Info</ThemedText>
          <ThemedText style={[styles.subtext, { color: colors.muted }]}>
            {emergencyData ? safetyService.getAlertSummary(emergencyData) : 'Tap to view'}
          </ThemedText>
        </Column>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Row>

      {emergencyData?.hasAlerts && (
        <Row gap="xxs" style={styles.alertBadges} wrap>
          {emergencyData.allergies.slice(0, 2).map((allergy, i) => (
            <MedicalAlertBadge key={`a-${i}`} type="allergy" label={allergy} size="small" />
          ))}
          {emergencyData.conditions.slice(0, 1).map((condition, i) => (
            <MedicalAlertBadge key={`c-${i}`} type="condition" label={condition} size="small" />
          ))}
          {emergencyData.allergies.length + emergencyData.conditions.length > 3 && (
            <View style={[styles.moreBadge, { backgroundColor: colors.surfaceSecondary }]}>
              <ThemedText style={[styles.moreText, { color: colors.muted }]}>
                +{emergencyData.allergies.length + emergencyData.conditions.length - 3} more
              </ThemedText>
            </View>
          )}
        </Row>
      )}

      {emergencyData?.primaryContact && (
        <Row gap="xs" align="center" style={[styles.contact, { borderTopColor: colors.border }]}>
          <Ionicons name="call" size={14} color={colors.success} />
          <ThemedText style={[styles.contactText, { color: colors.muted }]} numberOfLines={1}>
            {emergencyData.primaryContact.name} ({emergencyData.primaryContact.relationship})
          </ThemedText>
          <Button
            onPress={() => handleCallContact(emergencyData.primaryContact!)}
            variant="primary"
            style={{ backgroundColor: colors.error }}
          >
            Call
          </Button>
        </Row>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: 0,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  flex1: { flex: 1 },
  header: {
    padding: Spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtext: {
    ...Typography.caption,
  },
  alertBadges: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  moreBadge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  moreText: {
    ...Typography.micro,
  },
  contact: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  contactText: {
    ...Typography.caption,
    flex: 1,
  },
});
