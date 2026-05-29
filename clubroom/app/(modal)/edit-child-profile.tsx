import { useRef } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import type { ReactNode } from 'react';

import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
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
    <View
      ref={modalRef}
      accessible
      accessibilityViewIsModal
      accessibilityRole="none"
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      <PageHeader title="Edit Child Profile" showBack centerTitle />
      {content}
    </View>
  );

  if (c.loading) {
    return renderStateShell(<LoadingState variant="form" />);
  }

  if (c.status === 'error' || !c.child) {
    return renderStateShell(
      <ErrorState
        message={c.error?.message ?? 'Failed to load child profile.'}
        onRetry={c.retry}
      />,
    );
  }

  const inputStyle = [styles.input, { borderColor: palette.border, color: palette.text }];
  const textAreaStyle = [styles.textArea, { borderColor: palette.border, color: palette.text }];

  return (
    <View
      ref={modalRef}
      accessible
      accessibilityViewIsModal
      accessibilityRole="none"
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      <PageHeader title={`Edit ${c.child.firstName}`} showBack centerTitle />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Basic Information</ThemedText>

          <View style={styles.field}>
            <ThemedText style={styles.label}>First Name</ThemedText>
            <TextInput
              style={inputStyle}
              value={c.firstName}
              onChangeText={c.setFirstName}
              maxLength={50}
            />
          </View>
          <View style={styles.field}>
            <ThemedText style={styles.label}>Last Name</ThemedText>
            <TextInput
              style={inputStyle}
              value={c.lastName}
              onChangeText={c.setLastName}
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
                    <ThemedText
                      style={[styles.optionText, { color: active ? palette.tint : palette.text }]}
                    >
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
                    <ThemedText
                      style={[styles.optionText, { color: active ? palette.tint : palette.text }]}
                    >
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
                    <ThemedText
                      style={[styles.optionText, { color: active ? palette.tint : palette.text }]}
                    >
                      {positionDisplayLabel(option.key)}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </Row>
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Health & Safety</ThemedText>
          <ThemedText style={[styles.helperText, { color: palette.muted }]}>
            Medical records, emergency contacts, and consent choices are managed in the protected
            child health area.
          </ThemedText>
          <Button
            onPress={c.openMedicalInfo}
            variant="secondary"
            label="Manage Medical Information"
          />
          <Button
            onPress={c.openEmergencyContacts}
            variant="secondary"
            label="Manage Emergency Contacts"
          />
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
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Button
          onPress={c.handleSave}
          disabled={c.saving}
          style={{ flex: 1 }}
          label={c.saving ? 'Saving...' : 'Save Profile'}
        />
      </View>
    </View>
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
  helperText: {
    ...Typography.bodySmall,
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
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
});
