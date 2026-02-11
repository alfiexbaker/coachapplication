/**
 * Extracted sub-components for DrillCard.
 *
 * CompactDrillCard — narrow row variant with category indicator + chevron.
 * FullDrillCardContent — full card with thumbnail, badges, meta, footer.
 */

import React, { memo } from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DifficultyBadge } from './DifficultyBadge';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import type { Drill } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import { drillService } from '@/services/drill-service';
import { Row } from '@/components/primitives';
import { styles } from './drill-card-styles';

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
            <View style={[styles.playOverlay, { backgroundColor: withAlpha(palette.text, 0.3) }]}>
              <View style={[styles.playButton, { backgroundColor: withAlpha(palette.text, 0.6) }]}>
                <Ionicons name="play" size={24} color={palette.onPrimary} />
              </View>
            </View>
          )}
          <View style={[styles.durationOverlay, { backgroundColor: withAlpha(palette.text, 0.75) }]}>
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

export { styles };
