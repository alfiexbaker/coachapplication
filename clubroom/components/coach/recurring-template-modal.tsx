/**
 * RecurringTemplateModal — Composition root for availability template form.
 * Sub-components: TemplateDaySection, TemplateTimeSection, TemplateOptionsSection
 * Hook: useRecurringTemplateForm
 */
import { View, StyleSheet, Modal, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import type { AvailabilityTemplate } from '@/constants/types';
import type { SessionTemplate } from '@/constants/session-types';
import { useTheme } from '@/hooks/useTheme';
import { useRecurringTemplateForm } from '@/hooks/use-recurring-template-form';
import { TemplateDaySection } from './template-day-section';
import { TemplateTimeSection } from './template-time-section';
import { TemplateOptionsSection } from './template-options-section';
import { Row } from '@/components/primitives';

interface RecurringTemplateModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (template: Omit<AvailabilityTemplate, 'id' | 'coachId'>) => Promise<void>;
  onDelete?: (templateId: string) => Promise<void>;
  editingTemplate?: AvailabilityTemplate | null;
  preselectedDay?: number;
  preselectedHour?: number;
  sessionTemplates?: SessionTemplate[];
  onCheckLocationDrift?: (dayOfWeek: number, newLocation: string) => Promise<{
    affectedCount: number;
    affectedBookingIds: string[];
    oldLocation: string;
  } | null>;
  onUpdateBookingLocations?: (bookingIds: string[], newLocation: string) => Promise<void>;
}

export function RecurringTemplateModal({
  visible, onClose, onSave, onDelete, editingTemplate, preselectedDay, preselectedHour,
  sessionTemplates, onCheckLocationDrift, onUpdateBookingLocations,
}: RecurringTemplateModalProps) {
  const { colors: palette } = useTheme();
  const form = useRecurringTemplateForm({
    visible, editingTemplate, preselectedDay, preselectedHour,
    onSave, onDelete, onClose, onCheckLocationDrift, onUpdateBookingLocations,
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={[styles.container, { backgroundColor: palette.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <Row style={[styles.header, { borderBottomColor: palette.border }]}>
          <Clickable onPress={onClose} disabled={form.saving}>
            <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
          </Clickable>
          <ThemedText type="subtitle">
            {form.isEditing ? 'Edit Availability' : form.isQuickAdd ? 'Quick Add Slot' : 'Add Availability'}
          </ThemedText>
          <Clickable onPress={form.handleSave} disabled={form.saving}>
            <ThemedText style={{ ...Typography.bodySemiBold, color: palette.tint }}>
              {form.saving ? 'Saving...' : 'Save'}
            </ThemedText>
          </Clickable>
        </Row>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TemplateDaySection
            isEditing={form.isEditing}
            isQuickAdd={form.isQuickAdd}
            preselectedDay={preselectedDay}
            selectedDays={form.selectedDays}
            onToggleDay={form.toggleDay}
            onApplyPreset={form.applyPreset}
          />

          <TemplateTimeSection
            isEditing={form.isEditing}
            selectedDays={form.selectedDays}
            startTime={form.startTime}
            endTime={form.endTime}
            duration={form.duration}
            onStartTimeChange={form.handleStartTimeChange}
            onEndTimeChange={form.setEndTime}
          />

          <TemplateOptionsSection
            location={form.location}
            onSetLocation={form.setLocation}
            showLocationInput={form.showLocationInput}
            onSelectLocation={form.selectLocation}
            onOpenCustomLocation={form.openCustomLocation}
            sessionTemplates={sessionTemplates}
            sessionTemplateId={form.sessionTemplateId}
            onSelectSessionTemplate={form.selectSessionTemplate}
            maxConcurrent={form.maxConcurrent}
            onSelectMaxConcurrent={form.selectMaxConcurrent}
            bufferMinutes={form.bufferMinutes}
            onSelectBufferMinutes={form.selectBufferMinutes}
            isEditing={form.isEditing}
            isQuickAdd={form.isQuickAdd}
            saving={form.saving}
            canDelete={!!onDelete}
            onDelete={form.handleDelete}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  content: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: Spacing['2xl'] },
});
