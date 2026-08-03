import { useRef } from 'react';
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

import {
  DisabilitySelector,
  SpecialNeedEntrySection,
} from '@/components/family/medical-special-needs-form-sections';
import { Button } from '@/components/primitives/button';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SubmitProgressState,
} from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useEditChildSen } from '@/hooks/use-edit-child-sen';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { useTheme } from '@/hooks/useTheme';

export default function EditChildSenScreen() {
  const { colors } = useTheme();
  const editor = useEditChildSen();
  const modalRef = useRef<View>(null);
  useFocusTrap(modalRef, 'Player support modal');

  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      ref={modalRef}
      accessibilityViewIsModal
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader title="Player support" showBack centerTitle />
      {content}
    </SafeAreaView>
  );

  if (editor.loading) {
    return renderShell(
      <LoadingState variant="form" accessibilityLabel="Loading player support editor" />,
    );
  }

  if (editor.status === 'error') {
    return renderShell(
      <ErrorState
        title="Could not load player support"
        message={editor.error?.message ?? 'Could not load this player support profile.'}
        onRetry={editor.retry}
      />,
    );
  }

  if (editor.access === 'denied') {
    return renderShell(
      <View style={styles.stateContainer}>
        <EmptyState
          context="error"
          title="Support editing unavailable"
          message="You do not have permission to edit this player’s support information."
        />
      </View>,
    );
  }

  if (editor.access === 'not_found' || !editor.child) {
    return renderShell(
      <View style={styles.stateContainer}>
        <EmptyState
          icon="person-outline"
          title="Player not found"
          message="This player support profile is no longer available."
        />
      </View>,
    );
  }

  const textAreaStyle = [
    styles.textArea,
    { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface },
  ];

  return (
    <SafeAreaView
      ref={modalRef}
      accessibilityViewIsModal
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader title="Player support" showBack centerTitle />

      {editor.saving ? (
        <SubmitProgressState label="Saving player support" style={styles.submitState} />
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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText style={[styles.intro, { color: colors.muted }]}>
            Add only what coaches need to support this player.
          </ThemedText>

          <View style={styles.section}>
            <DisabilitySelector
              disabilities={editor.disabilities}
              selectedDisabilityType={editor.selectedDisabilityType}
              disabilityDescription={editor.disabilityDescription}
              diagnosisDate={editor.diagnosisDate}
              supportRequired={editor.supportRequired}
              commPrefs={editor.commPrefs}
              triggers={editor.triggers}
              calmingStrategies={editor.calmingStrategies}
              onDisabilitiesChange={editor.onDisabilitiesChange}
              onSelectedDisabilityTypeChange={editor.onSelectedDisabilityTypeChange}
              onDisabilityDescriptionChange={editor.onDisabilityDescriptionChange}
              onDiagnosisDateChange={editor.onDiagnosisDateChange}
              onSupportRequiredChange={editor.onSupportRequiredChange}
              onCommPrefsChange={editor.onCommPrefsChange}
              onTriggersChange={editor.onTriggersChange}
              onCalmingStrategiesChange={editor.onCalmingStrategiesChange}
              onAddDisability={editor.addDisability}
              palette={colors}
            />
          </View>

          <View style={[styles.section, styles.dividedSection, { borderTopColor: colors.border }]}>
            <SpecialNeedEntrySection
              specialNeeds={editor.specialNeeds}
              snCategory={editor.snCategory}
              snName={editor.snName}
              snDescription={editor.snDescription}
              snSeverity={editor.snSeverity}
              snAccommodations={editor.snAccommodations}
              snParentHints={editor.snParentHints}
              onSnCategoryChange={editor.onSnCategoryChange}
              onSnNameChange={editor.onSnNameChange}
              onSnDescriptionChange={editor.onSnDescriptionChange}
              onSnSeverityChange={editor.onSnSeverityChange}
              onSnAccommodationsChange={editor.onSnAccommodationsChange}
              onSnParentHintsChange={editor.onSnParentHintsChange}
              onAddSpecialNeed={editor.addSpecialNeed}
              onCancelSpecialNeed={editor.cancelSpecialNeed}
              onRemoveSpecialNeed={editor.removeSpecialNeed}
              palette={colors}
            />
          </View>

          <View style={[styles.section, styles.dividedSection, { borderTopColor: colors.border }]}>
            <ThemedText type="subtitle">Coach guidance</ThemedText>

            <View style={styles.field}>
              <ThemedText style={styles.label}>Communication</ThemedText>
              <TextInput
                style={textAreaStyle}
                accessibilityLabel="Communication guidance, optional"
                placeholder="How should coaches communicate?"
                placeholderTextColor={colors.muted}
                value={editor.communicationNotes}
                onChangeText={editor.onCommunicationNotesChange}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
            </View>

            <View style={styles.field}>
              <ThemedText style={styles.label}>Behaviour and regulation</ThemedText>
              <TextInput
                style={textAreaStyle}
                accessibilityLabel="Behaviour and regulation guidance, optional"
                placeholder="Triggers, routines or responses that help"
                placeholderTextColor={colors.muted}
                value={editor.behavioralNotes}
                onChangeText={editor.onBehavioralNotesChange}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Button
          onPress={editor.saveSupport}
          disabled={!editor.canSave}
          accessibilityLabel={editor.saving ? 'Saving player support' : 'Save support changes'}
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  intro: { ...Typography.small },
  section: { gap: Spacing.md },
  dividedSection: {
    paddingTop: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  field: { gap: Spacing.xs },
  label: { ...Typography.bodySmallSemiBold },
  textArea: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
