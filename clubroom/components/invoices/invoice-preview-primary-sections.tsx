import React from 'react';
import { View } from 'react-native';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { Invoice } from '@/constants/types';
import { invoiceService } from '@/services/invoice-service';
import { getInvoiceStatusColor } from './invoice-card-helpers';

import { formatDate } from './invoice-preview-helpers';
import { styles } from './invoice-preview-styles';

interface InvoiceHeaderProps {
  invoice: Invoice;
  palette: ThemeColors;
}

export const InvoiceHeader = function InvoiceHeader({ invoice, palette }: InvoiceHeaderProps) {
  const statusColor = getInvoiceStatusColor(invoice.status, palette);

  return (
    <Row justify="space-between" align="flex-start" style={styles.header}>
      <View>
        <ThemedText type="display" style={styles.invoiceNumber}>
          {invoice.invoiceNumber}
        </ThemedText>
        <Row
          align="center"
          gap="xxs"
          style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.09) }]}
        >
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <ThemedText style={[styles.statusText, { color: statusColor }]}>
            {invoiceService.getStatusLabel(invoice.status)}
          </ThemedText>
        </Row>
      </View>
      <View style={styles.amountContainer}>
        <ThemedText style={[styles.amountLabel, { color: palette.muted }]}>Total</ThemedText>
        <ThemedText type="display" style={styles.amount}>
          {invoiceService.formatAmount(invoice.total)}
        </ThemedText>
      </View>
    </Row>
  );
};

interface InvoiceDateCardProps {
  invoice: Invoice;
  palette: ThemeColors;
}

const renderInvoiceDateCard = function renderInvoiceDateCard({
  invoice,
  palette,
}: InvoiceDateCardProps) {
  return (
    <SurfaceCard style={styles.card}>
      <Row gap="lg">
        <View style={styles.dateItem}>
          <ThemedText style={[styles.dateLabel, { color: palette.muted }]}>Issued</ThemedText>
          <ThemedText type="defaultSemiBold">{formatDate(invoice.createdAt)}</ThemedText>
        </View>
        {invoice.dueDate && invoice.status !== 'PAID' && invoice.status !== 'VOID' && (
          <View style={styles.dateItem}>
            <ThemedText style={[styles.dateLabel, { color: palette.muted }]}>Due Date</ThemedText>
            <ThemedText type="defaultSemiBold" style={{ color: palette.warning }}>
              {formatDate(invoice.dueDate)}
            </ThemedText>
          </View>
        )}
        {invoice.paidAt && (
          <View style={styles.dateItem}>
            <ThemedText style={[styles.dateLabel, { color: palette.muted }]}>Paid</ThemedText>
            <ThemedText type="defaultSemiBold" style={{ color: palette.success }}>
              {formatDate(invoice.paidAt)}
            </ThemedText>
          </View>
        )}
      </Row>
    </SurfaceCard>
  );
};
export const InvoiceDateCard = renderInvoiceDateCard;

interface InvoicePartiesRowProps {
  invoice: Invoice;
  palette: ThemeColors;
}

const renderInvoicePartiesRow = function renderInvoicePartiesRow({
  invoice,
  palette,
}: InvoicePartiesRowProps) {
  return (
    <Row gap="sm">
      <SurfaceCard style={[styles.card, styles.partyCard]}>
        <ThemedText style={[styles.partyLabel, { color: palette.muted }]}>FROM</ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.partyName}>
          {invoice.coachBusinessName || invoice.coachId}
        </ThemedText>
        {invoice.coachBusinessEmail && (
          <ThemedText style={[styles.partyDetail, { color: palette.muted }]}>
            {invoice.coachBusinessEmail}
          </ThemedText>
        )}
        {invoice.coachBusinessAddress && (
          <ThemedText style={[styles.partyDetail, { color: palette.muted }]}>
            {invoice.coachBusinessAddress}
          </ThemedText>
        )}
      </SurfaceCard>

      <SurfaceCard style={[styles.card, styles.partyCard]}>
        <ThemedText style={[styles.partyLabel, { color: palette.muted }]}>BILL TO</ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.partyName}>
          {invoice.userId}
        </ThemedText>
        {invoice.billingAddress && (
          <ThemedText style={[styles.partyDetail, { color: palette.muted }]}>
            {invoice.billingAddress}
          </ThemedText>
        )}
      </SurfaceCard>
    </Row>
  );
};
export const InvoicePartiesRow = renderInvoicePartiesRow;
