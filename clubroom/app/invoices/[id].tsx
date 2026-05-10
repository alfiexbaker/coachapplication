/**
 * Invoice Detail Screen
 *
 * Shows invoice preview with send/mark-paid/void actions for coaches.
 * All state/logic in useInvoiceDetail hook.
 */

import { View, StyleSheet, Modal, TextInput, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  SubmitProgressState,
} from '@/components/ui/screen-states';
import { InvoicePreview, DownloadButton } from '@/components/invoices';
import { CoachPaymentInstructionsCard } from '@/components/earnings';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useInvoiceDetail } from '@/hooks/use-invoice-detail';
import { invoiceService } from '@/services/invoice-service';

export default function InvoiceDetailScreen() {
  const { colors: palette } = useTheme();
  const c = useInvoiceDetail();

  if (c.status === 'loading') {
    return (
      <PageContainer header={<PageHeader title="Invoice" showBack />}>
        <LoadingState variant="detail" />
      </PageContainer>
    );
  }

  if (c.status === 'error') {
    return (
      <PageContainer header={<PageHeader title="Invoice" showBack />}>
        <ErrorState
          message={c.error?.message || 'Failed to load invoice details.'}
          onRetry={c.retry}
        />
      </PageContainer>
    );
  }

  if (c.status === 'empty' || !c.invoice) {
    return (
      <PageContainer header={<PageHeader title="Invoice" showBack />}>
        <EmptyState
          icon="receipt-outline"
          title="Invoice not found"
          message="This invoice may have been removed or is no longer available."
          actionLabel="Go Back"
          onPressAction={c.goBack}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      scrollable={false}
      header={
        <PageHeader
          title={c.invoice.invoiceNumber}
          subtitle={invoiceService.getStatusLabel(c.invoice.status)}
          showBack
          right={<DownloadButton invoice={c.invoice} variant="icon" size="medium" />}
        />
      }
    >
      <InvoicePreview invoice={c.invoice} />

      <View style={styles.instructionsSection}>
        <CoachPaymentInstructionsCard
          coachId={c.invoice.coachId}
          invoice={c.invoice}
          editable={c.isCoach}
        />
      </View>

      <View
        style={[
          styles.actionBar,
          { backgroundColor: palette.background, borderTopColor: palette.border },
        ]}
      >
        {c.actionLoading ? (
          <SubmitProgressState label="Updating invoice..." style={styles.actionProgress} />
        ) : (
          <Row gap="sm" align="center" style={styles.actionButtons}>
            <DownloadButton invoice={c.invoice} variant="secondary" size="medium" />
            {c.canSend && (
              <Clickable
                style={[styles.actionButton, { backgroundColor: palette.tint }]}
                onPress={c.openSendModal}
              >
                <Row align="center" gap="xs">
                  <Ionicons name="paper-plane-outline" size={18} color={palette.onPrimary} />
                  <ThemedText style={[styles.actionText, { color: palette.onPrimary }]}>
                    Send
                  </ThemedText>
                </Row>
              </Clickable>
            )}
            {c.canMarkPaid && (
              <Clickable
                style={[styles.actionButton, { backgroundColor: palette.success }]}
                onPress={c.handleMarkPaid}
              >
                <Row align="center" gap="xs">
                  <Ionicons name="checkmark-circle-outline" size={18} color={palette.onPrimary} />
                  <ThemedText style={[styles.actionText, { color: palette.onPrimary }]}>
                    Mark Paid
                  </ThemedText>
                </Row>
              </Clickable>
            )}
            {c.canPay && (
              <Clickable
                style={[styles.actionButton, { backgroundColor: palette.tint }]}
                onPress={c.handlePayInvoice}
              >
                <Row align="center" gap="xs">
                  <Ionicons name="card-outline" size={18} color={palette.onPrimary} />
                  <ThemedText style={[styles.actionText, { color: palette.onPrimary }]}>
                    Pay Now
                  </ThemedText>
                </Row>
              </Clickable>
            )}
            {c.canVoid && c.isCoach && (
              <Clickable
                style={[styles.voidButton, { borderColor: palette.error }]}
                onPress={c.handleVoidInvoice}
              >
                <Ionicons name="close-circle-outline" size={18} color={palette.error} />
              </Clickable>
            )}
          </Row>
        )}
      </View>

      <Modal
        visible={c.showSendModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          Keyboard.dismiss();
          c.closeSendModal();
        }}
      >
        <View style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <Row align="center" justify="between" style={styles.modalHeader}>
            <ThemedText type="title">Send Invoice</ThemedText>
            <Clickable
              accessibilityLabel="Close"
              style={[styles.closeButton, { backgroundColor: palette.surfaceSecondary }]}
              onPress={c.closeSendModal}
            >
              <Ionicons name="close" size={24} color={palette.text} />
            </Clickable>
          </Row>
          <View style={styles.modalContent}>
            <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
              Recipient Email
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  color: palette.text,
                },
              ]}
              placeholder="email@example.com"
              placeholderTextColor={palette.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={c.sendEmail}
              onChangeText={c.setSendEmail}
              maxLength={100}
            />
            <Clickable
              style={[
                styles.sendButton,
                {
                  backgroundColor: palette.tint,
                  opacity: !c.sendEmail.trim() || c.actionLoading ? 0.6 : 1,
                },
              ]}
              onPress={c.handleSendInvoice}
              disabled={!c.sendEmail.trim() || c.actionLoading}
            >
              <Row align="center" justify="center" gap="xs">
                {!c.actionLoading ? (
                  <Ionicons name="paper-plane" size={18} color={palette.onPrimary} />
                ) : null}
                <ThemedText style={[styles.sendText, { color: palette.onPrimary }]}>
                  {c.actionLoading ? 'Sending...' : 'Send Invoice'}
                </ThemedText>
              </Row>
            </Clickable>
          </View>
        </View>
      </Modal>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  actionBar: { padding: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  actionProgress: { marginVertical: 0 },
  instructionsSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  actionButtons: {},
  actionButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  actionText: { ...Typography.bodySmallSemiBold },
  voidButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  modalContainer: { flex: 1 },
  modalHeader: { padding: Spacing.md, paddingTop: Spacing.lg },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: { padding: Spacing.md, gap: Spacing.sm },
  inputLabel: { ...Typography.bodySmallSemiBold },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.subheading,
  },
  sendButton: { paddingVertical: Spacing.md, borderRadius: Radii.md, marginTop: Spacing.md },
  sendText: { ...Typography.subheading },
});
