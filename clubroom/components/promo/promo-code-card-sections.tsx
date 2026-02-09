import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { promoService } from '@/services/promo-service';

/* ---------- Helpers ---------- */

export function formatExpiryDate(dateString: string): string {
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
}

/* ---------- PromoStatsRow ---------- */

export interface PromoStatsRowProps {
  createdAt: string;
  expiresAt?: string;
  status: string;
  onePerUser: boolean;
  palette: ThemeColors;
}

export const PromoStatsRow = memo(function PromoStatsRow({
  createdAt,
  expiresAt,
  status,
  onePerUser,
  palette,
}: PromoStatsRowProps) {
  return (
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <Ionicons name="calendar-outline" size={14} color={palette.muted} />
        <ThemedText style={[styles.statText, { color: palette.muted }]}>
          Created {promoService.formatDate(createdAt)}
        </ThemedText>
      </View>
      {expiresAt && (
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
            {formatExpiryDate(expiresAt)}
          </ThemedText>
        </View>
      )}
      {onePerUser && (
        <View style={styles.statItem}>
          <Ionicons name="person-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.statText, { color: palette.muted }]}>
            One per user
          </ThemedText>
        </View>
      )}
    </View>
  );
});

/* ---------- PromoActionButtons ---------- */

export interface PromoActionButtonsProps {
  codeId: string;
  isActive: boolean;
  onToggleActive?: (codeId: string, currentlyActive: boolean) => void;
  onViewUsage?: (codeId: string) => void;
  palette: ThemeColors;
}

export const PromoActionButtons = memo(function PromoActionButtons({
  codeId,
  isActive,
  onToggleActive,
  onViewUsage,
  palette,
}: PromoActionButtonsProps) {
  if (!onViewUsage && !onToggleActive) return null;

  return (
    <View style={styles.actions}>
      {onViewUsage && (
        <Clickable
          style={[styles.actionButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
          onPress={() => onViewUsage(codeId)}
        >
          <Ionicons name="analytics-outline" size={16} color={palette.text} />
          <ThemedText style={styles.actionButtonText}>Usage</ThemedText>
        </Clickable>
      )}
      {onToggleActive && (
        <Clickable
          style={[
            styles.actionButton,
            {
              backgroundColor: isActive ? withAlpha(palette.error, 0.09) : withAlpha(palette.success, 0.09),
              borderColor: isActive ? palette.error : palette.success,
            },
          ]}
          onPress={() => onToggleActive(codeId, isActive)}
        >
          <Ionicons
            name={isActive ? 'pause-circle-outline' : 'play-circle-outline'}
            size={16}
            color={isActive ? palette.error : palette.success}
          />
          <ThemedText
            style={[
              styles.actionButtonText,
              { color: isActive ? palette.error : palette.success },
            ]}
          >
            {isActive ? 'Deactivate' : 'Activate'}
          </ThemedText>
        </Clickable>
      )}
    </View>
  );
});

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
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
