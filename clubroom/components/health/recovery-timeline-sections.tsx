/**
 * Extracted sub-components for RecoveryTimeline.
 *
 * RecoveryProgressCard — progress %, status badge, progress bar, dates.
 * TimelineItem — single note entry with connector dot/line.
 * TimelineEmptyState — empty state for no notes.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import type { RecoveryNote } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import { injuryService } from '@/services/injury-service';
import { scaleFont } from '@/utils/scale';
import { Row } from '@/components/primitives';

// ─── RecoveryProgressCard ────────────────────────────────────────────────────

interface RecoveryProgressCardProps {
  recoveryPercent: number;
  statusInfo: { color: string; icon: string; label: string };
  expectedProgress: number;
  expectedRecovery?: string;
  occurredAt: string;
  daysUntilRecovery: number | null;
  palette: ThemeColors;
}

export const RecoveryProgressCard = memo(function RecoveryProgressCard({
  recoveryPercent,
  statusInfo,
  expectedProgress,
  expectedRecovery,
  occurredAt,
  daysUntilRecovery,
  palette,
}: RecoveryProgressCardProps) {
  return (
    <SurfaceCard style={styles.progressCard}>
      <Row style={styles.progressHeader}>
        <View>
          <ThemedText style={[styles.progressLabel, { color: palette.muted }]}>
            Recovery Progress
          </ThemedText>
          <ThemedText style={[styles.progressValue, { color: statusInfo.color }]}>
            {recoveryPercent}%
          </ThemedText>
        </View>
        <Row style={[styles.statusBadge, { backgroundColor: withAlpha(statusInfo.color, 0.09) }]}>
          <Ionicons
            name={statusInfo.icon as keyof typeof Ionicons.glyphMap}
            size={16}
            color={statusInfo.color}
          />
          <ThemedText style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </ThemedText>
        </Row>
      </Row>

      <View style={[styles.progressBarContainer, { backgroundColor: palette.border }]}>
        <View
          style={[
            styles.progressBarFill,
            { backgroundColor: statusInfo.color, width: `${recoveryPercent}%` },
          ]}
        />
        {expectedRecovery && expectedProgress !== recoveryPercent && (
          <View style={[styles.expectedMarker, { left: `${Math.min(expectedProgress, 100)}%` }]}>
            <View style={[styles.expectedLine, { backgroundColor: palette.muted }]} />
            <ThemedText style={[styles.expectedLabel, { color: palette.muted }]}>
              Expected
            </ThemedText>
          </View>
        )}
      </View>

      <Row style={styles.datesRow}>
        <View style={styles.dateItem}>
          <ThemedText style={[styles.dateLabel, { color: palette.muted }]}>
            Injury Date
          </ThemedText>
          <ThemedText style={styles.dateValue}>
            {injuryService.formatDate(occurredAt)}
          </ThemedText>
        </View>
        {expectedRecovery && (
          <View style={[styles.dateItem, styles.dateItemRight]}>
            <ThemedText style={[styles.dateLabel, { color: palette.muted }]}>
              Expected Recovery
            </ThemedText>
            <ThemedText style={styles.dateValue}>
              {injuryService.formatDate(expectedRecovery)}
            </ThemedText>
            {daysUntilRecovery !== null && daysUntilRecovery > 0 && (
              <ThemedText style={[styles.daysRemaining, { color: statusInfo.color }]}>
                {daysUntilRecovery} days remaining
              </ThemedText>
            )}
          </View>
        )}
      </Row>
    </SurfaceCard>
  );
});

// ─── TimelineItem ────────────────────────────────────────────────────────────

interface TimelineItemProps {
  note: RecoveryNote;
  isFirst: boolean;
  isLast: boolean;
  palette: ThemeColors;
  statusColor: string;
}

export const TimelineItem = memo(function TimelineItem({
  note,
  isFirst,
  isLast,
  palette,
  statusColor,
}: TimelineItemProps) {
  const date = new Date(note.createdAt);
  const formattedDate = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
  const formattedTime = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Animated.View
      entering={FadeInDown.delay(100).springify()}
      style={styles.timelineItem}
    >
      <View style={styles.timelineConnector}>
        {!isFirst && (
          <View style={[styles.connectorLine, { backgroundColor: palette.border }]} />
        )}
        <View style={[styles.connectorDot, { backgroundColor: statusColor }]} />
        {!isLast && (
          <View
            style={[
              styles.connectorLine,
              styles.connectorLineBottom,
              { backgroundColor: palette.border },
            ]}
          />
        )}
      </View>

      <View style={[styles.noteCard, { backgroundColor: palette.surface }]}>
        <Row style={styles.noteHeader}>
          <View>
            <ThemedText style={styles.noteDate}>{formattedDate}</ThemedText>
            <ThemedText style={[styles.noteTime, { color: palette.muted }]}>
              {formattedTime}
            </ThemedText>
          </View>
          {note.recoveryPercent !== undefined && (
            <View style={[styles.progressBadge, { backgroundColor: withAlpha(statusColor, 0.09) }]}>
              <ThemedText style={[styles.progressBadgeText, { color: statusColor }]}>
                {note.recoveryPercent}%
              </ThemedText>
            </View>
          )}
        </Row>
        <ThemedText style={styles.noteContent}>{note.note}</ThemedText>
        {note.createdBy && (
          <ThemedText style={[styles.noteAuthor, { color: palette.muted }]}>
            - {note.createdBy}
          </ThemedText>
        )}
      </View>
    </Animated.View>
  );
});

// ─── TimelineEmptyState ──────────────────────────────────────────────────────

export function TimelineEmptyState({ palette }: { palette: ThemeColors }) {
  return (
    <View style={[styles.emptyState, { backgroundColor: palette.surface }]}>
      <Ionicons name="document-text-outline" size={32} color={palette.muted} />
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
        No recovery notes yet
      </ThemedText>
      <ThemedText style={[styles.emptySubtext, { color: palette.muted }]}>
        Add notes to track your recovery progress
      </ThemedText>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  progressCard: { padding: Spacing.md },
  progressHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  progressLabel: { fontSize: scaleFont(13), marginBottom: Spacing.micro },
  progressValue: { fontSize: scaleFont(32), fontWeight: '700' },
  statusBadge: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    gap: Spacing.xxs,
  },
  statusText: { fontSize: scaleFont(13), fontWeight: '600' },
  progressBarContainer: {
    height: 12,
    borderRadius: Radii.sm,
    overflow: 'visible',
    marginBottom: Spacing.md,
    position: 'relative',
  },
  progressBarFill: { height: '100%', borderRadius: Radii.sm },
  expectedMarker: {
    position: 'absolute',
    top: -4,
    alignItems: 'center',
    marginLeft: -1,
  },
  expectedLine: { width: 2, height: 20 },
  expectedLabel: { fontSize: scaleFont(10), marginTop: Spacing.micro },
  datesRow: { justifyContent: 'space-between' },
  dateItem: { flex: 1 },
  dateItemRight: { alignItems: 'flex-end' },
  dateLabel: {
    fontSize: scaleFont(11),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.micro,
  },
  dateValue: { fontSize: scaleFont(14), fontWeight: '600' },
  daysRemaining: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    marginTop: Spacing.micro,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: Radii.lg,
    gap: Spacing.xs,
  },
  emptyText: { fontSize: scaleFont(15), fontWeight: '600' },
  emptySubtext: { fontSize: scaleFont(13), textAlign: 'center' },
  timelineItem: { gap: Spacing.sm },
  timelineConnector: {
    width: 20,
    alignItems: 'center',
    paddingTop: Spacing.xxs,
  },
  connectorLine: { width: 2, flex: 1, minHeight: 20 },
  connectorLineBottom: { marginTop: 0 },
  connectorDot: {
    width: 12,
    height: 12,
    borderRadius: Radii.sm,
    marginVertical: Spacing.xxs,
  },
  noteCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.sm,
  },
  noteHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  noteDate: { fontSize: scaleFont(14), fontWeight: '600' },
  noteTime: { fontSize: scaleFont(12) },
  progressBadge: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  progressBadgeText: { fontSize: scaleFont(12), fontWeight: '700' },
  noteContent: { fontSize: scaleFont(14), lineHeight: scaleFont(20) },
  noteAuthor: {
    fontSize: scaleFont(12),
    fontStyle: 'italic',
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
});
