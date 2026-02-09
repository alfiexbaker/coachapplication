/**
 * Invoice Detail Screen
 *
 * Shows invoice preview with send/mark-paid/void actions for coaches.
 * All state/logic in useInvoiceDetail hook.
 */

import { View, StyleSheet, ActivityIndicator, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { InvoicePreview, DownloadButton } from '@/components/invoices';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useInvoiceDetail } from '@/hooks/use-invoice-detail';
import { invoiceService } from '@/services/invoice-service';

export default function InvoiceDetailScreen() {
  const { colors: palette } = useTheme();
  const c = useInvoiceDetail();

  if (c.loading) {
    return (
      <PageContainer header={<PageHeader title="Invoice" showBack />}>
        <View style={styles.centered}><ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>Loading invoice...</ThemedText></View>
      </PageContainer>
    );
  }

  if (!c.invoice) {
    return (
      <PageContainer header={<PageHeader title="Invoice" showBack />}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.error} />
          <ThemedText style={[styles.errorText, { color: palette.muted }]}>Invoice not found</ThemedText>
          <Clickable style={[styles.backButton, { backgroundColor: palette.tint }]} onPress={c.goBack}>
            <ThemedText style={{ color: palette.onPrimary, fontWeight: '600' }}>Go Back</ThemedText>
          </Clickable>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer scrollable={false}
      header={<PageHeader title={c.invoice.invoiceNumber} subtitle={invoiceService.getStatusLabel(c.invoice.status)}
        showBack right={<DownloadButton invoice={c.invoice} variant="icon" size="medium" />} />}>
      <InvoicePreview invoice={c.invoice} />

      <View style={[styles.actionBar, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
        {c.actionLoading ? (
          <ActivityIndicator size="small" color={palette.tint} />
        ) : (
          <View style={styles.actionButtons}>
            <DownloadButton invoice={c.invoice} variant="secondary" size="medium" />
            {c.canSend && (
              <Clickable style={[styles.actionButton, { backgroundColor: palette.tint }]} onPress={c.openSendModal}>
                <Ionicons name="paper-plane-outline" size={18} color={palette.onPrimary} />
                <ThemedText style={[styles.actionText, { color: palette.onPrimary }]}>Send</ThemedText>
              </Clickable>
            )}
            {c.canMarkPaid && (
              <Clickable style={[styles.actionButton, { backgroundColor: palette.success }]} onPress={c.handleMarkPaid}>
                <Ionicons name="checkmark-circle-outline" size={18} color={palette.onPrimary} />
                <ThemedText style={[styles.actionText, { color: palette.onPrimary }]}>Mark Paid</ThemedText>
              </Clickable>
            )}
            {c.canVoid && c.isCoach && (
              <Clickable style={[styles.voidButton, { borderColor: palette.error }]} onPress={c.handleVoidInvoice}>
                <Ionicons name="close-circle-outline" size={18} color={palette.error} />
              </Clickable>
            )}
          </View>
        )}
      </View>

      <Modal visible={c.showSendModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={c.closeSendModal}>
        <View style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="title">Send Invoice</ThemedText>
            <Clickable accessibilityLabel="Close" style={[styles.closeButton, { backgroundColor: palette.surfaceSecondary }]} onPress={c.closeSendModal}>
              <Ionicons name="close" size={24} color={palette.text} />
            </Clickable>
          </View>
          <View style={styles.modalContent}>
            <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>Recipient Email</ThemedText>
            <TextInput style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
              placeholder="email@example.com" placeholderTextColor={palette.muted} keyboardType="email-address"
              autoCapitalize="none" autoCorrect={false} value={c.sendEmail} onChangeText={c.setSendEmail} />
            <Clickable style={[styles.sendButton, { backgroundColor: palette.tint, opacity: !c.sendEmail.trim() || c.actionLoading ? 0.6 : 1 }]}
              onPress={c.handleSendInvoice} disabled={!c.sendEmail.trim() || c.actionLoading}>
              {c.actionLoading ? <ActivityIndicator size="small" color={palette.onPrimary} /> : (
                <><Ionicons name="paper-plane" size={18} color={palette.onPrimary} />
                  <ThemedText style={[styles.sendText, { color: palette.onPrimary }]}>Send Invoice</ThemedText></>
              )}
            </Clickable>
          </View>
        </View>
      </Modal>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  loadingText: { ...Typography.bodySmall },
  errorText: { ...Typography.subheading },
  backButton: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: Radii.md, marginTop: Spacing.sm },
  actionBar: { padding: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  actionButtons: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radii.md },
  actionText: { ...Typography.bodySmallSemiBold },
  voidButton: { width: 44, height: 44, borderRadius: Radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, paddingTop: Spacing.lg },
  closeButton: { width: 36, height: 36, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  modalContent: { padding: Spacing.md, gap: Spacing.sm },
  inputLabel: { ...Typography.bodySmallSemiBold },
  input: { height: 48, borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.md, ...Typography.subheading },
  sendButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: Radii.md, marginTop: Spacing.md },
  sendText: { ...Typography.subheading },
});
