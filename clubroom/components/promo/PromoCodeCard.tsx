import { View, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii , Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { promoService } from '@/services/promo-service';
import type { PromoCode } from '@/constants/types';

interface PromoCodeCardProps {
  /** The promo code to display */
  promoCode: PromoCode;
  /** Callback when deactivate/reactivate is pressed */
  onToggleActive?: (codeId: string, currentlyActive: boolean) => void;
  /** Callback when view usage is pressed */
  onViewUsage?: (codeId: string) => void;
  /** Callback when card is pressed */
  onPress?: (promoCode: PromoCode) => void;
  /** Whether to show action buttons */
  showActions?: boolean;
}

export function PromoCodeCard({
  promoCode,
  onToggleActive,
  onViewUsage,
  onPress,
  showActions = true,
}: PromoCodeCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const status = promoService.getCodeStatus(promoCode);
  const statusInfo = promoService.getStatusInfo(status);
  const remainingUses = promoCode.maxUses - promoCode.currentUses;
  const usagePercent = (promoCode.currentUses / promoCode.maxUses) * 100;

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(promoCode.code);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const formatExpiryDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Expired';
    } else if (diffDays === 0) {
      return 'Expires today';
    } else if (diffDays === 1) {
      return 'Expires tomorrow';
    } else if (diffDays <= 7) {
      return `Expires in ${diffDays} days`;
    } else {
      return `Expires ${promoService.formatDate(dateString)}`;
    }
  };

  return (
    <SurfaceCard
      style={styles.card}
      onPress={onPress ? () => onPress(promoCode) : undefined}
      tactile={Boolean(onPress)}
    >
      {/* Header with code and status */}
      <View style={styles.header}>
        <Pressable onPress={handleCopyCode} style={styles.codeContainer}>
          <View style={[styles.codeBadge, { backgroundColor: withAlpha(statusInfo.color, 0.09) }]}>
            <ThemedText style={[styles.codeText, { color: statusInfo.color }]}>
              {promoCode.code}
            </ThemedText>
            <Ionicons name="copy-outline" size={14} color={statusInfo.color} />
          </View>
        </Pressable>
        <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusInfo.color, 0.12) }]}>
          <ThemedText style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </ThemedText>
        </View>
      </View>

      {/* Credit amount and description */}
      <View style={styles.amountRow}>
        <ThemedText type="subtitle" style={styles.amount}>
          {promoService.formatCredit(promoCode.creditAmount)}
        </ThemedText>
        {promoCode.description && (
          <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={1}>
            {promoCode.description}
          </ThemedText>
        )}
      </View>

      {/* Usage progress bar */}
      <View style={styles.usageSection}>
        <View style={styles.usageHeader}>
          <ThemedText style={[styles.usageLabel, { color: palette.muted }]}>
            Usage
          </ThemedText>
          <ThemedText style={styles.usageValue}>
            {promoCode.currentUses} / {promoCode.maxUses}
            <ThemedText style={[styles.usageRemaining, { color: palette.muted }]}>
              {' '}({remainingUses} left)
            </ThemedText>
          </ThemedText>
        </View>
        <View style={[styles.progressBar, { backgroundColor: palette.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: usagePercent >= 100 ? palette.error : usagePercent >= 75 ? palette.warning : palette.success,
                width: `${Math.min(usagePercent, 100)}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="calendar-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.statText, { color: palette.muted }]}>
            Created {promoService.formatDate(promoCode.createdAt)}
          </ThemedText>
        </View>
        {promoCode.expiresAt && (
          <View style={styles.statItem}>
            <Ionicons
              name="time-outline"
              size={14}
              color={status === 'expired' ? palette.error : palette.muted}
            />
            <ThemedText
              style={[
                styles.statText,
                { color: status === 'expired' ? palette.error : palette.muted },
              ]}
            >
              {formatExpiryDate(promoCode.expiresAt)}
            </ThemedText>
          </View>
        )}
        {promoCode.onePerUser && (
          <View style={styles.statItem}>
            <Ionicons name="person-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.statText, { color: palette.muted }]}>
              One per user
            </ThemedText>
          </View>
        )}
      </View>

      {/* Action buttons */}
      {showActions && (
        <View style={styles.actions}>
          {onViewUsage && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
              onPress={() => onViewUsage(promoCode.id)}
            >
              <Ionicons name="analytics-outline" size={16} color={palette.text} />
              <ThemedText style={styles.actionButtonText}>Usage</ThemedText>
            </TouchableOpacity>
          )}
          {onToggleActive && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: promoCode.isActive ? withAlpha(palette.error, 0.09) : withAlpha(palette.success, 0.09),
                  borderColor: promoCode.isActive ? palette.error : palette.success,
                },
              ]}
              onPress={() => onToggleActive(promoCode.id, promoCode.isActive)}
            >
              <Ionicons
                name={promoCode.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                size={16}
                color={promoCode.isActive ? palette.error : palette.success}
              />
              <ThemedText
                style={[
                  styles.actionButtonText,
                  { color: promoCode.isActive ? palette.error : palette.success },
                ]}
              >
                {promoCode.isActive ? 'Deactivate' : 'Activate'}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  codeText: { ...Typography.subheading, fontFamily: 'monospace',
    letterSpacing: 1 },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  statusText: { ...Typography.caption, textTransform: 'uppercase' },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  amount: { ...Typography.title },
  description: { ...Typography.small, flex: 1 },
  usageSection: {
    gap: Spacing.xs,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  statText: { ...Typography.caption },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  actionButtonText: { ...Typography.smallSemiBold },
});
