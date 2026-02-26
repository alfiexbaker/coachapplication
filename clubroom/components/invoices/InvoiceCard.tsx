import { memo, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Invoice } from '@/constants/types';
import { invoiceService } from '@/services/invoice-service';
import { userService } from '@/services/user-service';

import { getStatusIcon, formatDate, CompactInvoiceRow, getInvoiceStatusColor } from './invoice-card-sections';

// Re-export extracted components for backward compat
export {
  getStatusIcon,
  formatDate,
  formatShortDate,
  CompactInvoiceRow,
  getInvoiceStatusColor,
} from './invoice-card-sections';
export type { CompactInvoiceRowProps } from './invoice-card-sections';

interface InvoiceCardProps {
  invoice: Invoice;
  compact?: boolean;
  onPress?: () => void;
}

const userNameCache = new Map<string, string>();

function getCachedUserLabel(id?: string, fallback = 'Unknown User'): string {
  if (!id) return fallback;
  return userNameCache.get(id) ?? 'Loading...';
}

export const InvoiceCard = memo(function InvoiceCard({ invoice, compact = false, onPress }: InvoiceCardProps) {
  const { colors: palette } = useTheme();
  const statusColor = getInvoiceStatusColor(invoice.status, palette);
  const [athleteName, setAthleteName] = useState(() =>
    getCachedUserLabel(invoice.athleteId, 'Athlete'),
  );
  const [coachName, setCoachName] = useState(() => getCachedUserLabel(invoice.coachId, 'Coach'));

  useEffect(() => {
    let cancelled = false;

    const loadUserName = async (
      userId: string | undefined,
      fallback: string,
      setName: (name: string) => void,
    ) => {
      if (!userId) {
        setName(fallback);
        return;
      }

      const cached = userNameCache.get(userId);
      if (cached) {
        setName(cached);
        return;
      }

      setName('Loading...');
      const result = await userService.getUserById(userId);
      if (cancelled) return;

      if (result.success) {
        userNameCache.set(userId, result.data.name);
        setName(result.data.name);
      } else {
        setName(fallback);
      }
    };

    void Promise.all([
      loadUserName(invoice.athleteId, 'Unknown Athlete', setAthleteName),
      loadUserName(invoice.coachId, 'Unknown Coach', setCoachName),
    ]);

    return () => {
      cancelled = true;
    };
  }, [invoice.athleteId, invoice.coachId]);

  const handlePress = useCallback(() => {
    if (onPress) onPress();
    else router.push(Routes.invoice(invoice.id));
  }, [invoice.id, onPress]);

  if (compact) {
    return <CompactInvoiceRow invoice={invoice} onPress={handlePress} palette={palette} />;
  }

  return (
    <SurfaceCard style={styles.card} onPress={handlePress}>
      <Row justify="space-between" align="flex-start">
        <View style={styles.headerLeft}>
          <Row
            align="center"
            gap="xxs"
            style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.09) }]}
          >
            <Ionicons name={getStatusIcon(invoice.status)} size={14} color={statusColor} />
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {invoiceService.getStatusLabel(invoice.status)}
            </ThemedText>
          </Row>
          <ThemedText style={[styles.invoiceNumber, { color: palette.muted }]}>
            {invoice.invoiceNumber}
          </ThemedText>
        </View>
        <ThemedText type="subtitle" style={styles.amount}>
          {invoiceService.formatAmount(invoice.total)}
        </ThemedText>
      </Row>

      <View style={styles.details}>
        <Row align="center" gap="xs">
          <Ionicons name="person-outline" size={16} color={palette.muted} />
          <ThemedText style={styles.detailText}>{athleteName}</ThemedText>
        </Row>
        <Row align="center" gap="xs">
          <Ionicons name="fitness-outline" size={16} color={palette.muted} />
          <ThemedText style={styles.detailText} numberOfLines={1}>
            {invoice.sessionType || 'Training Session'}
          </ThemedText>
        </Row>
        <Row align="center" gap="xs">
          <Ionicons name="calendar-outline" size={16} color={palette.muted} />
          <ThemedText style={styles.detailText}>{formatDate(invoice.sessionDate)}</ThemedText>
        </Row>
      </View>

      <Row
        justify="space-between"
        align="center"
        style={[styles.coachRow, { borderTopColor: palette.border }]}
      >
        <ThemedText style={[styles.coachLabel, { color: palette.muted }]}>Coach</ThemedText>
        <ThemedText type="defaultSemiBold">{coachName}</ThemedText>
      </Row>

      {invoice.status === 'SENT' && invoice.dueDate && (
        <Row
          align="center"
          gap="xs"
          style={[styles.dueWarning, { backgroundColor: withAlpha(palette.warning, 0.06) }]}
        >
          <Ionicons name="time-outline" size={14} color={palette.warning} />
          <ThemedText style={[styles.dueText, { color: palette.warning }]}>
            Due by {formatDate(invoice.dueDate)}
          </ThemedText>
        </Row>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  headerLeft: { gap: Spacing.xxs },
  statusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  statusText: { ...Typography.caption },
  invoiceNumber: { ...Typography.caption },
  amount: { ...Typography.title },
  details: { gap: Spacing.xxs },
  detailText: { ...Typography.bodySmall, flex: 1 },
  coachRow: {
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.xs,
  },
  coachLabel: { ...Typography.small },
  dueWarning: {
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radii.sm,
  },
  dueText: { ...Typography.caption },
});
