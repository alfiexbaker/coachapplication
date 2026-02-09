import { ScrollView } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';
import { Invoice } from '@/constants/types';

import {
  InvoiceHeader,
  InvoiceDateCard,
  InvoicePartiesRow,
  InvoiceSessionDetails,
  InvoicePricingCard,
  InvoiceVoidCard,
  InvoiceSentInfo,
  styles,
} from './invoice-preview-sections';

interface InvoicePreviewProps {
  invoice: Invoice;
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const { colors: palette } = useTheme();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <InvoiceHeader invoice={invoice} palette={palette} />

      <InvoiceDateCard invoice={invoice} palette={palette} />

      <InvoicePartiesRow invoice={invoice} palette={palette} />

      <InvoiceSessionDetails invoice={invoice} palette={palette} />

      <InvoicePricingCard invoice={invoice} palette={palette} />

      {invoice.notes && (
        <SurfaceCard style={styles.card}>
          <ThemedText style={[styles.sectionTitle, { color: palette.muted }]}>NOTES</ThemedText>
          <ThemedText style={{ lineHeight: 20 }}>{invoice.notes}</ThemedText>
        </SurfaceCard>
      )}

      {invoice.status === 'VOID' && invoice.voidReason && (
        <InvoiceVoidCard
          voidReason={invoice.voidReason}
          voidedAt={invoice.voidedAt}
          palette={palette}
        />
      )}

      {invoice.sentAt && invoice.sentTo && (
        <InvoiceSentInfo sentTo={invoice.sentTo} sentAt={invoice.sentAt} palette={palette} />
      )}
    </ScrollView>
  );
}
