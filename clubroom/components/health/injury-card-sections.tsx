import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import type { Injury } from '@/constants/types';
import { injuryService } from '@/services/injury-service';
import { scaleFont } from '@/utils/scale';
import type { useTheme } from '@/hooks/useTheme';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ─── CompactInjuryRow ───────────────────────────────────────────

export interface CompactInjuryRowProps {
  injury: Injury;
  onPress?: () => void;
  palette: ThemeColors;
}

export const CompactInjuryRow = memo(function CompactInjuryRow({
  injury,
  onPress,
  palette,
}: CompactInjuryRowProps) {
  const statusInfo = injuryService.getStatusInfo(injury.status);
  const bodyPartLabel = injuryService.getBodyPartLabel(injury.bodyPart);

  return (
    <Clickable onPress={onPress} disabled={!onPress}>
      <View style={[styles.compactContainer, { borderColor: palette.border }]}>
        <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
        <View style={styles.compactContent}>
          <ThemedText style={styles.compactTitle}>{bodyPartLabel}</ThemedText>
          <ThemedText style={[styles.compactSubtitle, { color: palette.muted }]}>
            {statusInfo.label} - {injury.recoveryPercent}%
          </ThemedText>
        </View>
        {onPress && <Ionicons name="chevron-forward" size={20} color={palette.muted} />}
      </View>
    </Clickable>
  );
});

// ─── InjuryRecoveryBar ──────────────────────────────────────────

export interface InjuryRecoveryBarProps {
  recoveryPercent: number;
  statusColor: string;
  palette: ThemeColors;
}

export const InjuryRecoveryBar = memo(function InjuryRecoveryBar({
  recoveryPercent,
  statusColor,
  palette,
}: InjuryRecoveryBarProps) {
  return (
    <View style={styles.progressSection}>
      <View style={styles.progressHeader}>
        <ThemedText style={[styles.progressLabel, { color: palette.muted }]}>
          Recovery Progress
        </ThemedText>
        <ThemedText style={[styles.progressPercent, { color: statusColor }]}>
          {recoveryPercent}%
        </ThemedText>
      </View>
      <View style={[styles.progressBar, { backgroundColor: palette.border }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: statusColor, width: `${recoveryPercent}%` },
          ]}
        />
      </View>
    </View>
  );
});

// ─── InjuryFooterMeta ───────────────────────────────────────────

export interface InjuryFooterMetaProps {
  injury: Injury;
  palette: ThemeColors;
}

export const InjuryFooterMeta = memo(function InjuryFooterMeta({
  injury,
  palette,
}: InjuryFooterMetaProps) {
  const daysUntilRecovery = injuryService.getDaysUntilRecovery(injury);

  return (
    <View style={styles.footer}>
      <View style={styles.footerItem}>
        <Ionicons name="calendar-outline" size={14} color={palette.muted} />
        <ThemedText style={[styles.footerText, { color: palette.muted }]}>
          {injuryService.formatDate(injury.occurredAt)}
        </ThemedText>
      </View>
      {daysUntilRecovery !== null && daysUntilRecovery > 0 && (
        <View style={styles.footerItem}>
          <Ionicons name="time-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.footerText, { color: palette.muted }]}>
            {daysUntilRecovery} days to recovery
          </ThemedText>
        </View>
      )}
      {injury.notes.length > 0 && (
        <View style={styles.footerItem}>
          <Ionicons name="document-text-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.footerText, { color: palette.muted }]}>
            {injury.notes.length} note{injury.notes.length !== 1 ? 's' : ''}
          </ThemedText>
        </View>
      )}
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
    marginRight: Spacing.sm,
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: scaleFont(15),
    fontWeight: '600',
  },
  compactSubtitle: {
    fontSize: scaleFont(13),
    marginTop: Spacing.micro,
  },
  progressSection: {
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xxs,
  },
  progressLabel: {
    fontSize: scaleFont(13),
  },
  progressPercent: {
    fontSize: scaleFont(14),
    fontWeight: '700',
  },
  progressBar: {
    height: 6,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  footerText: {
    fontSize: scaleFont(12),
  },
});
