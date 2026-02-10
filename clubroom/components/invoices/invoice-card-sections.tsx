import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { invoiceService } from '@/services/invoice-service';
import type { Invoice, InvoiceStatus } from '@/constants/types';
import type { useTheme } from '@/hooks/useTheme';

type ThemeColors = ReturnType<typeof useTheme>['colors'];
type IoniconsName = keyof typeof Ionicons.glyphMap;

// ─── Helpers ────────────────────────────────────────────────────

export function getStatusIcon(status: InvoiceStatus): IoniconsName {
  switch (status) {
    case 'DRAFT': return 'document-outline';
    case 'SENT': return 'paper-plane-outline';
    case 'PAID': return 'checkmark-circle-outline';
    case 'VOID': return 'close-circle-outline';
    default: return 'document-outline';
  }
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── CompactInvoiceRow ──────────────────────────────────────────

export interface CompactInvoiceRowProps {
  invoice: Invoice;
  onPress: () => void;
  palette: ThemeColors;
}

export const CompactInvoiceRow = memo(function CompactInvoiceRow({
  invoice,
  onPress,
  palette,
}: CompactInvoiceRowProps) {
  const statusColor = invoiceService.getStatusColor(invoice.status);

  return (
    <Clickable style={[styles.compactContainer, { borderBottomColor: palette.border }]} onPress={onPress}>
      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      <View style={styles.compactContent}>
        <Row justify="space-between" align="center">
          <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.compactTitle}>
            {invoice.invoiceNumber}
          </ThemedText>
          <ThemedText type="defaultSemiBold">
            {invoiceService.formatAmount(invoice.total)}
          </ThemedText>
        </Row>
        <Row justify="space-between" align="center">
          <ThemedText style={[styles.compactSubtext, { color: palette.muted }]} numberOfLines={1}>
            {invoice.athleteName} - {invoice.sessionType || 'Training'}
          </ThemedText>
          <ThemedText style={[styles.compactDate, { color: palette.muted }]}>
            {formatShortDate(invoice.sessionDate)}
          </ThemedText>
        </Row>
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.muted} />
    </Clickable>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  compactContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  compactTitle: { ...Typography.body, flex: 1, marginRight: Spacing.sm },
  compactSubtext: { ...Typography.small, flex: 1, marginRight: Spacing.sm },
  compactDate: { ...Typography.caption },
});
