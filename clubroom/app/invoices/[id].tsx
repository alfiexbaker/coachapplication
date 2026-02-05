import { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PageContainer } from '@/components/primitives/page-container';
import { createLogger } from '@/utils/logger';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { InvoicePreview, DownloadButton } from '@/components/invoices';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { invoiceService } from '@/services/invoice-service';
import { Invoice } from '@/constants/types';

const logger = createLogger('InvoiceDetailScreen');

// ============================================================================
// TYPES
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _IoniconsName = keyof typeof Ionicons.glyphMap;

// ============================================================================
// COMPONENT
// ============================================================================

export default function InvoiceDetailScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendEmail, setSendEmail] = useState('');

  const loadInvoice = useCallback(async () => {
    if (!id) return;

    try {
      const data = await invoiceService.getInvoiceById(id);
      setInvoice(data);
    } catch (error) {
      logger.error('Failed to load invoice', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadInvoice();
    }, [loadInvoice])
  );

  const handleSendInvoice = async () => {
    if (!invoice || !sendEmail.trim()) return;

    setActionLoading(true);

    try {
      const result = await invoiceService.sendInvoice(invoice.id, sendEmail.trim());

      if (result.success) {
        Alert.alert('Invoice Sent', `Invoice sent to ${sendEmail}`);
        setShowSendModal(false);
        setSendEmail('');
        loadInvoice();
      } else {
        Alert.alert('Failed', result.error || 'Could not send invoice');
      }
    } catch {
      Alert.alert('Error', 'An error occurred while sending the invoice');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!invoice) return;

    Alert.alert(
      'Mark as Paid',
      'Are you sure you want to mark this invoice as paid?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Paid',
          onPress: async () => {
            setActionLoading(true);
            try {
              await invoiceService.markAsPaid(invoice.id);
              loadInvoice();
            } catch {
              Alert.alert('Error', 'Failed to update invoice');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleVoidInvoice = async () => {
    if (!invoice) return;

    Alert.alert(
      'Void Invoice',
      'Are you sure you want to void this invoice? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Void Invoice',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await invoiceService.voidInvoice(invoice.id, 'Voided by user');
              loadInvoice();
            } catch {
              Alert.alert('Error', 'Failed to void invoice');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <PageContainer header={<PageHeader title="Invoice" showBack />}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Loading invoice...
          </ThemedText>
        </View>
      </PageContainer>
    );
  }

  if (!invoice) {
    return (
      <PageContainer header={<PageHeader title="Invoice" showBack />}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.error} />
          <ThemedText style={[styles.errorText, { color: palette.muted }]}>
            Invoice not found
          </ThemedText>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: palette.tint }]}
            onPress={() => router.back()}
          >
            <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
          </TouchableOpacity>
        </View>
      </PageContainer>
    );
  }

  const isCoach = currentUser?.role === 'COACH' || currentUser?.id === invoice.coachId;
  const canSend = invoice.status === 'DRAFT' && isCoach;
  const canMarkPaid = (invoice.status === 'SENT' || invoice.status === 'DRAFT') && isCoach;
  const canVoid = invoice.status !== 'VOID' && invoice.status !== 'PAID';

  return (
    <PageContainer
      header={
        <PageHeader
          title={invoice.invoiceNumber}
          subtitle={invoiceService.getStatusLabel(invoice.status)}
          showBack
          right={
            <DownloadButton invoice={invoice} variant="icon" size="medium" />
          }
        />
      }
      scrollable={false}
    >
      <InvoicePreview invoice={invoice} />

      {/* Action Buttons */}
      <View style={[styles.actionBar, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
        {actionLoading ? (
          <ActivityIndicator size="small" color={palette.tint} />
        ) : (
          <View style={styles.actionButtons}>
            {/* Download/Share for everyone */}
            <DownloadButton invoice={invoice} variant="secondary" size="medium" />

            {/* Coach-only actions */}
            {canSend && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: palette.tint }]}
                onPress={() => setShowSendModal(true)}
              >
                <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
                <ThemedText style={styles.actionButtonText}>Send</ThemedText>
              </TouchableOpacity>
            )}

            {canMarkPaid && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: palette.success }]}
                onPress={handleMarkPaid}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                <ThemedText style={styles.actionButtonText}>Mark Paid</ThemedText>
              </TouchableOpacity>
            )}

            {canVoid && isCoach && (
              <TouchableOpacity
                style={[styles.voidButton, { borderColor: palette.error }]}
                onPress={handleVoidInvoice}
              >
                <Ionicons name="close-circle-outline" size={18} color={palette.error} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Send Invoice Modal */}
      <Modal
        visible={showSendModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSendModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="title">Send Invoice</ThemedText>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: palette.surfaceSecondary }]}
              onPress={() => setShowSendModal(false)}
            >
              <Ionicons name="close" size={24} color={palette.text} />
            </TouchableOpacity>
          </View>

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
              value={sendEmail}
              onChangeText={setSendEmail}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: palette.tint,
                  opacity: !sendEmail.trim() || actionLoading ? 0.6 : 1,
                },
              ]}
              onPress={handleSendInvoice}
              disabled={!sendEmail.trim() || actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                  <ThemedText style={styles.sendButtonText}>Send Invoice</ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </PageContainer>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
  },
  backButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    marginTop: Spacing.sm,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionBar: {
    padding: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  voidButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },

  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    paddingTop: Spacing.lg,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    marginTop: Spacing.md,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
