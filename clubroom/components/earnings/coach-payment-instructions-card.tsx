import { useEffect, useState, startTransition } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/ui/toast';
import { Spacing, Typography, Radii, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Invoice } from '@/constants/types';
import {
  coachPaymentInstructionsService,
  type CoachPaymentInstructions,
} from '@/services/coach-payment-instructions-service';
import { uiFeedback } from '@/services/ui-feedback';

interface CoachPaymentInstructionsCardProps {
  coachId: string;
  coachName?: string;
  invoice?: Invoice | null;
  editable?: boolean;
}

const MODAL_FOOTER_HEIGHT = 96;

function CoachPaymentInstructionsCardInner({
  coachId,
  coachName,
  invoice = null,
  editable = false,
}: CoachPaymentInstructionsCardProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [instructions, setInstructions] = useState<CoachPaymentInstructions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [draft, setDraft] = useState<CoachPaymentInstructions | null>(null);

  const maxLengths = coachPaymentInstructionsService.getMaxLengths();

  useEffect(() => {
    const loadInstructions = async () => {
      if (!coachId) {
        setInstructions(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const result = await coachPaymentInstructionsService.getCoachPaymentInstructions(coachId);
      if (result.success) {
        setInstructions(result.data);
      } else {
        uiFeedback.showToast(result.error.message, 'error');
      }
      setLoading(false);
    };

    startTransition(() => {
      void loadInstructions();
    });
  }, [coachId]);

  const openEdit = () => {
    if (!instructions) return;
    setDraft({ ...instructions });
    setShowEditModal(true);
  };

  const closeEdit = () => {
    Keyboard.dismiss();
    setShowEditModal(false);
  };

  const hasInstructions = Boolean(
    instructions && (instructions.bankTransferDetails.trim() || instructions.paymentNotes.trim()),
  );

  const handleCopyInstructions = async () => {
    if (!instructions) return;

    const text = [
      instructions.payeeName ? `Payee: ${instructions.payeeName}` : null,
      instructions.bankTransferDetails
        ? `Bank details:\n${instructions.bankTransferDetails}`
        : null,
      instructions.paymentNotes || null,
    ]
      .filter(Boolean)
      .join('\n\n');

    if (!text.trim()) {
      showToast('Add payment instructions first', 'warning');
      return;
    }

    try {
      await Clipboard.setStringAsync(text);
      showToast('Payment instructions copied', 'success');
    } catch {
      showToast('Failed to copy instructions', 'error');
    }
  };

  const handleCopyInvoiceMessage = async () => {
    if (!instructions || !invoice) return;
    try {
      const message = coachPaymentInstructionsService.buildInvoiceMessage({
        invoice,
        coachName,
        instructions,
      });
      await Clipboard.setStringAsync(message);
      showToast('Invoice payment message copied', 'success');
    } catch {
      showToast('Failed to copy message', 'error');
    }
  };

  const handleShareInvoiceMessage = async () => {
    if (!instructions || !invoice) return;
    const message = coachPaymentInstructionsService.buildInvoiceMessage({
      invoice,
      coachName,
      instructions,
    });
    try {
      await Share.share({ message });
    } catch {
      // User cancelled share sheet
    }
  };

  const updateDraftField = (field: keyof CoachPaymentInstructions, value: string) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const draftIsValid = (() => {
    if (!draft) return false;
    return Boolean(draft.bankTransferDetails.trim() || draft.paymentNotes.trim());
  })();

  const handleSave = async () => {
    if (!draft) return;

    setSaving(true);
    const result = await coachPaymentInstructionsService.saveCoachPaymentInstructions(draft);
    setSaving(false);

    if (!result.success) {
      showToast(result.error.message, 'error');
      return;
    }

    setInstructions(result.data);
    setShowEditModal(false);
    Keyboard.dismiss();
    showToast('Payment instructions saved', 'success');
  };

  if (!coachId) {
    return null;
  }

  return (
    <>
      <SurfaceCard>
        <Column gap="sm">
          <Row align="center" justify="between" gap="sm">
            <Row align="center" gap="xs" style={styles.flex1}>
              <Ionicons name="business-outline" size={18} color={colors.tint} />
              <ThemedText type="defaultSemiBold">Direct Payment Instructions</ThemedText>
            </Row>
            {editable ? (
              <Clickable onPress={openEdit} accessibilityLabel="Edit payment instructions">
                <Row align="center" gap="xxs">
                  <Ionicons name="create-outline" size={14} color={colors.tint} />
                  <ThemedText
                    style={[Typography.caption, { color: colors.tint, fontWeight: '700' }]}
                  >
                    {hasInstructions ? 'Edit' : 'Set up'}
                  </ThemedText>
                </Row>
              </Clickable>
            ) : null}
          </Row>

          <ThemedText style={[Typography.caption, { color: colors.muted }]}>
            Payments are made directly to the coach (outside the app). Reconciler reminders and
            invoice messages use these details.
          </ThemedText>

          {loading ? (
            <Row align="center" gap="xs">
              <ActivityIndicator size="small" color={colors.tint} />
              <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                Loading payment instructions…
              </ThemedText>
            </Row>
          ) : hasInstructions && instructions ? (
            <Column gap="xs">
              {instructions.payeeName ? (
                <View
                  style={[
                    styles.infoBlock,
                    {
                      backgroundColor: withAlpha(colors.tint, 0.04),
                      borderColor: withAlpha(colors.tint, 0.12),
                    },
                  ]}
                >
                  <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                    Payee
                  </ThemedText>
                  <ThemedText style={[Typography.bodySmall, { color: colors.foreground }]}>
                    {instructions.payeeName}
                  </ThemedText>
                </View>
              ) : null}

              {instructions.bankTransferDetails ? (
                <View
                  style={[
                    styles.infoBlock,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                    Bank details / payment instructions
                  </ThemedText>
                  <ThemedText style={[Typography.bodySmall, { color: colors.foreground }]}>
                    {instructions.bankTransferDetails}
                  </ThemedText>
                </View>
              ) : null}

              {instructions.paymentNotes ? (
                <View
                  style={[
                    styles.infoBlock,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                    Notes
                  </ThemedText>
                  <ThemedText style={[Typography.bodySmall, { color: colors.foreground }]}>
                    {instructions.paymentNotes}
                  </ThemedText>
                </View>
              ) : null}
            </Column>
          ) : (
            <View
              style={[
                styles.emptyBox,
                {
                  backgroundColor: withAlpha(colors.warning, 0.06),
                  borderColor: withAlpha(colors.warning, 0.18),
                },
              ]}
            >
              <Row align="start" gap="xs">
                <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
                <ThemedText style={[Typography.caption, { color: colors.foreground, flex: 1 }]}>
                  No payment instructions set yet. Add your bank details or transfer instructions so
                  invoice/reminder messages are ready to send.
                </ThemedText>
              </Row>
            </View>
          )}

          <Row gap="xs" style={styles.wrapRow}>
            <Button
              onPress={handleCopyInstructions}
              variant="outline"
              style={styles.actionButton}
              accessibilityLabel="Copy direct payment instructions"
              disabled={loading}
              label="Copy Instructions"
            />

            {invoice ? (
              <>
                <Button
                  onPress={handleCopyInvoiceMessage}
                  variant="outline"
                  style={styles.actionButton}
                  accessibilityLabel="Copy invoice payment message"
                  disabled={loading}
                  label="Copy Invoice Message"
                />
                <Button
                  onPress={handleShareInvoiceMessage}
                  variant="secondary"
                  style={styles.actionButton}
                  accessibilityLabel="Share invoice payment message"
                  disabled={loading}
                  label="Share Invoice Message"
                />
              </>
            ) : null}
          </Row>
        </Column>
      </SurfaceCard>

      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeEdit}
      >
        <SafeAreaView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          edges={['top', 'bottom']}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalContainer}
          >
            <Row align="center" justify="between" style={styles.modalHeader}>
              <Column gap="xxs" style={styles.flex1}>
                <ThemedText type="title">Payment Instructions</ThemedText>
                <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                  Used in reconciler reminders and invoice payment messages
                </ThemedText>
              </Column>
              <Clickable
                accessibilityLabel="Close payment instructions editor"
                style={[styles.closeButton, { backgroundColor: colors.surfaceSecondary }]}
                onPress={closeEdit}
              >
                <Ionicons name="close" size={22} color={colors.foreground} />
              </Clickable>
            </Row>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={[
                styles.modalContent,
                {
                  paddingBottom:
                    MODAL_FOOTER_HEIGHT + Math.max(insets.bottom + Spacing.sm, Spacing.xl),
                },
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              showsVerticalScrollIndicator={false}
            >
              <Column gap="sm">
                <Column gap="xxs">
                  <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                    Payee name (optional)
                  </ThemedText>
                  <TextInput
                    value={draft?.payeeName ?? ''}
                    onChangeText={(value) => updateDraftField('payeeName', value)}
                    placeholder="e.g. Alex Smith Coaching"
                    placeholderTextColor={colors.muted}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.foreground,
                      },
                    ]}
                    autoCapitalize="words"
                    returnKeyType="next"
                    maxLength={maxLengths.payeeName}
                  />
                  <ThemedText style={[Typography.micro, { color: colors.muted }]}>
                    {(draft?.payeeName ?? '').length}/{maxLengths.payeeName}
                  </ThemedText>
                </Column>

                <Column gap="xxs">
                  <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                    Bank details / transfer instructions
                  </ThemedText>
                  <TextInput
                    value={draft?.bankTransferDetails ?? ''}
                    onChangeText={(value) => updateDraftField('bankTransferDetails', value)}
                    placeholder={'Bank name\nSort code: 00-00-00\nAccount number: 12345678'}
                    placeholderTextColor={colors.muted}
                    style={[
                      styles.textArea,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.foreground,
                      },
                    ]}
                    multiline
                    textAlignVertical="top"
                    autoCapitalize="sentences"
                    maxLength={maxLengths.bankTransferDetails}
                  />
                  <ThemedText style={[Typography.micro, { color: colors.muted }]}>
                    {(draft?.bankTransferDetails ?? '').length}/{maxLengths.bankTransferDetails}
                  </ThemedText>
                </Column>

                <Column gap="xxs">
                  <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                    Payment notes (optional)
                  </ThemedText>
                  <TextInput
                    value={draft?.paymentNotes ?? ''}
                    onChangeText={(value) => updateDraftField('paymentNotes', value)}
                    placeholder="Reference format, due date wording, or what families should do after sending payment"
                    placeholderTextColor={colors.muted}
                    style={[
                      styles.textAreaSmall,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        color: colors.foreground,
                      },
                    ]}
                    multiline
                    textAlignVertical="top"
                    autoCapitalize="sentences"
                    maxLength={maxLengths.paymentNotes}
                  />
                  <ThemedText style={[Typography.micro, { color: colors.muted }]}>
                    {(draft?.paymentNotes ?? '').length}/{maxLengths.paymentNotes}
                  </ThemedText>
                </Column>

                <View
                  style={[
                    styles.helperBox,
                    {
                      backgroundColor: withAlpha(colors.tint, 0.04),
                      borderColor: withAlpha(colors.tint, 0.12),
                    },
                  ]}
                >
                  <ThemedText style={[Typography.caption, { color: colors.foreground }]}>
                    Families pay you directly. The app only tracks invoices and reconciler status.
                    Reminder and invoice-message copy will include these details automatically.
                  </ThemedText>
                </View>

                {!draftIsValid ? (
                  <ThemedText style={[Typography.caption, { color: colors.error }]}>
                    Add bank details or payment notes before saving.
                  </ThemedText>
                ) : null}
              </Column>
            </ScrollView>

            <Row
              gap="xs"
              style={[
                styles.modalFooter,
                {
                  borderTopColor: colors.border,
                  paddingBottom: Math.max(insets.bottom + Spacing.xs, Spacing.md),
                },
              ]}
            >
              <Button
                onPress={closeEdit}
                variant="outline"
                style={styles.modalActionButton}
                accessibilityLabel="Cancel editing payment instructions"
                label="Cancel"
              />
              <Button
                onPress={handleSave}
                variant="primary"
                style={styles.modalActionButton}
                accessibilityLabel="Save payment instructions"
                disabled={!draftIsValid || saving}
                label={saving ? 'Saving...' : 'Save'}
              />
            </Row>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

export const CoachPaymentInstructionsCard = CoachPaymentInstructionsCardInner;

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  infoBlock: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.xxs,
  },
  emptyBox: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  wrapRow: {
    flexWrap: 'wrap',
  },
  actionButton: {
    minHeight: 36,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  modalScroll: {
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  modalFooter: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    ...Typography.bodySmall,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: Radii.md,
    minHeight: 120,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.bodySmall,
  },
  textAreaSmall: {
    borderWidth: 1,
    borderRadius: Radii.md,
    minHeight: 88,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.bodySmall,
  },
  helperBox: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  modalActionButton: {
    minHeight: 40,
  },
});
