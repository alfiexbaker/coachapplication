import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { DateOfBirthField } from '@/components/family/add-child-basic-step-sections';
import { PageHeader } from '@/components/primitives/page-header';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SubmitProgressState,
} from '@/components/ui/screen-states';
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
  const { colors, isDark } = useTheme();
  const editor = useEditChildProfile();
  const modalRef = useRef<View>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  useFocusTrap(modalRef, 'Edit player profile modal');

  const renderShell = (content: ReactNode, title = 'Edit player') => (
    <SafeAreaView
      ref={modalRef}
      accessibilityViewIsModal
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader title={title} showBack centerTitle />
      {content}
    </SafeAreaView>
  );

  if (editor.loading) {
    return renderShell(
      <LoadingState variant="form" accessibilityLabel="Loading player profile editor" />,
    );
  }

  if (editor.status === 'error') {
    return renderShell(
      <ErrorState
        title="Could not load player"
        message={editor.error?.message ?? 'Could not load this player profile.'}
        onRetry={editor.retry}
      />,
    );
  }

  if (editor.access === 'denied') {
    return renderShell(
      <View style={styles.stateContainer}>
        <EmptyState
          context="error"
          title="Profile editing unavailable"
          message="You do not have permission to edit this player."
        />
      </View>,
    );
  }

  if (!editor.child) {
    return renderShell(
      <View style={styles.stateContainer}>
        <EmptyState
          icon="person-outline"
          title="Player not found"
          message="This player profile is no longer available."
        />
      </View>,
    );
  }

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
  ];

  return (
    <SafeAreaView
      ref={modalRef}
      accessibilityViewIsModal
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader title="Edit player" showBack centerTitle />

      {editor.saving ? (
        <SubmitProgressState label="Saving player profile" style={styles.submitState} />
      ) : null}

      {editor.formError ? (
        <Row
          style={[
            styles.errorBanner,
            {
              backgroundColor: withAlpha(colors.error, 0.08),
              borderColor: withAlpha(colors.error, 0.24),
            },
          ]}
          accessibilityRole="alert"
        >
          <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
          <ThemedText style={[styles.errorText, { color: colors.error }]}>
            {editor.formError}
          </ThemedText>
        </Row>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.sectionHeader, { borderBottomColor: colors.border }]}>
            <ThemedText type="subtitle">Player details</ThemedText>
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>First name</ThemedText>
            <TextInput
              style={inputStyle}
              accessibilityLabel="First name"
              value={editor.firstName}
              onChangeText={editor.setFirstName}
              autoComplete="name-given"
              maxLength={50}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Last name</ThemedText>
            <TextInput
              style={inputStyle}
              accessibilityLabel="Last name"
              value={editor.lastName}
              onChangeText={editor.setLastName}
              autoComplete="name-family"
              maxLength={50}
              returnKeyType="next"
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Nickname</ThemedText>
            <TextInput
              style={inputStyle}
              accessibilityLabel="Nickname, optional"
              value={editor.nickname}
              onChangeText={editor.setNickname}
              placeholder="Optional"
              placeholderTextColor={colors.muted}
              maxLength={50}
              returnKeyType="done"
            />
          </View>

          <DateOfBirthField
            dateOfBirth={editor.dateOfBirth}
            showDatePicker={showDatePicker}
            onDateOfBirthChange={editor.setDateOfBirth}
            onShowDatePicker={setShowDatePicker}
            palette={colors}
            isDark={isDark}
          />

          <View style={styles.field}>
            <ThemedText style={styles.label}>Gender</ThemedText>
            <Row wrap gap="xs">
              {editor.genderOptions.map((option) => {
                const selected = editor.gender === option;
                const label = GENDER_LABEL[option] ?? option;
                return (
                  <Clickable
                    key={option}
                    onPress={() => editor.setGender(option)}
                    accessibilityLabel={label}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={[
                      styles.option,
                      {
                        borderColor: selected ? colors.tint : colors.border,
                        backgroundColor: selected ? colors.tint : colors.surface,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.optionText,
                        { color: selected ? colors.onPrimary : colors.text },
                      ]}
                    >
                      {label}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </Row>
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Relationship</ThemedText>
            <Row wrap gap="xs">
              {editor.relationshipOptions.map((option) => {
                const selected = editor.relationship === option;
                const label = RELATIONSHIP_LABEL[option] ?? option;
                return (
                  <Clickable
                    key={option}
                    onPress={() => editor.setRelationship(option)}
                    accessibilityLabel={label}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={[
                      styles.option,
                      {
                        borderColor: selected ? colors.tint : colors.border,
                        backgroundColor: selected ? colors.tint : colors.surface,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.optionText,
                        { color: selected ? colors.onPrimary : colors.text },
                      ]}
                    >
                      {label}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </Row>
          </View>

          <View style={styles.field}>
            <ThemedText style={styles.label}>Preferred position</ThemedText>
            <Row wrap gap="xs">
              {POSITION_OPTIONS_WITH_ROTATE.map((option) => {
                const selected = editor.primaryPosition === option.key;
                return (
                  <Clickable
                    key={option.key ?? 'rotate'}
                    onPress={() => editor.setPrimaryPosition(option.key)}
                    accessibilityLabel={option.label}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={[
                      styles.option,
                      {
                        borderColor: selected ? colors.tint : colors.border,
                        backgroundColor: selected ? colors.tint : colors.surface,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.optionText,
                        { color: selected ? colors.onPrimary : colors.text },
                      ]}
                    >
                      {option.label}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </Row>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Button
          onPress={editor.handleSave}
          disabled={!editor.canSave}
          accessibilityLabel={editor.saving ? 'Saving player profile' : 'Save profile changes'}
          label={editor.saving ? 'Saving…' : 'Save changes'}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stateContainer: { flex: 1 },
  submitState: { marginHorizontal: Spacing.lg, marginTop: Spacing.sm },
  errorBanner: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.md,
  },
  errorText: { flex: 1, ...Typography.small },
  content: {
    gap: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  sectionHeader: {
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  field: { gap: Spacing.xs },
  label: { ...Typography.bodySmallSemiBold },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
  },
  option: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  optionText: { ...Typography.smallSemiBold },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
