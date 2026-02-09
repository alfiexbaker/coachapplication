/**
 * Extracted sub-components for WaitlistManage.
 *
 * WaitlistHeader — session title + stats + chevron.
 * WaitlistActions — Notify Next + Book Next buttons.
 * WaitlistEntryRow — single entry: position, avatar, name, badges, remove.
 * WaitlistEmptyExpanded — empty expanded state.
 */

import React, { memo } from 'react';
import { View, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { WaitlistPosition } from './WaitlistPosition';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { waitlistService } from '@/services/waitlist-service';
import type { WaitlistEntry, WaitlistSummary } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

// ─── WaitlistHeader ───────────────────────────────────────────────────────────

interface WaitlistHeaderProps {
  summary: WaitlistSummary;
  isExpanded: boolean;
  onToggleExpand: () => void;
  palette: ThemeColors;
}

export const WaitlistHeader = memo(function WaitlistHeader({
  summary,
  isExpanded,
  onToggleExpand,
  palette,
}: WaitlistHeaderProps) {
  const hasAutoBookers = summary.autoBookCount > 0;

  return (
    <Clickable onPress={onToggleExpand} style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.sessionInfo}>
          <ThemedText type="defaultSemiBold" style={styles.sessionTitle} numberOfLines={1}>
            {summary.sessionTitle}
          </ThemedText>
          <View style={styles.statsRow}>
            <View style={[styles.statBadge, { backgroundColor: withAlpha(palette.warning, 0.1) }]}>
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
  );
});

// ─── WaitlistActions ──────────────────────────────────────────────────────────

interface WaitlistActionsProps {
  isLoading: boolean;
  onNotifyNext: () => void;
  onPromote: () => void;
  palette: ThemeColors;
}

export const WaitlistActions = memo(function WaitlistActions({
  isLoading,
  onNotifyNext,
  onPromote,
  palette,
}: WaitlistActionsProps) {
  return (
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
  );
});

// ─── WaitlistEntryRow ─────────────────────────────────────────────────────────

interface WaitlistEntryRowProps {
  entry: WaitlistEntry;
  isLast: boolean;
  onRemoveEntry: (entryId: string, userName: string) => void;
  palette: ThemeColors;
}

export const WaitlistEntryRow = memo(function WaitlistEntryRow({
  entry,
  isLast,
  onRemoveEntry,
  palette,
}: WaitlistEntryRowProps) {
  return (
    <View
      style={[
        styles.entryRow,
        !isLast ? { borderBottomColor: palette.border, borderBottomWidth: 1 } : undefined,
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
        accessibilityLabel="Remove from waitlist"
        onPress={() => onRemoveEntry(entry.id, entry.userName)}
        hitSlop={8}
        style={styles.removeButton}
      >
        <Ionicons name="close-circle" size={20} color={palette.error} />
      </Clickable>
    </View>
  );
});

// ─── WaitlistEmptyExpanded ────────────────────────────────────────────────────

interface WaitlistEmptyExpandedProps {
  palette: ThemeColors;
}

export const WaitlistEmptyExpanded = memo(function WaitlistEmptyExpanded({
  palette,
}: WaitlistEmptyExpandedProps) {
  return (
    <View style={[styles.emptyState, { borderTopColor: palette.border }]}>
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
        No one currently on the waitlist
      </ThemedText>
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
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
    // backgroundColor applied inline via palette.warning
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
  entriesHeader: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
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
