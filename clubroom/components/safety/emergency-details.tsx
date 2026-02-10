import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmergencyContactCard } from '@/components/safety/EmergencyContactCard';
import { MedicalAlertBadge } from '@/components/safety/MedicalAlertBadge';
import { SafetyChecklist } from '@/components/safety/SafetyChecklist';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { AthleteEmergencyQuickView } from '@/services/safety-service';

interface EmergencyDetailsProps {
  data: AthleteEmergencyQuickView;
  onCallContact: (phone: string, name: string) => void;
  onCallDoctor: () => void;
}

export const EmergencyDetails = memo(function EmergencyDetails({ data, onCallContact, onCallDoctor }: EmergencyDetailsProps) {
  const { colors: palette } = useTheme();

  return (
    <>
      {/* Medical Alerts */}
      {data.hasAlerts && (
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <SurfaceCard style={styles.section}>
            <Row align="center" gap="sm">
              <View style={[styles.sectionIcon, { backgroundColor: withAlpha(palette.error, 0.06) }]}>
                <Ionicons name="alert-circle" size={20} color={palette.error} />
              </View>
              <ThemedText type="defaultSemiBold">Medical Alerts</ThemedText>
            </Row>
            <Row wrap gap="xs">
              {data.allergies.map((a, i) => <MedicalAlertBadge key={`allergy-${i}`} type="allergy" label={a} />)}
              {data.conditions.map((c, i) => <MedicalAlertBadge key={`condition-${i}`} type="condition" label={c} />)}
              {data.medications.map((m, i) => <MedicalAlertBadge key={`medication-${i}`} type="medication" label={m} />)}
            </Row>
            {data.restrictions.length > 0 && (
              <Row align="start" gap="sm" style={[styles.restrictionsBox, { backgroundColor: withAlpha(palette.warning, 0.03) }]}>
                <Ionicons name="ban" size={16} color={palette.warning} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.restrictionsLabel, { color: palette.warning }]}>Restrictions</ThemedText>
                  <ThemedText style={styles.restrictionsText}>{data.restrictions.join('; ')}</ThemedText>
                </View>
              </Row>
            )}
            {data.medicalNotes && (
              <Row align="start" gap="sm" style={[styles.notesBox, { backgroundColor: palette.surfaceSecondary }]}>
                <Ionicons name="document-text" size={14} color={palette.muted} />
                <ThemedText style={[styles.notesText, { color: palette.muted }]}>{data.medicalNotes}</ThemedText>
              </Row>
            )}
          </SurfaceCard>
        </Animated.View>
      )}

      {/* Emergency Contacts */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <SurfaceCard style={styles.section}>
          <Row align="center" gap="sm">
            <View style={[styles.sectionIcon, { backgroundColor: withAlpha(palette.success, 0.06) }]}>
              <Ionicons name="call" size={20} color={palette.success} />
            </View>
            <ThemedText type="defaultSemiBold">Emergency Contacts</ThemedText>
            <ThemedText style={[styles.contactCount, { color: palette.muted }]}>{data.allContacts.length}</ThemedText>
          </Row>
          {data.allContacts.length > 0 ? (
            <View style={styles.contactsList}>
              {data.allContacts.map((contact) => (
                <EmergencyContactCard key={contact.id} contact={contact} onCall={() => onCallContact(contact.phone, contact.name)} />
              ))}
            </View>
          ) : (
            <View style={styles.noContactsBox}>
              <Ionicons name="warning" size={24} color={palette.warning} />
              <ThemedText style={{ color: palette.warning, fontWeight: '600' }}>No emergency contacts on file</ThemedText>
              <ThemedText style={[styles.noContactsSubtext, { color: palette.muted }]}>Request parent to add emergency contact information</ThemedText>
            </View>
          )}
        </SurfaceCard>
      </Animated.View>

      {/* Doctor Information */}
      {(data.doctorName || data.doctorPhone) && (
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <SurfaceCard style={styles.section}>
            <Row align="center" gap="sm">
              <View style={[styles.sectionIcon, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                <Ionicons name="medkit" size={20} color={palette.tint} />
              </View>
              <ThemedText type="defaultSemiBold">Doctor Information</ThemedText>
            </Row>
            <Row align="center" gap="md">
              <View style={{ flex: 1 }}>
                {data.doctorName && <ThemedText type="defaultSemiBold">{data.doctorName}</ThemedText>}
                {data.doctorPhone && <ThemedText style={{ color: palette.muted }}>{data.doctorPhone}</ThemedText>}
              </View>
              {data.doctorPhone && (
                <Clickable onPress={onCallDoctor} style={[styles.callButton, { backgroundColor: palette.tint }]}>
                  <Ionicons name="call" size={18} color={palette.onPrimary} />
                </Clickable>
              )}
            </Row>
          </SurfaceCard>
        </Animated.View>
      )}

      {/* Consent Status */}
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <SurfaceCard style={styles.section}>
          <Row align="center" gap="sm">
            <View style={[styles.sectionIcon, { backgroundColor: withAlpha(palette.muted, 0.06) }]}>
              <Ionicons name="shield-checkmark" size={20} color={palette.muted} />
            </View>
            <ThemedText type="defaultSemiBold">Consent Status</ThemedText>
          </Row>
          <Row align="center" justify="between">
            <ThemedText>Emergency Treatment Consent</ThemedText>
            <Row align="center" gap="xxs" style={[styles.consentBadge, { backgroundColor: withAlpha(data.emergencyTreatmentConsent ? palette.success : palette.error, 0.06) }]}>
              <Ionicons name={data.emergencyTreatmentConsent ? 'checkmark-circle' : 'close-circle'} size={16} color={data.emergencyTreatmentConsent ? palette.success : palette.error} />
              <ThemedText style={[styles.consentText, { color: data.emergencyTreatmentConsent ? palette.success : palette.error }]}>
                {data.emergencyTreatmentConsent ? 'Granted' : 'Not Granted'}
              </ThemedText>
            </Row>
          </Row>
        </SurfaceCard>
      </Animated.View>

      {/* Safety Checklist */}
      <Animated.View entering={FadeInDown.delay(250).springify()}>
        <SafetyChecklist hasEmergencyContact={data.allContacts.length > 0} hasEmergencyConsent={data.emergencyTreatmentConsent} hasMedicalInfo={data.hasAlerts} />
      </Animated.View>

      {/* Last Updated */}
      <ThemedText style={[styles.lastUpdated, { color: palette.muted }]}>
        Last updated: {new Date(data.lastUpdated).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </ThemedText>
    </>
  );
});

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  sectionIcon: { width: 36, height: 36, borderRadius: Radii.xl, justifyContent: 'center', alignItems: 'center' },
  contactCount: { marginLeft: 'auto', ...Typography.bodySmallSemiBold },
  restrictionsBox: { padding: Spacing.sm, borderRadius: Radii.md, marginTop: Spacing.xs },
  restrictionsLabel: { ...Typography.caption, marginBottom: Spacing.micro },
  restrictionsText: { ...Typography.bodySmall },
  notesBox: { padding: Spacing.sm, borderRadius: Radii.md },
  notesText: { flex: 1, ...Typography.small },
  contactsList: { gap: Spacing.sm },
  noContactsBox: { alignItems: 'center', gap: Spacing.xs, padding: Spacing.lg },
  noContactsSubtext: { ...Typography.small, textAlign: 'center' },
  callButton: { width: 44, height: 44, borderRadius: Radii.xl, justifyContent: 'center', alignItems: 'center' },
  consentBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  consentText: { ...Typography.caption },
  lastUpdated: { textAlign: 'center', ...Typography.caption, marginTop: Spacing.sm } });
