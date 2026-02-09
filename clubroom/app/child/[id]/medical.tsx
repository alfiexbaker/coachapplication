/**
 * Medical Information Screen
 *
 * Manage medical conditions, allergies, medications, doctor info,
 * insurance, and consent toggles for a child.
 */

import { View, ScrollView, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { MedicalTagInput } from '@/components/child/medical-tag-input';
import { MedicalConsentToggle } from '@/components/child/medical-consent-toggle';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useMedicalInfo } from '@/hooks/use-medical-info';

export default function MedicalInfoScreen() {
  const { colors } = useTheme();
  const {
    loading, saving,
    conditions, allergies, medications, restrictions,
    doctorName, setDoctorName, doctorPhone, setDoctorPhone,
    insuranceProvider, setInsuranceProvider, insuranceNumber, setInsuranceNumber,
    notes, setNotes, consents,
    handleConsentToggle, handleSave,
    addCondition, removeCondition, addAllergy, removeAllergy,
    addMedication, removeMedication, addRestriction, removeRestriction,
  } = useMedicalInfo();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.center}><ActivityIndicator size="large" color={colors.tint} /></View>
      </SafeAreaView>
    );
  }

  const inputStyle = [styles.input, { borderColor: colors.border, color: colors.text }];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Row gap="sm" align="center">
          <Clickable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Clickable>
          <ThemedText type="title">Medical Information</ThemedText>
        </Row>

        <ThemedText style={{ color: colors.muted }}>
          Keep medical information up to date for the safety of your child during sessions.
        </ThemedText>

        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Health Conditions</ThemedText>
          <MedicalTagInput label="Medical Conditions" placeholder="e.g., Asthma, Diabetes" items={conditions} onAdd={addCondition} onRemove={removeCondition} />
          <MedicalTagInput label="Allergies" placeholder="e.g., Peanuts, Penicillin" items={allergies} onAdd={addAllergy} onRemove={removeAllergy} />
          <MedicalTagInput label="Medications" placeholder="e.g., Ventolin inhaler" items={medications} onAdd={addMedication} onRemove={removeMedication} />
          <MedicalTagInput label="Activity Restrictions" placeholder="e.g., No contact sports" items={restrictions} onAdd={addRestriction} onRemove={removeRestriction} />
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Doctor Information</ThemedText>
          <View style={styles.field}>
            <ThemedText style={Typography.bodySmallSemiBold}>Doctor Name</ThemedText>
            <TextInput style={inputStyle} placeholder="Dr. John Smith" placeholderTextColor={colors.muted} value={doctorName} onChangeText={setDoctorName} />
          </View>
          <View style={styles.field}>
            <ThemedText style={Typography.bodySmallSemiBold}>Doctor Phone</ThemedText>
            <TextInput style={inputStyle} placeholder="+44 20 1234 5678" placeholderTextColor={colors.muted} value={doctorPhone} onChangeText={setDoctorPhone} keyboardType="phone-pad" />
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Insurance</ThemedText>
          <View style={styles.field}>
            <ThemedText style={Typography.bodySmallSemiBold}>Insurance Provider</ThemedText>
            <TextInput style={inputStyle} placeholder="e.g., Bupa, AXA" placeholderTextColor={colors.muted} value={insuranceProvider} onChangeText={setInsuranceProvider} />
          </View>
          <View style={styles.field}>
            <ThemedText style={Typography.bodySmallSemiBold}>Policy Number</ThemedText>
            <TextInput style={inputStyle} placeholder="Policy number" placeholderTextColor={colors.muted} value={insuranceNumber} onChangeText={setInsuranceNumber} />
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Additional Notes</ThemedText>
          <TextInput
            style={[styles.textArea, { borderColor: colors.border, color: colors.text }]}
            placeholder="Any other important medical information..."
            placeholderTextColor={colors.muted}
            value={notes} onChangeText={setNotes}
            multiline numberOfLines={4}
          />
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Consents</ThemedText>
          <ThemedText style={{ color: colors.muted, ...Typography.small, marginBottom: Spacing.sm }}>
            Manage permissions for your child during sessions
          </ThemedText>
          {consents.map((consent) => (
            <MedicalConsentToggle key={consent.type} consent={consent} onToggle={handleConsentToggle} />
          ))}
        </SurfaceCard>

        <Button onPress={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Medical Information'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  backButton: { padding: Spacing.xs, marginLeft: -Spacing.xs },
  section: { gap: Spacing.md },
  field: { gap: Spacing.xs },
  input: { borderWidth: 1.5, borderRadius: Radii.md, padding: Spacing.sm, ...Typography.body },
  textArea: { borderWidth: 1.5, borderRadius: Radii.md, padding: Spacing.sm, ...Typography.body, minHeight: 100, textAlignVertical: 'top' },
});
