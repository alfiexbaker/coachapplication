import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Invoice, InvoiceStatus } from '@/constants/types';
import { invoiceService } from '@/services/invoice-service';

// ============================================================================
// TYPES
// ============================================================================

interface InvoiceCardProps {
  invoice: Invoice;
  compact?: boolean;
  onPress?: () => void;
}

type IoniconsName = keyof typeof Ionicons.glyphMap;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusIcon(status: InvoiceStatus): IoniconsName {
  switch (status) {
    case 'DRAFT':
      return 'document-outline';
    case 'SENT':
      return 'paper-plane-outline';
    case 'PAID':
      return 'checkmark-circle-outline';
    case 'VOID':
      return 'close-circle-outline';
    default:
      return 'document-outline';
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export function InvoiceCard({ invoice, compact = false, onPress }: InvoiceCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const statusColor = invoiceService.getStatusColor(invoice.status);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/invoices/${invoice.id}`);
    }
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, { borderBottomColor: palette.border }]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <View style={styles.compactContent}>
          <View style={styles.compactRow}>
            <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.compactTitle}>
              {invoice.invoiceNumber}
            </ThemedText>
            <ThemedText type="defaultSemiBold">
              {invoiceService.formatAmount(invoice.total)}
            </ThemedText>
          </View>
          <View style={styles.compactRow}>
            <ThemedText style={[styles.compactSubtext, { color: palette.muted }]} numberOfLines={1}>
              {invoice.athleteName} - {invoice.sessionType || 'Training'}
            </ThemedText>
            <ThemedText style={[styles.compactDate, { color: palette.muted }]}>
              {formatShortDate(invoice.sessionDate)}
            </ThemedText>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.muted} />
      </TouchableOpacity>
    );
  }

  return (
    <SurfaceCard style={styles.card} onPress={handlePress}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <Ionicons name={getStatusIcon(invoice.status)} size={14} color={statusColor} />
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {invoiceService.getStatusLabel(invoice.status)}
            </ThemedText>
          </View>
          <ThemedText style={[styles.invoiceNumber, { color: palette.muted }]}>
            {invoice.invoiceNumber}
          </ThemedText>
        </View>
        <ThemedText type="subtitle" style={styles.amount}>
          {invoiceService.formatAmount(invoice.total)}
        </ThemedText>
      </View>

      {/* Session Details */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color={palette.muted} />
          <ThemedText style={styles.detailText}>{invoice.athleteName}</ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="fitness-outline" size={16} color={palette.muted} />
          <ThemedText style={styles.detailText} numberOfLines={1}>
            {invoice.sessionType || 'Training Session'}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={palette.muted} />
          <ThemedText style={styles.detailText}>{formatDate(invoice.sessionDate)}</ThemedText>
        </View>
      </View>

      {/* Coach */}
      <View style={[styles.coachRow, { borderTopColor: palette.border }]}>
        <ThemedText style={[styles.coachLabel, { color: palette.muted }]}>Coach</ThemedText>
        <ThemedText type="defaultSemiBold">{invoice.coachName}</ThemedText>
      </View>

      {/* Due Date Warning */}
      {invoice.status === 'SENT' && invoice.dueDate && (
        <View style={[styles.dueWarning, { backgroundColor: `${palette.warning}10` }]}>
          <Ionicons name="time-outline" size={14} color={palette.warning} />
          <ThemedText style={[styles.dueText, { color: palette.warning }]}>
            Due by {formatDate(invoice.dueDate)}
          </ThemedText>
        </View>
      )}
    </SurfaceCard>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    gap: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  invoiceNumber: {
    fontSize: 12,
  },
  amount: {
    fontSize: 20,
  },
  details: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: 14,
    flex: 1,
  },
  coachRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.xs,
  },
  coachLabel: {
    fontSize: 13,
  },
  dueWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radii.sm,
  },
  dueText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Compact styles
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
    borderRadius: 4,
  },
  compactContent: {
    flex: 1,
    gap: 2,
  },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactTitle: {
    fontSize: 15,
    flex: 1,
    marginRight: Spacing.sm,
  },
  compactSubtext: {
    fontSize: 13,
    flex: 1,
    marginRight: Spacing.sm,
  },
  compactDate: {
    fontSize: 12,
  },
});
