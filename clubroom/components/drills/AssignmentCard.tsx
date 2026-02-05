/**
 * AssignmentCard Component
 *
 * Displays an assigned drill with due date, completion status, and progress.
 * Shows overdue state in red and due-soon state in amber.
 */

import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, View, ViewStyle } from 'react-native';

import { DifficultyBadge } from './DifficultyBadge';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { AssignedDrill } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { drillService } from '@/services/drill-service';
import { scaleFont } from '@/utils/scale';

interface AssignmentCardProps {
  /** The assignment to display */
  assignment: AssignedDrill;
  /** Callback when card is pressed */
  onPress?: () => void;
  /** Callback when complete button is pressed */
  onComplete?: () => void;
  /** Whether to show in compact mode */
  compact?: boolean;
}

/**
 * Card component for displaying an assigned drill with due date and status.
 */
export function AssignmentCard({
  assignment,
  onPress,
  onComplete,
  compact = false,
}: AssignmentCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const { drill } = assignment;
  const isOverdue = drillService.isOverdue(assignment);
  const isDueSoon = drillService.isDueSoon(assignment);
  const categoryInfo = drill ? drillService.getCategoryInfo(drill.category) : null;
  const hasVideo = Boolean(drill?.videoUrl);

  // Determine status color
  const getStatusColor = () => {
    if (assignment.isCompleted) return palette.success;
    if (isOverdue) return palette.error;
    if (isDueSoon) return palette.warning;
    return palette.muted;
  };

  const statusColor = getStatusColor();

  // Format due date with status
  const getDueDateText = () => {
    if (assignment.isCompleted) {
      return `Completed ${new Date(assignment.completedAt as string).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      })}`;
    }
    const prefix = isOverdue ? 'Overdue: ' : isDueSoon ? 'Due soon: ' : 'Due ';
    return prefix + drillService.formatDueDate(assignment.dueDate);
  };

  if (compact) {
    return (
      <SurfaceCard style={styles.compactCard} onPress={onPress}>
        {/* Completion checkbox */}
        <Clickable
          onPress={onComplete}
          style={[
            styles.checkbox,
            assignment.isCompleted ? styles.checkboxCompleted : undefined,
            { borderColor: assignment.isCompleted ? palette.success : palette.border },
          ].filter(Boolean) as ViewStyle[]}
          hitSlop={8}
        >
          {assignment.isCompleted && (
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          )}
        </Clickable>

        {/* Content */}
        <View style={styles.compactContent}>
          <View style={styles.compactHeader}>
            <ThemedText
              type="defaultSemiBold"
              style={[
                styles.compactTitle,
                assignment.isCompleted ? styles.completedText : undefined,
              ]}
              numberOfLines={1}
            >
              {drill?.title ?? 'Unknown Drill'}
            </ThemedText>
            {hasVideo && (
              <Ionicons name="videocam" size={14} color={palette.muted} />
            )}
          </View>
          <View style={styles.compactMeta}>
            <View style={styles.metaItem}>
              <Ionicons
                name={assignment.isCompleted ? 'checkmark-circle' : 'calendar-outline'}
                size={12}
                color={statusColor}
              />
              <ThemedText style={[styles.metaText, { color: statusColor }]}>
                {getDueDateText()}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Priority indicator */}
        {!assignment.isCompleted && assignment.priority === 1 && (
          <View style={[styles.priorityBadge, { backgroundColor: `${palette.error}15` }]}>
            <Ionicons name="alert-circle" size={12} color={palette.error} />
          </View>
        )}

        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      {/* Status bar */}
      <View style={[styles.statusBar, { backgroundColor: statusColor }]} />

      <View style={styles.cardContent}>
        {/* Thumbnail with completion overlay */}
        {drill?.thumbnailUrl && (
          <View style={styles.thumbnailContainer}>
            <Image source={{ uri: drill.thumbnailUrl }} style={styles.thumbnail} />
            {assignment.isCompleted && (
              <View style={styles.completedOverlay}>
                <Ionicons name="checkmark-circle" size={48} color="#FFFFFF" />
              </View>
            )}
            {hasVideo && !assignment.isCompleted && (
              <View style={styles.playOverlay}>
                <View style={styles.playButton}>
                  <Ionicons name="play" size={20} color="#FFFFFF" />
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.content}>
          {/* Header with category and priority */}
          <View style={styles.header}>
            {categoryInfo && (
              <View style={[styles.categoryBadge, { backgroundColor: `${categoryInfo.color}20` }]}>
                <Ionicons
                  name={categoryInfo.icon as keyof typeof Ionicons.glyphMap}
                  size={12}
                  color={categoryInfo.color}
                />
                <ThemedText style={[styles.categoryText, { color: categoryInfo.color }]}>
                  {categoryInfo.label}
                </ThemedText>
              </View>
            )}
            {!assignment.isCompleted && assignment.priority === 1 && (
              <View style={[styles.priorityBadgeFull, { backgroundColor: `${palette.error}15` }]}>
                <Ionicons name="alert-circle" size={12} color={palette.error} />
                <ThemedText style={[styles.priorityText, { color: palette.error }]}>
                  Priority
                </ThemedText>
              </View>
            )}
          </View>

          {/* Title */}
          <ThemedText
            type="defaultSemiBold"
            style={[styles.title, assignment.isCompleted ? styles.completedText : undefined]}
            numberOfLines={2}
          >
            {drill?.title ?? 'Unknown Drill'}
          </ThemedText>

          {/* Coach notes */}
          {assignment.notes && (
            <View style={[styles.notesContainer, { backgroundColor: palette.surfaceSecondary }]}>
              <Ionicons name="chatbubble-outline" size={12} color={palette.muted} />
              <ThemedText style={[styles.notesText, { color: palette.muted }]} numberOfLines={2}>
                {assignment.notes}
              </ThemedText>
            </View>
          )}

          {/* Footer with due date and actions */}
          <View style={styles.footer}>
            <View style={styles.dueDateContainer}>
              <Ionicons
                name={assignment.isCompleted ? 'checkmark-circle' : 'calendar-outline'}
                size={16}
                color={statusColor}
              />
              <ThemedText style={[styles.dueDateText, { color: statusColor }]}>
                {getDueDateText()}
              </ThemedText>
            </View>

            <View style={styles.footerRight}>
              {drill && <DifficultyBadge difficulty={drill.difficulty} size="small" />}
              {drill?.duration && (
                <View style={styles.durationBadge}>
                  <Ionicons name="time-outline" size={12} color={palette.muted} />
                  <ThemedText style={[styles.durationText, { color: palette.muted }]}>
                    {drillService.formatDuration(drill.duration)}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Repetitions indicator */}
          {assignment.repetitions && assignment.repetitions > 1 && (
            <View style={[styles.repetitionsContainer, { backgroundColor: palette.surfaceSecondary }]}>
              <Ionicons name="repeat" size={14} color={palette.tint} />
              <ThemedText style={[styles.repetitionsText, { color: palette.tint }]}>
                {assignment.repetitions} sets
              </ThemedText>
            </View>
          )}

          {/* Complete button */}
          {!assignment.isCompleted && onComplete && (
            <Clickable
              onPress={onComplete}
              style={[styles.completeButton, { backgroundColor: palette.tint }]}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <ThemedText style={styles.completeButtonText}>Mark Complete</ThemedText>
            </Clickable>
          )}
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
  statusBar: {
    height: 4,
    width: '100%',
  },
  cardContent: {
    // Content wrapper
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: 140,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  completedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 185, 129, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  categoryText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
  },
  priorityBadgeFull: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  priorityText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
  },
  title: {
    fontSize: scaleFont(17),
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: scaleFont(24),
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    marginTop: 4,
  },
  notesText: {
    flex: 1,
    fontSize: scaleFont(13),
    lineHeight: scaleFont(18),
    fontStyle: 'italic',
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
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dueDateText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    fontSize: scaleFont(12),
  },
  repetitionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    marginTop: 4,
  },
  repetitionsText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radii.md,
    marginTop: Spacing.sm,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: scaleFont(15),
    fontWeight: '600',
  },

  // Compact styles
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
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
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: scaleFont(12),
  },
  priorityBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
