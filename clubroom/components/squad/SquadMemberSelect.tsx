/**
 * Squad Member Select Component
 *
 * Multi-select component for choosing squad members to invite.
 * Features:
 * - Select all / none toggle
 * - Individual member selection
 * - Shows member details (name, age, position)
 * - Indicates already invited members
 * - Calculates unique parent notification count
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { createLogger } from '@/utils/logger';
import {
  inviteService as squadBulkInviteService,
  type SquadMemberWithSelection,
} from '@/services/invite';
import { useTheme } from '@/hooks/useTheme';

const logger = createLogger('SquadMemberSelect');

interface SquadMemberSelectProps {
  squadId: string;
  sessionId?: string;
  selectedMemberIds: string[];
  onSelectionChange: (memberIds: string[]) => void;
  onParentCountChange?: (count: number) => void;
  showSelectAll?: boolean;
  showNotificationCount?: boolean;
  maxHeight?: number;
  disabled?: boolean;
}

export function SquadMemberSelect({
  squadId,
  sessionId,
  selectedMemberIds,
  onSelectionChange,
  onParentCountChange,
  showSelectAll = true,
  showNotificationCount = true,
  maxHeight = 400,
  disabled = false,
}: SquadMemberSelectProps) {
  const { colors: palette } = useTheme();

  const [members, setMembers] = useState<SquadMemberWithSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await squadBulkInviteService.getSquadMembersWithMetadata(squadId, sessionId);
      setMembers(data);
    } catch (err) {
      logger.error('Failed to load squad members', err);
      setError('Failed to load squad members');
    } finally {
      setLoading(false);
    }
  }, [squadId, sessionId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const toggleMember = useCallback(
    (memberId: string) => {
      if (disabled) return;
      const newSelection = selectedMemberIds.includes(memberId)
        ? selectedMemberIds.filter((id) => id !== memberId)
        : [...selectedMemberIds, memberId];
      onSelectionChange(newSelection);
    },
    [selectedMemberIds, onSelectionChange, disabled]
  );

  const selectAll = useCallback(() => {
    if (disabled) return;
    const allIds = members
      .filter((m) => !m.hasPendingInvite)
      .map((m) => m.id);
    onSelectionChange(allIds);
  }, [members, onSelectionChange, disabled]);

  const selectNone = useCallback(() => {
    if (disabled) return;
    onSelectionChange([]);
  }, [onSelectionChange, disabled]);

  const uniqueParentCount = useMemo(() => {
    const selectedMembers = members.filter((m) => selectedMemberIds.includes(m.id));
    const uniqueParents = new Set(selectedMembers.map((m) => m.parentId));
    return uniqueParents.size;
  }, [members, selectedMemberIds]);

  // Report parent count changes to parent component
  useEffect(() => {
    onParentCountChange?.(uniqueParentCount);
  }, [uniqueParentCount, onParentCountChange]);

  const selectedCount = selectedMemberIds.length;
  const allSelected = selectedCount > 0 && selectedCount === members.filter((m) => !m.hasPendingInvite).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={palette.tint} />
        <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
          Loading squad members...
        </ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={24} color={palette.error} />
        <ThemedText style={[styles.errorText, { color: palette.error }]}>
          {error}
        </ThemedText>
        <Clickable onPress={loadMembers} style={[styles.retryButton, { borderColor: palette.tint }]}>
          <ThemedText style={{ color: palette.tint }}>Retry</ThemedText>
        </Clickable>
      </View>
    );
  }

  if (members.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={48} color={palette.muted} />
        <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
          No members in this squad
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with select all/none */}
      {showSelectAll && (
        <View style={styles.headerRow}>
          <ThemedText type="defaultSemiBold">
            {selectedCount} of {members.length} selected
          </ThemedText>
          <View style={styles.headerActions}>
            <Clickable
              onPress={allSelected ? selectNone : selectAll}
              disabled={disabled}
              style={[
                styles.selectAllButton,
                {
                  backgroundColor: allSelected ? withAlpha(palette.tint, 0.09) : palette.surface,
                  borderColor: allSelected ? palette.tint : palette.border,
                  opacity: disabled ? 0.5 : 1,
                },
              ]}
            >
              <Ionicons
                name={allSelected ? 'checkmark-done' : 'checkbox-outline'}
                size={14}
                color={allSelected ? palette.tint : palette.muted}
              />
              <ThemedText
                style={{ ...Typography.caption, color: allSelected ? palette.tint : palette.text,
                  fontWeight: '600' }}
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </ThemedText>
            </Clickable>
          </View>
        </View>
      )}

      {/* Notification count banner */}
      {showNotificationCount && selectedCount > 0 && (
        <View style={[styles.notificationBanner, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
          <Ionicons name="notifications-outline" size={16} color={palette.tint} />
          <ThemedText style={[styles.notificationText, { color: palette.tint }]}>
            {uniqueParentCount} parent{uniqueParentCount !== 1 ? 's' : ''} will receive notifications
          </ThemedText>
        </View>
      )}

      {/* Member list */}
      <ScrollView
        style={[styles.memberList, { maxHeight }]}
        contentContainerStyle={styles.memberListContent}
        showsVerticalScrollIndicator={false}
      >
        {members.map((member) => {
          const isSelected = selectedMemberIds.includes(member.id);
          const isDisabled = disabled || member.hasPendingInvite;

          return (
            <Clickable
              key={member.id}
              onPress={() => toggleMember(member.id)}
              disabled={isDisabled}
              style={[
                styles.memberItem,
                {
                  backgroundColor: isSelected ? withAlpha(palette.tint, 0.06) : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border,
                  opacity: isDisabled ? 0.5 : 1,
                },
              ]}
            >
              {/* Avatar */}
              <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                {member.athletePhotoUrl ? (
                  <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                    {member.athleteName.charAt(0)}
                  </ThemedText>
                ) : (
                  <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                    {member.athleteName.charAt(0)}
                  </ThemedText>
                )}
              </View>

              {/* Member info */}
              <View style={styles.memberInfo}>
                <ThemedText type="defaultSemiBold">{member.athleteName}</ThemedText>
                <View style={styles.memberMeta}>
                  {member.athleteAge && (
                    <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                      Age {member.athleteAge}
                    </ThemedText>
                  )}
                  {member.position && (
                    <>
                      <ThemedText style={[styles.metaDot, { color: palette.muted }]}>
                        {' '}{'\u2022'}{' '}
                      </ThemedText>
                      <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                        {member.position}
                      </ThemedText>
                    </>
                  )}
                  {member.jerseyNumber && (
                    <>
                      <ThemedText style={[styles.metaDot, { color: palette.muted }]}>
                        {' '}{'\u2022'}{' '}
                      </ThemedText>
                      <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                        #{member.jerseyNumber}
                      </ThemedText>
                    </>
                  )}
                </View>
                <ThemedText style={[styles.parentText, { color: palette.muted }]}>
                  Parent: {member.parentName}
                </ThemedText>
              </View>

              {/* Status indicator or checkbox */}
              {member.hasPendingInvite ? (
                <View style={[styles.pendingBadge, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
                  <ThemedText style={[styles.pendingText, { color: palette.warning }]}>
                    Invited
                  </ThemedText>
                </View>
              ) : (
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: isSelected ? palette.tint : 'transparent',
                      borderColor: isSelected ? palette.tint : palette.border,
                    },
                  ]}
                >
                  {isSelected && <Ionicons name="checkmark" size={14} color={palette.onPrimary} />}
                </View>
              )}
            </Clickable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  loadingText: { ...Typography.small },
  errorContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  errorText: { ...Typography.small, textAlign: 'center' },
  retryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  emptyContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  emptyText: { ...Typography.small, textAlign: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  notificationText: { ...Typography.smallSemiBold },
  memberList: {
    flex: 1,
  },
  memberListContent: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.heading },
  memberInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: { ...Typography.caption },
  metaDot: { ...Typography.caption },
  parentText: { ...Typography.caption, marginTop: Spacing.micro },
  pendingBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  pendingText: { ...Typography.caption },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
