import { useRef } from 'react';
import { ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { MedicalTagInput } from '@/components/child/medical-tag-input';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { POSITION_OPTIONS_WITH_ROTATE } from '@/constants/position-skills';
import { useTheme } from '@/hooks/useTheme';
import { useEditChildProfile } from '@/hooks/use-edit-child-profile';
import { useFocusTrap } from '@/hooks/use-focus-trap';

const GENDER_LABEL: Record<string, string> = {
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
  PREFER_NOT_TO_SAY: 'Prefer not to say',
};

const RELATIONSHIP_LABEL: Record<string, string> = {
  SON: 'Son',
  DAUGHTER: 'Daughter',
  WARD: 'Ward',
  GRANDCHILD: 'Grandchild',
  OTHER: 'Other',
};

export default function EditChildProfileModal() {
  const { colors: palette } = useTheme();
  const c = useEditChildProfile();
  const modalRef = useRef<View>(null);
  useFocusTrap(modalRef, 'Edit child profile modal');
  const positionDisplayLabel = (key: (typeof POSITION_OPTIONS_WITH_ROTATE)[number]['key']) => {
    if (key === null) {
      return 'They rotate';
    }
    if (key === 'ATT') {
      return 'Striker';
    }
    return key;
  };

  const renderStateShell = (content: ReactNode) => (
    <SafeAreaView
      ref={modalRef}
      accessible
      accessibilityViewIsModal
      accessibilityRole="none"
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader title="Edit Child Profile" showBack centerTitle />
      {content}
    </SafeAreaView>
  );

  if (c.loading) {
    return renderStateShell(<LoadingState variant="form" />);
  }

  if (c.status === 'error' || !c.child) {
    return renderStateShell(
      <ErrorState message={c.error?.message ?? 'Failed to load child profile.'} onRetry={c.retry} />,
    );
  }

  const inputStyle = [styles.input, { borderColor: palette.border, color: palette.text }];
  const textAreaStyle = [styles.textArea, { borderColor: palette.border, color: palette.text }];

  return (
    <SafeAreaView
      ref={modalRef}
      accessible
      accessibilityViewIsModal
      accessibilityRole="none"
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader title={`Edit ${c.child.firstName}`} showBack centerTitle />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Basic Information</ThemedText>

          <View style={styles.field}>
            <ThemedText style={styles.label}>First Name</ThemedText>
            <TextInput style={inputStyle} value={c.firstName} onChangeText={c.setFirstName}
            maxLength={50}
          />
          </View>
          <View style={styles.field}>
            <ThemedText style={styles.label}>Last Name</ThemedText>
            <TextInput style={inputStyle} value={c.lastName} onChangeText={c.setLastName}
            maxLength={50}
          />
          </View>
          <View style={styles.field}>
            <ThemedText style={styles.label}>Nickname</ThemedText>
            <TextInput
              style={inputStyle}
              value={c.nickname}
              onChangeText={c.setNickname}
              placeholder="Optional"
              placeholderTextColor={palette.muted}

            maxLength={50}
          />
          </View>
          <View style={styles.field}>
            <ThemedText style={styles.label}>Date of Birth</ThemedText>
            <TextInput
              style={inputStyle}
              value={c.dateOfBirth}
              onChangeText={c.setDateOfBirth}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={palette.muted}

            maxLength={100}
          />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Gender</ThemedText>
            <Row wrap gap="xs">
              {c.genderOptions.map((option) => {
                const active = c.gender === option;
                return (
                <Clickable
                  key={option}
                  onPress={() => c.setGender(option)}
                  accessibilityLabel={`Select gender ${GENDER_LABEL[option] ?? option}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[
                      styles.optionPill,
                      {
                        borderColor: active ? palette.tint : palette.border,
                        backgroundColor: active ? withAlpha(palette.tint, 0.08) : palette.surface,
                      },
                    ]}
                  >
                    <ThemedText style={[styles.optionText, { color: active ? palette.tint : palette.text }]}>
                      {GENDER_LABEL[option]}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </Row>
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Relationship</ThemedText>
            <Row wrap gap="xs">
              {c.relationshipOptions.map((option) => {
                const active = c.relationship === option;
                return (
                  <Clickable
                    key={option}
                    onPress={() => c.setRelationship(option)}
                    style={[
                      styles.optionPill,
                      {
                        borderColor: active ? palette.tint : palette.border,
                        backgroundColor: active ? withAlpha(palette.tint, 0.08) : palette.surface,
                      },
                    ]}
                  >
                    <ThemedText style={[styles.optionText, { color: active ? palette.tint : palette.text }]}>
                      {RELATIONSHIP_LABEL[option]}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </Row>
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Primary Position</ThemedText>
            <Row wrap gap="xs">
              {POSITION_OPTIONS_WITH_ROTATE.map((option) => {
                const active = c.primaryPosition === option.key;
                return (
                  <Clickable
                    key={option.key ?? 'rotate'}
                    onPress={() => c.setPrimaryPosition(option.key)}
                    style={[
                      styles.optionPill,
                      {
                        borderColor: active ? palette.tint : palette.border,
                        backgroundColor: active ? withAlpha(palette.tint, 0.08) : palette.surface,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Set primary position to ${option.label}`}
                    accessibilityState={{ selected: active }}
                  >
                    <ThemedText style={[styles.optionText, { color: active ? palette.tint : palette.text }]}>
                      {positionDisplayLabel(option.key)}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </Row>
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Medical Information</ThemedText>
          <MedicalTagInput
            label="Allergies"
            placeholder="e.g. Peanuts"
            items={c.allergies}
            onAdd={c.addAllergy}
            onRemove={c.removeAllergy}
          />
          <MedicalTagInput
            label="Medical Conditions"
            placeholder="e.g. Asthma"
            items={c.medicalConditions}
            onAdd={c.addMedicalCondition}
            onRemove={c.removeMedicalCondition}
          />
          <MedicalTagInput
            label="Medications"
            placeholder="e.g. Inhaler"
            items={c.medications}
            onAdd={c.addMedication}
            onRemove={c.removeMedication}
          />
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Emergency Contacts</ThemedText>
          <View style={styles.field}>
            <ThemedText style={styles.label}>Primary Contact Name</ThemedText>
            <TextInput
              style={inputStyle}
              value={c.emergencyContactName}
              onChangeText={c.setEmergencyContactName}

            maxLength={50}
          />
          </View>
          <View style={styles.field}>
            <ThemedText style={styles.label}>Primary Contact Phone</ThemedText>
            <TextInput
              style={inputStyle}
              value={c.emergencyContactPhone}
              onChangeText={c.setEmergencyContactPhone}
              keyboardType="phone-pad"

            maxLength={20}
          />
          </View>
          <View style={styles.field}>
            <ThemedText style={styles.label}>Primary Contact Relation</ThemedText>
            <TextInput
              style={inputStyle}
              value={c.emergencyContactRelation}
              onChangeText={c.setEmergencyContactRelation}

            maxLength={100}
          />
          </View>
          <View style={styles.field}>
            <ThemedText style={styles.label}>Secondary Contact Name</ThemedText>
            <TextInput
              style={inputStyle}
              value={c.secondaryEmergencyName}
              onChangeText={c.setSecondaryEmergencyName}
              placeholder="Optional"
              placeholderTextColor={palette.muted}

            maxLength={50}
          />
          </View>
          <View style={styles.field}>
            <ThemedText style={styles.label}>Secondary Contact Phone</ThemedText>
            <TextInput
              style={inputStyle}
              value={c.secondaryEmergencyPhone}
              onChangeText={c.setSecondaryEmergencyPhone}
              keyboardType="phone-pad"
              placeholder="Optional"
              placeholderTextColor={palette.muted}

            maxLength={20}
          />
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Notes for Coaches</ThemedText>
          <View style={styles.field}>
            <ThemedText style={styles.label}>Communication Notes</ThemedText>
            <TextInput
              style={textAreaStyle}
              value={c.communicationNotes}
              onChangeText={c.setCommunicationNotes}
              multiline

            maxLength={500}
          />
          </View>
          <View style={styles.field}>
            <ThemedText style={styles.label}>Behavioral Notes</ThemedText>
            <TextInput
              style={textAreaStyle}
              value={c.behavioralNotes}
              onChangeText={c.setBehavioralNotes}
              multiline

            maxLength={500}
          />
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Consents</ThemedText>
          <Row justify="between" align="center" style={styles.consentRow}>
            <ThemedText style={styles.label}>Photo Consent</ThemedText>
            <Switch value={c.photoConsent} onValueChange={c.setPhotoConsent} />
          </Row>
          <Row justify="between" align="center" style={styles.consentRow}>
            <ThemedText style={styles.label}>Video Consent</ThemedText>
            <Switch value={c.videoConsent} onValueChange={c.setVideoConsent} />
          </Row>
          <Row justify="between" align="center" style={styles.consentRow}>
            <ThemedText style={styles.label}>Social Media Consent</ThemedText>
            <Switch value={c.socialMediaConsent} onValueChange={c.setSocialMediaConsent} />
          </Row>
          <Row justify="between" align="center" style={styles.consentRow}>
            <ThemedText style={styles.label}>Emergency Treatment Consent</ThemedText>
            <Switch value={c.emergencyTreatmentConsent} onValueChange={c.setEmergencyTreatmentConsent} />
          </Row>
        </SurfaceCard>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Button onPress={c.handleSave} disabled={c.saving} style={{ flex: 1 }}>
          {c.saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing['2xl'] },
  section: { gap: Spacing.sm },
  field: { gap: Spacing.xs },
  label: { ...Typography.bodySmallSemiBold },
  input: { borderWidth: 1.5, borderRadius: Radii.md, padding: Spacing.sm, ...Typography.body },
  textArea: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  optionPill: {
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  optionText: {
    ...Typography.caption,
  },
  consentRow: {
    minHeight: 44,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
});
