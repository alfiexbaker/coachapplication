/**
 * Edit Child SEN Modal
 *
 * Post-creation editing of disabilities, special needs, and notes.
 * Accessible from the parent's child profile / edit-children section.
 */

import { useRef } from 'react';
import { ScrollView, View, StyleSheet, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { DisabilitySelector, SpecialNeedEntrySection } from '@/components/family/medical-special-needs-form-sections';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useEditChildSen } from '@/hooks/use-edit-child-sen';
import { useFocusTrap } from '@/hooks/use-focus-trap';

export default function EditChildSenScreen() {
  const { colors: palette } = useTheme();
  const c = useEditChildSen();
  const modalRef = useRef<View>(null);
  useFocusTrap(modalRef, 'Edit child special needs modal');

  const renderStateShell = (content: ReactNode) => (
    <SafeAreaView
      ref={modalRef}
      accessible
      accessibilityViewIsModal
      accessibilityRole="none"
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader title="Edit SEN" showBack centerTitle />
      {content}
    </SafeAreaView>
  );

  if (c.loading) {
    return renderStateShell(<LoadingState variant="detail" />);
  }

  if (c.status === 'error' || !c.child) {
    return renderStateShell(
      <ErrorState
        message={c.error?.message ?? 'Failed to load child profile.'}
        onRetry={c.retry}
      />,
    );
  }

  return (
    <SafeAreaView
      ref={modalRef}
      accessible
      accessibilityViewIsModal
      accessibilityRole="none"
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader title={`${c.child.firstName}'s SEN`} showBack centerTitle />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Existing disabilities */}
          {c.child.disabilities.length > 0 && (
            <SurfaceCard style={styles.card}>
              <ThemedText type="heading">Current Disabilities</ThemedText>
              {c.child.disabilities.map((d) => (
                <Row
                  key={d.id}
                  align="center"
                  justify="space-between"
                  style={[styles.itemRow, { borderColor: palette.border }]}
                >
                  <Column flex>
                    <ThemedText style={Typography.bodySemiBold}>{d.type}</ThemedText>
                    {d.description && (
                      <ThemedText style={[Typography.small, { color: palette.muted }]}>
                        {d.description}
                      </ThemedText>
                    )}
                  </Column>
                  <Clickable
                    onPress={() => c.removeDisability(d.id)}
                    accessibilityLabel={`Remove ${d.type}`}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={22} color={palette.error} />
                  </Clickable>
                </Row>
              ))}
            </SurfaceCard>
          )}

          {/* Add disability */}
          <SurfaceCard style={styles.card}>
            <ThemedText type="heading">Add Disability</ThemedText>
            <DisabilitySelector
              disabilities={c.child.disabilities}
              selectedDisabilityType={c.selectedDisabilityType}
              disabilityDescription={c.disabilityDescription}
              diagnosisDate={c.diagnosisDate}
              supportRequired={c.supportRequired}
              commPrefs={c.commPrefs}
              triggers={c.triggers}
              calmingStrategies={c.calmingStrategies}
              onDisabilitiesChange={() => {/* removal handled above */}}
              onSelectedDisabilityTypeChange={c.onSelectedDisabilityTypeChange}
              onDisabilityDescriptionChange={c.onDisabilityDescriptionChange}
              onDiagnosisDateChange={c.onDiagnosisDateChange}
              onSupportRequiredChange={c.onSupportRequiredChange}
              onCommPrefsChange={c.onCommPrefsChange}
              onTriggersChange={c.onTriggersChange}
              onCalmingStrategiesChange={c.onCalmingStrategiesChange}
              onAddDisability={c.addDisability}
              palette={palette}
            />
          </SurfaceCard>

          {/* Special needs */}
          <SurfaceCard style={styles.card}>
            <SpecialNeedEntrySection
              specialNeeds={c.child.specialNeeds}
              snCategory={c.snCategory}
              snName={c.snName}
              snDescription={c.snDescription}
              snSeverity={c.snSeverity}
              snAccommodations={c.snAccommodations}
              snParentHints={c.snParentHints}
              onSnCategoryChange={c.onSnCategoryChange}
              onSnNameChange={c.onSnNameChange}
              onSnDescriptionChange={c.onSnDescriptionChange}
              onSnSeverityChange={c.onSnSeverityChange}
              onSnAccommodationsChange={c.onSnAccommodationsChange}
              onSnParentHintsChange={c.onSnParentHintsChange}
              onAddSpecialNeed={c.addSpecialNeed}
              onRemoveSpecialNeed={c.removeSpecialNeed}
              palette={palette}
            />
          </SurfaceCard>

          {/* Notes */}
          <SurfaceCard style={styles.card}>
            <ThemedText type="heading">Notes for Coaches</ThemedText>

            <View style={styles.field}>
              <ThemedText style={styles.label}>Communication Preferences</ThemedText>
              <TextInput
                style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
                placeholder="How does your child communicate best?"
                placeholderTextColor={palette.muted}
                value={c.communicationNotes}
                onChangeText={c.onCommunicationNotesChange}
                multiline
                numberOfLines={3}

            maxLength={500}
          />
            </View>

            <View style={styles.field}>
              <ThemedText style={styles.label}>Behavioral Considerations</ThemedText>
              <TextInput
                style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
                placeholder="Anything coaches should know?"
                placeholderTextColor={palette.muted}
                value={c.behavioralNotes}
                onChangeText={c.onBehavioralNotesChange}
                multiline
                numberOfLines={3}

            maxLength={500}
          />
            </View>
          </SurfaceCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Save footer */}
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Button
          onPress={c.saveNotes}
          disabled={c.saving}
          style={{ flex: 1 }}
          label={c.saving ? 'Saving...' : 'Save Changes'}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing['2xl'] },
  card: { gap: Spacing.sm },
  itemRow: { paddingVertical: Spacing.xs, borderBottomWidth: 1 },
  field: { gap: Spacing.xs },
  label: { ...Typography.bodySmall, fontWeight: '500' },
  textArea: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
});
