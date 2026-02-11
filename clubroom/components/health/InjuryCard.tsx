/**
 * InjuryCard Component
 *
 * Displays an injury with status indicator, body part, severity,
 * and recovery progress.
 */

import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import type { Injury } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { injuryService } from '@/services/injury-service';
import { scaleFont } from '@/utils/scale';

import { CompactInjuryRow, InjuryRecoveryBar, InjuryFooterMeta } from './injury-card-sections';
import { Row } from '@/components/primitives';

// Re-export extracted components for backward compat
export { CompactInjuryRow, InjuryRecoveryBar, InjuryFooterMeta } from './injury-card-sections';
export type {
  CompactInjuryRowProps,
  InjuryRecoveryBarProps,
  InjuryFooterMetaProps,
} from './injury-card-sections';

interface InjuryCardProps {
  injury: Injury;
  onPress?: () => void;
  compact?: boolean;
}

export function InjuryCard({ injury, onPress, compact = false }: InjuryCardProps) {
  const { colors: palette } = useTheme();

  const severityInfo = injuryService.getSeverityInfo(injury.severity);
  const statusInfo = injuryService.getStatusInfo(injury.status);
  const bodyPartLabel = injuryService.getBodyPartLabel(injury.bodyPart);

  const handlePress = () => {
    if (onPress) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  if (compact) {
    return (
      <CompactInjuryRow
        injury={injury}
        onPress={onPress ? handlePress : undefined}
        palette={palette}
      />
    );
  }

  return (
    <SurfaceCard onPress={onPress ? handlePress : undefined} style={styles.card}>
      {/* Header with status and severity */}
      <Row style={styles.header}>
        <Row style={styles.headerLeft}>
          <Row style={[styles.statusBadge, { backgroundColor: withAlpha(statusInfo.color, 0.09) }]}>
            <Ionicons
              name={statusInfo.icon as keyof typeof Ionicons.glyphMap}
              size={14}
              color={statusInfo.color}
            />
            <ThemedText style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </ThemedText>
          </Row>
          <View
            style={[styles.severityBadge, { backgroundColor: withAlpha(severityInfo.color, 0.09) }]}
          >
            <ThemedText style={[styles.severityText, { color: severityInfo.color }]}>
              {severityInfo.label}
            </ThemedText>
          </View>
        </Row>
        {injury.sharedWithCoach && (
          <View style={[styles.sharedBadge, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
            <Ionicons name="share-social-outline" size={12} color={palette.tint} />
          </View>
        )}
      </Row>

      {/* Body part and description */}
      <View style={styles.content}>
        <ThemedText type="subtitle" style={styles.bodyPartText}>
          {bodyPartLabel}
        </ThemedText>
        <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={2}>
          {injury.description}
        </ThemedText>
      </View>

      <InjuryRecoveryBar
        recoveryPercent={injury.recoveryPercent}
        statusColor={statusInfo.color}
        palette={palette}
      />
      <InjuryFooterMeta injury={injury} palette={palette} />
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    gap: Spacing.xs,
  },
  statusBadge: {
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
});
