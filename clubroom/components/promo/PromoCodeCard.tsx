import { View, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { promoService } from '@/services/promo-service';
import type { PromoCode } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import { PromoStatsRow, PromoActionButtons } from './promo-code-card-sections';

// Re-export extracted components for backward compat
export { formatExpiryDate, PromoStatsRow, PromoActionButtons } from './promo-code-card-sections';
export type { PromoStatsRowProps, PromoActionButtonsProps } from './promo-code-card-sections';

interface PromoCodeCardProps {
  promoCode: PromoCode;
  onToggleActive?: (codeId: string, currentlyActive: boolean) => void;
  onViewUsage?: (codeId: string) => void;
  onPress?: (promoCode: PromoCode) => void;
  showActions?: boolean;
}

export function PromoCodeCard({
  promoCode,
  onToggleActive,
  onViewUsage,
  onPress,
  showActions = true,
}: PromoCodeCardProps) {
  const { colors: palette } = useTheme();

  const status = promoService.getCodeStatus(promoCode);
  const statusInfo = promoService.getStatusInfo(status);
  const remainingUses = promoCode.maxUses - promoCode.currentUses;
  const usagePercent = (promoCode.currentUses / promoCode.maxUses) * 100;

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(promoCode.code);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <SurfaceCard
      style={styles.card}
      onPress={onPress ? () => onPress(promoCode) : undefined}
      tactile={Boolean(onPress)}
    >
      {/* Header with code and status */}
      <Row justify="space-between" align="center">
        <Clickable onPress={handleCopyCode}>
          <Row
            align="center"
            gap="xs"
            style={[styles.codeBadge, { backgroundColor: withAlpha(statusInfo.color, 0.09) }]}
          >
            <ThemedText style={[styles.codeText, { color: statusInfo.color }]}>
              {promoCode.code}
            </ThemedText>
            <Ionicons name="copy-outline" size={14} color={statusInfo.color} />
          </Row>
        </Clickable>
        <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusInfo.color, 0.12) }]}>
          <ThemedText style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </ThemedText>
        </View>
      </Row>

      {/* Credit amount and description */}
      <Row align="baseline" gap="sm">
        <ThemedText type="subtitle" style={styles.amount}>
          {promoService.formatCredit(promoCode.creditAmount)}
        </ThemedText>
        {promoCode.description && (
          <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={1}>
            {promoCode.description}
          </ThemedText>
        )}
      </Row>

      {/* Usage progress bar */}
      <View style={styles.usageSection}>
        <Row justify="space-between" align="center">
          <ThemedText style={[styles.usageLabel, { color: palette.muted }]}>Usage</ThemedText>
          <ThemedText style={styles.usageValue}>
            {promoCode.currentUses} / {promoCode.maxUses}
            <ThemedText style={[styles.usageRemaining, { color: palette.muted }]}>
              {' '}
              ({remainingUses} left)
            </ThemedText>
          </ThemedText>
        </Row>
        <View style={[styles.progressBar, { backgroundColor: palette.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor:
                  usagePercent >= 100
                    ? palette.error
                    : usagePercent >= 75
                      ? palette.warning
                      : palette.success,
                width: `${Math.min(usagePercent, 100)}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Stats row */}
      <PromoStatsRow
        createdAt={promoCode.createdAt}
        expiresAt={promoCode.expiresAt}
        status={status}
        onePerUser={promoCode.onePerUser}
        palette={palette}
      />

      {/* Action buttons */}
      {showActions && (
        <PromoActionButtons
          codeId={promoCode.id}
          isActive={promoCode.isActive}
          onToggleActive={onToggleActive}
          onViewUsage={onViewUsage}
          palette={palette}
        />
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
  },
  codeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  codeText: { ...Typography.subheading, fontFamily: 'monospace', letterSpacing: 1 },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  statusText: { ...Typography.caption, textTransform: 'uppercase' },
  amount: { ...Typography.title },
  description: { ...Typography.small, flex: 1 },
  usageSection: {
    gap: Spacing.xs,
  },
  usageLabel: { ...Typography.caption },
  usageValue: { ...Typography.smallSemiBold },
  usageRemaining: { ...Typography.caption },
  progressBar: {
    height: 6,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
});
