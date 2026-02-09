import { View, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { WaitlistPosition } from './WaitlistPosition';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { waitlistService } from '@/services/waitlist-service';
import type { WaitlistEntry, WaitlistSummary } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

interface WaitlistManageProps {
  /** Summary of the session's waitlist */
  summary: WaitlistSummary;
  /** Detailed entries when expanded */
  entries: WaitlistEntry[];
  /** Whether the card is expanded to show entries */
  isExpanded: boolean;
  /** Whether an action is in progress */
  isLoading?: boolean;
  /** Callback to toggle expand/collapse */
  onToggleExpand: () => void;
  /** Callback to notify next person in line */
  onNotifyNext: () => void;
  /** Callback to promote next person to booking */
  onPromote: () => void;
  /** Callback to remove an entry */
  onRemoveEntry: (entryId: string, userName: string) => void;
}

export function WaitlistManage({
  summary,
  entries,
  isExpanded,
  isLoading = false,
  onToggleExpand,
  onNotifyNext,
  onPromote,
  onRemoveEntry,
}: WaitlistManageProps) {
  const { colors: palette } = useTheme();

  const hasAutoBookers = summary.autoBookCount > 0;

  return (
    <SurfaceCard style={styles.card}>
      {/* Header - always visible */}
      <Clickable onPress={onToggleExpand} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.sessionInfo}>
            <ThemedText type="defaultSemiBold" style={styles.sessionTitle} numberOfLines={1}>
              {summary.sessionTitle}
            </ThemedText>
            <View style={styles.statsRow}>
              <View style={styles.statBadge}>
                <Ionicons name="people" size={12} color={palette.warning} />
                <ThemedText style={[styles.statText, { color: palette.warning }]}>
                  {summary.totalWaiting} waiting
                </ThemedText>
              </View>
              {hasAutoBookers && (
                <View style={[styles.statBadge, { backgroundColor: withAlpha(palette.success, 0.06) }]}>
                  <Ionicons name="flash" size={12} color={palette.success} />
                  <ThemedText style={[styles.statText, { color: palette.success }]}>
                    {summary.autoBookCount} auto
                  </ThemedText>
                </View>
              )}
            </View>
          </View>

          <View style={styles.headerRight}>
            {summary.nextInLine && (
              <WaitlistPosition position={1} size="small" compact />
            )}
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={palette.muted}
            />
          </View>
        </View>
      </Clickable>

      {/* Actions - always visible when there are waiters */}
      {summary.totalWaiting > 0 && (
        <View style={[styles.actions, { borderTopColor: palette.border }]}>
          <Clickable
            onPress={onNotifyNext}
            disabled={isLoading}
            style={[styles.actionButton, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={palette.tint} />
            ) : (
              <>
                <Ionicons name="notifications-outline" size={16} color={palette.tint} />
                <ThemedText style={[styles.actionButtonText, { color: palette.tint }]}>
                  Notify Next
                </ThemedText>
              </>
            )}
          </Clickable>

          <Clickable
            onPress={onPromote}
            disabled={isLoading}
            style={[styles.actionButton, { backgroundColor: withAlpha(palette.success, 0.06) }]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={palette.success} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color={palette.success} />
                <ThemedText style={[styles.actionButtonText, { color: palette.success }]}>
                  Book Next
                </ThemedText>
              </>
            )}
          </Clickable>
        </View>
      )}

      {/* Expanded entries list */}
      {isExpanded && entries.length > 0 && (
        <View style={[styles.entriesList, { borderTopColor: palette.border }]}>
          <ThemedText style={[styles.entriesHeader, { color: palette.muted }]}>
            Waitlist ({entries.length})
          </ThemedText>

          {entries.map((entry, index) => (
            <View
              key={entry.id}
              style={[
                styles.entryRow,
                index < entries.length - 1 ? { borderBottomColor: palette.border, borderBottomWidth: 1 } : undefined,
              ]}
            >
              <View style={styles.entryInfo}>
                <View style={[styles.positionCircle, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
                  <ThemedText style={[styles.positionNumber, { color: palette.warning }]}>
                    {entry.position}
                  </ThemedText>
                </View>

                <View style={styles.userInfo}>
                  {entry.userPhotoUrl ? (
                    <Image source={{ uri: entry.userPhotoUrl }} style={styles.userPhoto} />
                  ) : (
                    <View style={[styles.userPhotoPlaceholder, { backgroundColor: palette.border }]}>
                      <Ionicons name="person" size={14} color={palette.muted} />
                    </View>
                  )}
                  <View style={styles.userDetails}>
                    <ThemedText type="defaultSemiBold" style={styles.userName}>
                      {entry.userName}
                    </ThemedText>
                    <View style={styles.entryMeta}>
                      <ThemedText style={[styles.joinedTime, { color: palette.muted }]}>
                        {waitlistService.formatTimeAgo(entry.joinedAt)}
                      </ThemedText>
                      {entry.autoBook && (
                        <View style={[styles.autoBookBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
                          <Ionicons name="flash" size={10} color={palette.success} />
                          <ThemedText style={[styles.autoBookText, { color: palette.success }]}>
                            Auto
                          </ThemedText>
                        </View>
                      )}
                      {entry.status === 'NOTIFIED' && (
                        <View style={[styles.notifiedBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                          <Ionicons name="notifications" size={10} color={palette.tint} />
                          <ThemedText style={[styles.notifiedText, { color: palette.tint }]}>
                            Notified
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>

              <Clickable
                onPress={() => onRemoveEntry(entry.id, entry.userName)}
                hitSlop={8}
                style={styles.removeButton}
              >
                <Ionicons name="close-circle" size={20} color={palette.error} />
              </Clickable>
            </View>
          ))}
        </View>
      )}

      {isExpanded && entries.length === 0 && (
        <View style={[styles.emptyState, { borderTopColor: palette.border }]}>
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
            No one currently on the waitlist
          </ThemedText>
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  header: {
    padding: Spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionInfo: {
    flex: 1,
    marginRight: Spacing.md,
    gap: Spacing.xxs,
  },
  sessionTitle: { ...Typography.body },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: 8,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(199, 128, 0, 0.1)',
  },
  statText: { ...Typography.caption },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
  },
  actionButtonText: { ...Typography.smallSemiBold },
  entriesList: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  entriesHeader: { ...Typography.caption, textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  entryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  positionCircle: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionNumber: { ...Typography.caption },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  userPhoto: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
  },
  userPhotoPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDetails: {
    flex: 1,
    gap: Spacing.micro,
  },
  userName: { ...Typography.bodySmall },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  joinedTime: { ...Typography.caption },
  autoBookBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.micro,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  autoBookText: { ...Typography.micro },
  notifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.micro,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  notifiedText: { ...Typography.micro },
  removeButton: {
    padding: Spacing.xxs,
  },
  emptyState: {
    borderTopWidth: 1,
    padding: Spacing.md,
    alignItems: 'center',
  },
  emptyText: { ...Typography.small },
});
