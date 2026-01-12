/**
 * DrillCard Component
 *
 * Displays a drill from the coach's library with title, description,
 * category, duration, and difficulty badge. Supports video indicator.
 */

import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, View } from 'react-native';

import { DifficultyBadge } from './DifficultyBadge';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { Drill } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { drillService } from '@/services/drill-service';
import { scaleFont } from '@/utils/scale';

interface DrillCardProps {
  /** The drill to display */
  drill: Drill;
  /** Callback when card is pressed */
  onPress?: () => void;
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Whether to show assignment count */
  showAssignmentCount?: boolean;
}

/**
 * Card component for displaying a drill from the library.
 */
export function DrillCard({
  drill,
  onPress,
  compact = false,
  showAssignmentCount = false,
}: DrillCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const categoryInfo = drillService.getCategoryInfo(drill.category);
  const hasVideo = Boolean(drill.videoUrl);

  if (compact) {
    return (
      <SurfaceCard style={styles.compactCard} onPress={onPress}>
        <View style={[styles.categoryIndicator, { backgroundColor: categoryInfo.color }]} />
        <View style={styles.compactContent}>
          <View style={styles.compactHeader}>
            <ThemedText type="defaultSemiBold" style={styles.compactTitle} numberOfLines={1}>
              {drill.title}
            </ThemedText>
            {hasVideo && (
              <Ionicons name="videocam" size={14} color={palette.muted} />
            )}
          </View>
          <View style={styles.compactMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={palette.muted} />
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                {drillService.formatDuration(drill.duration)}
              </ThemedText>
            </View>
            <DifficultyBadge difficulty={drill.difficulty} size="small" />
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      {/* Video thumbnail */}
      {drill.thumbnailUrl && (
        <View style={styles.thumbnailContainer}>
          <Image source={{ uri: drill.thumbnailUrl }} style={styles.thumbnail} />
          {hasVideo && (
            <View style={styles.playOverlay}>
              <View style={styles.playButton}>
                <Ionicons name="play" size={24} color="#FFFFFF" />
              </View>
            </View>
          )}
          <View style={styles.durationOverlay}>
            <ThemedText style={styles.durationText}>
              {drillService.formatDuration(drill.duration)}
            </ThemedText>
          </View>
        </View>
      )}

      <View style={styles.content}>
        {/* Header with category and video indicator */}
        <View style={styles.header}>
          <View style={[styles.categoryBadge, { backgroundColor: `${categoryInfo.color}20` }]}>
            <Ionicons
              name={categoryInfo.icon as keyof typeof Ionicons.glyphMap}
              size={14}
              color={categoryInfo.color}
            />
            <ThemedText style={[styles.categoryText, { color: categoryInfo.color }]}>
              {categoryInfo.label}
            </ThemedText>
          </View>
          {hasVideo && !drill.thumbnailUrl && (
            <View style={[styles.videoBadge, { backgroundColor: `${palette.tint}15` }]}>
              <Ionicons name="videocam" size={12} color={palette.tint} />
              <ThemedText style={[styles.videoBadgeText, { color: palette.tint }]}>
                Video
              </ThemedText>
            </View>
          )}
        </View>

        {/* Title */}
        <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={2}>
          {drill.title}
        </ThemedText>

        {/* Description */}
        <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={2}>
          {drill.description}
        </ThemedText>

        {/* Footer with meta info */}
        <View style={styles.footer}>
          <View style={styles.metaRow}>
            {!drill.thumbnailUrl && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={palette.muted} />
                <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                  {drillService.formatDuration(drill.duration)}
                </ThemedText>
              </View>
            )}
            {drill.equipment && drill.equipment.length > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="football-outline" size={14} color={palette.muted} />
                <ThemedText style={[styles.metaText, { color: palette.muted }]} numberOfLines={1}>
                  {drill.equipment.slice(0, 2).join(', ')}
                  {drill.equipment.length > 2 && ` +${drill.equipment.length - 2}`}
                </ThemedText>
              </View>
            )}
          </View>
          <View style={styles.footerRight}>
            {showAssignmentCount && drill.assignmentCount !== undefined && drill.assignmentCount > 0 && (
              <View style={styles.assignmentCount}>
                <Ionicons name="people-outline" size={12} color={palette.muted} />
                <ThemedText style={[styles.assignmentCountText, { color: palette.muted }]}>
                  {drill.assignmentCount}
                </ThemedText>
              </View>
            )}
            <DifficultyBadge difficulty={drill.difficulty} />
          </View>
        </View>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.sm,
  },
  categoryText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  videoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  videoBadgeText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
  },
  title: {
    fontSize: scaleFont(17),
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: scaleFont(24),
  },
  description: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: scaleFont(13),
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  assignmentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assignmentCountText: {
    fontSize: scaleFont(12),
  },

  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  categoryIndicator: {
    width: 4,
    height: '100%',
    minHeight: 48,
    borderRadius: 2,
  },
  compactContent: {
    flex: 1,
    gap: 4,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  compactTitle: {
    flex: 1,
    fontSize: scaleFont(15),
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
