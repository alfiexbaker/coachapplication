/**
 * Cancel Flow Modal — Composition root.
 * Full cancellation flow used by both parents and coaches.
 */
import { View, StyleSheet, TextInput, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, Components, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { createModalStyles } from '@/constants/styles';
import { useCancelFlow } from '@/hooks/use-cancel-flow';
import { SessionInfoCard, RefundBanner, ReasonCard } from './cancel-flow-cards';
import type { Booking } from '@/constants/app-types';
import { Row } from '@/components/primitives';

export type { CancellationReason } from '@/hooks/use-cancel-flow';

export interface CancelFlowProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  booking: Booking;
  userRole: 'coach' | 'parent';
  onCancelled: () => void;
}

export default function CancelFlow({ visible, onClose, bookingId, booking, userRole, onCancelled }: CancelFlowProps) {
  const { colors, scheme } = useTheme();
  const ModalStyles = createModalStyles(colors);
  const {
    loading, submitting, reason, setReason, note, setNote, refundCalc,
    reasons, isCoachCancelling, hoursUntil, canConfirm, handleConfirm,
  } = useCancelFlow({ visible, bookingId, booking, userRole, onCancelled });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={ModalStyles.handle} />

        {/* Header */}
        <Row style={styles.modalHeader}>
          <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Cancel session</ThemedText>
          <Clickable accessibilityLabel="Close" onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surface }]}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Clickable>
        </Row>

        {loading ? (
          <View style={styles.loadingArea}><ActivityIndicator size="large" color={colors.text} /></View>
        ) : (
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <SessionInfoCard booking={booking} colors={colors} scheme={scheme} />

            {/* Time context */}
            <Row style={styles.timeContext}>
              <Ionicons name="time-outline" size={16} color={colors.muted} />
              <ThemedText style={[styles.timeContextText, { color: colors.muted }]}>
                {hoursUntil < 1 ? 'Less than 1 hour until session' : hoursUntil < 24 ? `${Math.round(hoursUntil)} hours until session` : `${Math.round(hoursUntil / 24)} days until session`}
              </ThemedText>
            </Row>

            {/* Refund banner (parent only) */}
            {!isCoachCancelling && refundCalc && <RefundBanner calculation={refundCalc} colors={colors} />}

            {/* Coach cancellation warning */}
            {isCoachCancelling && (
              <Row style={[styles.coachNote, { backgroundColor: withAlpha(colors.warning, 0.07) }]}>
                <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
                <ThemedText style={[styles.coachNoteText, { color: colors.muted }]}>
                  Cancelling as a coach will issue a full refund to the parent. Frequent cancellations may affect your profile rating.
                </ThemedText>
              </Row>
            )}

            {/* Reason selection */}
            <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>
              Why are you cancelling?{isCoachCancelling ? ' (required)' : ''}
            </ThemedText>
            <View style={styles.reasonsGrid}>
              {reasons.map((opt) => (
                <ReasonCard key={opt.key} option={opt} selected={reason === opt.key} onPress={() => setReason(opt.key)} colors={colors} />
              ))}
            </View>

            {/* Optional note */}
            <ThemedText style={[styles.sectionLabel, { color: colors.text }]}>Add a note (optional)</ThemedText>
            <TextInput
              style={[styles.noteInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              value={note} onChangeText={setNote} placeholder="Any additional details..."
              placeholderTextColor={colors.border} multiline numberOfLines={3} textAlignVertical="top"
            />

            {/* Action buttons */}
            <Row style={styles.buttonsRow}>
              <Clickable style={[styles.keepButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={onClose}>
                <ThemedText style={[styles.keepButtonText, { color: colors.text }]}>Keep Session</ThemedText>
              </Clickable>
              <Clickable
                style={[styles.confirmButton, { backgroundColor: colors.error }, (!canConfirm || submitting) ? styles.confirmButtonDisabled : undefined]}
                onPress={handleConfirm} disabled={!canConfirm || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <ThemedText style={[styles.confirmButtonText, { color: colors.surface }]}>Confirm Cancel</ThemedText>
                )}
              </Clickable>
            </Row>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1 },
  modalHeader: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm },
  modalTitle: { ...Typography.title },
  closeButton: { width: 44, height: 44, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  loadingArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalScroll: { flex: 1 },
  modalScrollContent: { paddingHorizontal: Spacing.sm },
  timeContext: { alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  timeContextText: { ...Typography.small },
  coachNote: { gap: Spacing.xs, borderRadius: Radii.card, padding: Spacing.sm, marginBottom: Spacing.md },
  coachNoteText: { flex: 1, ...Typography.small },
  sectionLabel: { ...Typography.bodySemiBold, marginBottom: Spacing.xs },
  reasonsGrid: { gap: Spacing.xs, marginBottom: Spacing.md },
  noteInput: { borderRadius: Radii.md, borderWidth: 1, padding: Spacing.sm, minHeight: 80, ...Typography.body, marginBottom: Spacing.md },
  buttonsRow: { gap: Spacing.sm },
  keepButton: { flex: 1, height: Components.button.height, borderRadius: Components.button.borderRadius, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  keepButtonText: { ...Typography.bodySemiBold },
  confirmButton: { flex: 1, height: Components.button.height, borderRadius: Components.button.borderRadius, alignItems: 'center', justifyContent: 'center' },
  confirmButtonDisabled: { opacity: 0.5 },
  confirmButtonText: { ...Typography.bodySemiBold },
  bottomSpacer: { height: Spacing.lg * 2 },
});
