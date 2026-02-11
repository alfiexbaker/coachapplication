/**
 * TimeOffSheet — Composition root for time off bottom sheet.
 * Sub-components: TimeOffFormStep, TimeOffConfirmStep, TimeOffRemoveStep
 * Hook: useTimeOffForm
 */
import { View, StyleSheet, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import type { AvailabilityOverride } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { useTimeOffForm } from '@/hooks/use-time-off-form';
import { TimeOffFormStep } from './time-off-form-step';
import { TimeOffConfirmStep } from './time-off-confirm-step';
import { TimeOffRemoveStep } from './time-off-remove-step';
import { Row } from '@/components/primitives';

interface TimeOffSheetProps {
  visible: boolean;
  onClose: () => void;
  coachId: string;
  preselectedDate?: string;
  existingOverride?: AvailabilityOverride | null;
  onSaved: () => void | Promise<void>;
}

export function TimeOffSheet({
  visible,
  onClose,
  coachId,
  preselectedDate,
  existingOverride,
  onSaved,
}: TimeOffSheetProps) {
  const { colors: palette } = useTheme();
  const form = useTimeOffForm({
    visible,
    coachId,
    preselectedDate,
    existingOverride,
    onClose,
    onSaved,
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={form.handleClose}>
      <KeyboardAvoidingView
        style={[styles.overlay, { backgroundColor: withAlpha(palette.text, 0.4) }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: palette.surface }]}>
          <View style={[styles.handle, { backgroundColor: palette.border }]} />

          <Row style={styles.header}>
            <ThemedText type="subtitle">
              {form.step === 'confirmRemove'
                ? 'Remove Time Off'
                : form.isEditing
                  ? 'Time Off'
                  : 'Take Time Off'}
            </ThemedText>
            <Clickable
              onPress={form.handleClose}
              disabled={form.removing}
              hitSlop={8}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={palette.muted} />
            </Clickable>
          </Row>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {form.step === 'confirmRemove' && form.existingOverride && (
              <TimeOffRemoveStep
                removeDate={form.removeDate}
                existingOverride={form.existingOverride}
                removing={form.removing}
                onConfirmRemove={form.handleRemoveConfirm}
                onBack={() => form.goToStep('form')}
              />
            )}

            {form.step === 'form' && (
              <TimeOffFormStep
                isEditing={form.isEditing}
                mode={form.mode}
                startDate={form.startDate}
                endDate={form.endDate}
                reason={form.reason}
                isSameDay={form.isSameDay}
                dayCount={form.dayCount}
                checking={form.checking}
                quickDates={form.quickDates}
                onSelectMode={form.selectMode}
                onSelectQuickDate={form.selectQuickDate}
                onAdjustDate={form.adjustDate}
                onSelectReason={form.selectReason}
                onCheckConflicts={form.handleCheckConflicts}
                onGoToRemove={() => form.goToStep('confirmRemove')}
              />
            )}

            {form.step === 'confirm' && (
              <TimeOffConfirmStep
                startDate={form.startDate}
                endDate={form.endDate}
                isSameDay={form.isSameDay}
                dayCount={form.dayCount}
                reason={form.reason}
                conflicts={form.conflicts}
                saving={form.saving}
                onSave={form.handleSave}
                onBack={() => form.goToStep('form')}
              />
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
    maxHeight: '85%',
  },
  handle: {
    width: 36,
    height: Spacing.xxs,
    borderRadius: Spacing.micro,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  header: { justifyContent: 'space-between', alignItems: 'center' },
});
