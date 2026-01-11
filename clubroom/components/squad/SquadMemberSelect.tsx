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

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SquadMember } from '@/constants/types';
import {
  squadBulkInviteService,
  type SquadMemberWithSelection,
} from '@/services/squad-bulk-invite-service';

interface SquadMemberSelectProps {
  squadId: string;
  sessionId?: string;
  selectedMemberIds: string[];
  onSelectionChange: (memberIds: string[]) => void;
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
  showSelectAll = true,
  showNotificationCount = true,
  maxHeight = 400,
  disabled = false,
}: SquadMemberSelectProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [members, setMembers] = useState<SquadMemberWithSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMembers();
  }, [squadId, sessionId]);

  const loadMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await squadBulkInviteService.getSquadMembersWithMetadata(squadId, sessionId);
      setMembers(data);
    } catch (err) {
      console.error('Failed to load squad members:', err);
      setError('Failed to load squad members');
    } finally {
      setLoading(false);
    }
  };

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
                  backgroundColor: allSelected ? `${palette.tint}15` : palette.surface,
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
                style={{
                  fontSize: 12,
                  color: allSelected ? palette.tint : palette.text,
                  fontWeight: '600',
                }}
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </ThemedText>
            </Clickable>
          </View>
        </View>
      )}

      {/* Notification count banner */}
      {showNotificationCount && selectedCount > 0 && (
        <View style={[styles.notificationBanner, { backgroundColor: `${palette.tint}10` }]}>
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
                  backgroundColor: isSelected ? `${palette.tint}10` : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border,
                  opacity: isDisabled ? 0.5 : 1,
                },
              ]}
            >
              {/* Avatar */}
              <View style={[styles.avatar, { backgroundColor: `${palette.tint}15` }]}>
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
                <View style={[styles.pendingBadge, { backgroundColor: `${palette.warning}15` }]}>
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
                  {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
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
  loadingText: {
    fontSize: 13,
  },
  errorContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
  },
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
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
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
  notificationText: {
    fontSize: 13,
    fontWeight: '500',
  },
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
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
  },
  metaDot: {
    fontSize: 12,
  },
  parentText: {
    fontSize: 11,
    marginTop: 2,
  },
  pendingBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  pendingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
