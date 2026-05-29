/**
 * Medical Information Screen
 *
 * Manage medical conditions, allergies, medications, doctor info,
 * insurance, and consent toggles for a child.
 */

import { View, ScrollView, StyleSheet, TextInput, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { MedicalTagInput } from '@/components/child/medical-tag-input';
import { MedicalConsentToggle } from '@/components/child/medical-consent-toggle';
import { ChildScreenState } from '@/components/child/child-screen-state';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useMedicalInfo } from '@/hooks/use-medical-info';

export default function MedicalInfoScreen() {
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    loading,
    status,
    error,
    saving,
    refreshing,
    onRefresh,
    retry,
    conditions,
    allergies,
    medications,
    restrictions,
    doctorName,
    setDoctorName,
    doctorPhone,
    setDoctorPhone,
    insuranceProvider,
    setInsuranceProvider,
    insuranceNumber,
    setInsuranceNumber,
    notes,
    setNotes,
    consents,
    handleConsentToggle,
    handleSave,
    addCondition,
    removeCondition,
    addAllergy,
    removeAllergy,
    addMedication,
    removeMedication,
    addRestriction,
    removeRestriction,
  } = useMedicalInfo();
  const header = (
    <Row gap="sm" align="center" style={styles.header}>
      <Clickable onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Clickable>
      <ThemedText type="title">Medical Information</ThemedText>
    </Row>
  );

  if (loading) {
    return (
      <ChildScreenState
        colors={colors}
        status="loading"
        errorMessage="Failed to load medical information."
        onRetry={retry}
        header={header}
        loadingVariant="form"
      />
    );
  }

  if (status === 'error') {
    return (
      <ChildScreenState
        colors={colors}
        status="error"
        errorMessage={error?.message ?? 'Failed to load medical information.'}
        onRetry={retry}
        header={header}
        loadingVariant="form"
      />
    );
  }

  const inputStyle = [styles.input, { borderColor: colors.border, color: colors.text }];

  return (
    <ChildScreenState
      colors={colors}
      status="ready"
      errorMessage="Failed to load medical information."
      onRetry={retry}
      header={header}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        <ThemedText style={{ color: colors.muted }}>
          Keep medical information up to date for the safety of your child during sessions.
        </ThemedText>

        <SurfaceCard style={styles.noticeCard}>
          <Row gap="sm" align="start">
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.tint} />
            <ThemedText style={[styles.noticeText, { color: colors.muted }]}>
              This information is shared for active coaching and safety only. Assigned coaches can
              view the relevant medical snapshot for active bookings, and supervising club staff
              should only see it when they need to support delivery, a handoff, or an emergency.
            </ThemedText>
          </Row>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Health Conditions</ThemedText>
          <MedicalTagInput
            label="Medical Conditions"
            placeholder="e.g., Asthma, Diabetes"
            items={conditions}
            onAdd={addCondition}
            onRemove={removeCondition}
          />
          <MedicalTagInput
            label="Allergies"
            placeholder="e.g., Peanuts, Penicillin"
            items={allergies}
            onAdd={addAllergy}
            onRemove={removeAllergy}
          />
          <MedicalTagInput
            label="Medications"
            placeholder="e.g., Ventolin inhaler"
            items={medications}
            onAdd={addMedication}
            onRemove={removeMedication}
          />
          <MedicalTagInput
            label="Activity Restrictions"
            placeholder="e.g., No contact sports"
            items={restrictions}
            onAdd={addRestriction}
            onRemove={removeRestriction}
          />
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Doctor Information</ThemedText>
          <View style={styles.field}>
            <ThemedText style={Typography.bodySmallSemiBold}>Doctor Name</ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="e.g. Dr. Patel"
              placeholderTextColor={colors.muted}
              value={doctorName}
              onChangeText={setDoctorName}

            maxLength={20}
          />
          </View>
          <View style={styles.field}>
            <ThemedText style={Typography.bodySmallSemiBold}>Doctor Phone</ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="+44 20 1234 5678"
              placeholderTextColor={colors.muted}
              value={doctorPhone}
              onChangeText={setDoctorPhone}
              keyboardType="phone-pad"

            maxLength={20}
          />
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Insurance</ThemedText>
          <View style={styles.field}>
            <ThemedText style={Typography.bodySmallSemiBold}>Insurance Provider</ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="e.g., Bupa, AXA"
              placeholderTextColor={colors.muted}
              value={insuranceProvider}
              onChangeText={setInsuranceProvider}

            maxLength={100}
          />
          </View>
          <View style={styles.field}>
            <ThemedText style={Typography.bodySmallSemiBold}>Policy Number</ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="Policy number"
              placeholderTextColor={colors.muted}
              value={insuranceNumber}
              onChangeText={setInsuranceNumber}

            maxLength={100}
          />
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Additional Notes</ThemedText>
          <TextInput
            style={[styles.textArea, { borderColor: colors.border, color: colors.text }]}
            placeholder="Any other important medical information..."
            placeholderTextColor={colors.muted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}

            maxLength={500}
          />
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Consents</ThemedText>
          <ThemedText
            style={{ color: colors.muted, ...Typography.small, marginBottom: Spacing.sm }}
          >
            Manage permissions for your child during sessions
          </ThemedText>
          {consents.map((consent) => (
            <MedicalConsentToggle
              key={consent.type}
              consent={consent}
              onToggle={handleConsentToggle}
            />
          ))}
        </SurfaceCard>

        <Button onPress={handleSave} disabled={saving} label={saving ? 'Saving...' : 'Save Medical Information'} />
      </ScrollView>
    </ChildScreenState>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  backButton: { padding: Spacing.xs, marginLeft: -Spacing.xs },
  noticeCard: { padding: Spacing.md },
  noticeText: {
    flex: 1,
    ...Typography.bodySmall,
  },
  section: { gap: Spacing.md },
  field: { gap: Spacing.xs },
  input: { borderWidth: 1.5, borderRadius: Radii.md, padding: Spacing.sm, ...Typography.body },
  textArea: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
