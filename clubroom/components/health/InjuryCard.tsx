/**
 * InjuryCard Component
 *
 * Displays an injury with status indicator, body part, severity,
 * and recovery progress. Used in injury lists and dashboards.
 */

import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii , withAlpha } from '@/constants/theme';
import type { Injury } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { injuryService } from '@/services/injury-service';
import { scaleFont } from '@/utils/scale';

interface InjuryCardProps {
  injury: Injury;
  onPress?: () => void;
  compact?: boolean;
}

export function InjuryCard({ injury, onPress, compact = false }: InjuryCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const severityInfo = injuryService.getSeverityInfo(injury.severity);
  const statusInfo = injuryService.getStatusInfo(injury.status);
  const bodyPartLabel = injuryService.getBodyPartLabel(injury.bodyPart);
  const daysUntilRecovery = injuryService.getDaysUntilRecovery(injury);

  const handlePress = () => {
    if (onPress) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  if (compact) {
    return (
      <Clickable onPress={handlePress} disabled={!onPress}>
        <View style={[styles.compactContainer, { borderColor: palette.border }]}>
          <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
          <View style={styles.compactContent}>
            <ThemedText style={styles.compactTitle}>{bodyPartLabel}</ThemedText>
            <ThemedText style={[styles.compactSubtitle, { color: palette.muted }]}>
              {statusInfo.label} - {injury.recoveryPercent}%
            </ThemedText>
          </View>
          {onPress && (
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          )}
        </View>
      </Clickable>
    );
  }

  return (
    <SurfaceCard onPress={onPress ? handlePress : undefined} style={styles.card}>
      {/* Header with status and severity */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusInfo.color, 0.09) }]}>
            <Ionicons
              name={statusInfo.icon as keyof typeof Ionicons.glyphMap}
              size={14}
              color={statusInfo.color}
            />
            <ThemedText style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </ThemedText>
          </View>
          <View style={[styles.severityBadge, { backgroundColor: withAlpha(severityInfo.color, 0.09) }]}>
            <ThemedText style={[styles.severityText, { color: severityInfo.color }]}>
              {severityInfo.label}
            </ThemedText>
          </View>
        </View>
        {injury.sharedWithCoach && (
          <View style={[styles.sharedBadge, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
            <Ionicons name="share-social-outline" size={12} color={palette.tint} />
          </View>
        )}
      </View>

      {/* Body part and description */}
      <View style={styles.content}>
        <ThemedText type="subtitle" style={styles.bodyPartText}>
          {bodyPartLabel}
        </ThemedText>
        <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={2}>
          {injury.description}
        </ThemedText>
      </View>

      {/* Recovery progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <ThemedText style={[styles.progressLabel, { color: palette.muted }]}>
            Recovery Progress
          </ThemedText>
          <ThemedText style={[styles.progressPercent, { color: statusInfo.color }]}>
            {injury.recoveryPercent}%
          </ThemedText>
        </View>
        <View style={[styles.progressBar, { backgroundColor: palette.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: statusInfo.color,
                width: `${injury.recoveryPercent}%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Footer with dates */}
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
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
  },
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    gap: Spacing.xxs,
  },
  statusText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  severityText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  sharedBadge: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    marginBottom: Spacing.md,
  },
  bodyPartText: {
    marginBottom: Spacing.xxs,
  },
  description: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
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
