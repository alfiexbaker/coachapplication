/**
 * Extracted sub-components for DrillCard.
 *
 * CompactDrillCard — narrow row variant with category indicator + chevron.
 * FullDrillCardContent — full card with thumbnail, badges, meta, footer.
 */

import React, { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DifficultyBadge } from './DifficultyBadge';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, withAlpha } from '@/constants/theme';
import type { Drill } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import { drillService } from '@/services/drill-service';
import { scaleFont } from '@/utils/scale';
import { Row } from '@/components/primitives';

// ─── CompactDrillCard ────────────────────────────────────────────────────────

interface CompactDrillCardProps {
  drill: Drill;
  onPress?: () => void;
  palette: ThemeColors;
}

export const CompactDrillCard = memo(function CompactDrillCard({
  drill,
  onPress,
  palette,
}: CompactDrillCardProps) {
  const categoryInfo = drillService.getCategoryInfo(drill.category);
  const hasVideo = Boolean(drill.videoUrl);

  return (
    <SurfaceCard style={styles.compactCard} onPress={onPress}>
      <View style={[styles.categoryIndicator, { backgroundColor: categoryInfo.color }]} />
      <View style={styles.compactContent}>
        <Row style={styles.compactHeader}>
          <ThemedText type="defaultSemiBold" style={styles.compactTitle} numberOfLines={1}>
            {drill.title}
          </ThemedText>
          {hasVideo && (
            <Ionicons name="videocam" size={14} color={palette.muted} />
          )}
        </Row>
        <Row style={styles.compactMeta}>
          <Row style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={palette.muted} />
            <ThemedText style={[styles.metaText, { color: palette.muted }]}>
              {drillService.formatDuration(drill.duration)}
            </ThemedText>
          </Row>
          <DifficultyBadge difficulty={drill.difficulty} size="small" />
        </Row>
      </View>
      <Ionicons name="chevron-forward" size={20} color={palette.muted} />
    </SurfaceCard>
  );
});

// ─── FullDrillCardContent ────────────────────────────────────────────────────

interface FullDrillCardContentProps {
  drill: Drill;
  onPress?: () => void;
  showAssignmentCount: boolean;
  palette: ThemeColors;
}

export const FullDrillCardContent = memo(function FullDrillCardContent({
  drill,
  onPress,
  showAssignmentCount,
  palette,
}: FullDrillCardContentProps) {
  const categoryInfo = drillService.getCategoryInfo(drill.category);
  const hasVideo = Boolean(drill.videoUrl);

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      {/* Video thumbnail */}
      {drill.thumbnailUrl && (
        <View style={styles.thumbnailContainer}>
          <Image source={{ uri: drill.thumbnailUrl }} style={styles.thumbnail} />
          {hasVideo && (
            <View style={styles.playOverlay}>
              <View style={styles.playButton}>
                <Ionicons name="play" size={24} color={palette.onPrimary} />
              </View>
            </View>
          )}
          <View style={styles.durationOverlay}>
            <ThemedText style={[styles.durationText, { color: palette.onPrimary }]}>
              {drillService.formatDuration(drill.duration)}
            </ThemedText>
          </View>
        </View>
      )}

      <View style={styles.content}>
        {/* Header with category and video indicator */}
        <Row style={styles.header}>
          <Row style={[styles.categoryBadge, { backgroundColor: withAlpha(categoryInfo.color, 0.12) }]}>
            <Ionicons
              name={categoryInfo.icon as keyof typeof Ionicons.glyphMap}
              size={14}
              color={categoryInfo.color}
            />
            <ThemedText style={[styles.categoryText, { color: categoryInfo.color }]}>
              {categoryInfo.label}
            </ThemedText>
          </Row>
          {hasVideo && !drill.thumbnailUrl && (
            <Row style={[styles.videoBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <Ionicons name="videocam" size={12} color={palette.tint} />
              <ThemedText style={[styles.videoBadgeText, { color: palette.tint }]}>
                Video
              </ThemedText>
            </Row>
          )}
        </Row>

        {/* Title */}
        <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={2}>
          {drill.title}
        </ThemedText>

        {/* Description */}
        <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={2}>
          {drill.description}
        </ThemedText>

        {/* Footer with meta info */}
        <Row style={[styles.footer, { borderTopColor: palette.border }]}>
          <Row style={styles.metaRow}>
            {!drill.thumbnailUrl && (
              <Row style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={palette.muted} />
                <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                  {drillService.formatDuration(drill.duration)}
                </ThemedText>
              </Row>
            )}
            {drill.equipment && drill.equipment.length > 0 && (
              <Row style={styles.metaItem}>
                <Ionicons name="football-outline" size={14} color={palette.muted} />
                <ThemedText style={[styles.metaText, { color: palette.muted }]} numberOfLines={1}>
                  {drill.equipment.slice(0, 2).join(', ')}
                  {drill.equipment.length > 2 && ` +${drill.equipment.length - 2}`}
                </ThemedText>
              </Row>
            )}
          </Row>
          <Row style={styles.footerRight}>
            {showAssignmentCount && drill.assignmentCount !== undefined && drill.assignmentCount > 0 && (
              <Row style={styles.assignmentCount}>
                <Ionicons name="people-outline" size={12} color={palette.muted} />
                <ThemedText style={[styles.assignmentCountText, { color: palette.muted }]}>
                  {drill.assignmentCount}
                </ThemedText>
              </Row>
            )}
            <DifficultyBadge difficulty={drill.difficulty} />
          </Row>
        </Row>
      </View>
    </SurfaceCard>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
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
    borderRadius: Radii['2xl'],
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
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.xs,
  },
  durationText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  content: {
    padding: Components.card.padding,
    gap: Spacing.xs,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  categoryBadge: {
    alignItems: 'center',
    gap: Spacing.xxs,
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
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  metaRow: {
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  metaItem: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  metaText: {
    fontSize: scaleFont(13),
  },
  footerRight: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  assignmentCount: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  assignmentCountText: {
    fontSize: scaleFont(12),
  },
  compactCard: {
    alignItems: 'center',
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  categoryIndicator: {
    width: 4,
    height: '100%',
    minHeight: 48,
    borderRadius: Radii.xs,
  },
  compactContent: {
    flex: 1,
    gap: Spacing.xxs,
  },
  compactHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  compactTitle: {
    flex: 1,
    fontSize: scaleFont(15),
  },
  compactMeta: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
