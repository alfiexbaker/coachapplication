/**
 * RsvpMiniBar — Compact colored progress bar showing RSVP distribution.
 *
 * Green = going, Amber = maybe, Red = can't go, Grey = pending.
 * Shows "8/15 confirmed" text alongside the bar.
 * Used on GroupSessionCard, ScheduleSessionItem, and session detail.
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface RsvpMiniBarCounts {
  going: number;
  maybe: number;
  notGoing: number;
  pending: number;
}

interface RsvpMiniBarProps {
  counts: RsvpMiniBarCounts;
  /** Show text label next to bar. Default true. */
  showLabel?: boolean;
  /** Compact mode for schedule items — shorter bar. */
  compact?: boolean;
}

function RsvpMiniBarComponent({ counts, showLabel = true, compact = false }: RsvpMiniBarProps) {
  const { colors } = useTheme();

  const total = counts.going + counts.maybe + counts.notGoing + counts.pending;
  if (total === 0) return null;

  const segments = [
    { value: counts.going, color: colors.success },
    { value: counts.maybe, color: colors.warning },
    { value: counts.notGoing, color: colors.error },
    { value: counts.pending, color: withAlpha(colors.muted, 0.3) },
  ];

  // Response rate determines label color
  const responseRate = (counts.going + counts.maybe + counts.notGoing) / total;
  const labelColor =
    responseRate >= 0.7 ? colors.success : responseRate >= 0.4 ? colors.warning : colors.error;

  return (
    <Row align="center" gap="xs" accessibilityLabel={`RSVP: ${counts.going} of ${total} going`}>
      <Row style={[styles.bar, compact && styles.barCompact]}>
        {segments.map((seg, i) => {
          if (seg.value === 0) return null;
          const widthPercent = (seg.value / total) * 100;
          return (
            <View
              key={i}
              style={[
                styles.segment,
                {
                  width: `${widthPercent}%` as unknown as number,
                  backgroundColor: seg.color,
                },
                i === 0 && styles.segmentFirst,
                i === segments.length - 1 && styles.segmentLast,
              ]}
            />
          );
        })}
      </Row>
      {showLabel && (
        <ThemedText
          style={[
            compact ? Typography.micro : Typography.caption,
            { color: labelColor, minWidth: compact ? 30 : 48 },
          ]}
          numberOfLines={1}
        >
          {counts.going}/{total}
        </ThemedText>
      )}
    </Row>
  );
}

export const RsvpMiniBar = memo(RsvpMiniBarComponent);

const styles = StyleSheet.create({
  bar: {
    flex: 1,
    height: 6,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  barCompact: {
    height: 4,
    maxWidth: 48,
  },
  segment: {
    height: '100%',
  },
  segmentFirst: {
    borderTopLeftRadius: Radii.xs,
    borderBottomLeftRadius: Radii.xs,
  },
  segmentLast: {
    borderTopRightRadius: Radii.xs,
    borderBottomRightRadius: Radii.xs,
  },
});
