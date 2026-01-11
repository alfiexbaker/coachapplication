import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import type { Club, ClubMembership, ClubSquad, SessionOffering, ClubInvite } from '@/constants/types';
import { messagingService } from '@/services/messaging-service';

export interface ClubHeaderProps {
  club: Club;
  membership: ClubMembership;
  onLeave: () => void;
}

export function ClubHeader({ club, membership, onLeave }: ClubHeaderProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  // Check if user is a parent (not coach/admin/owner)
  const isParent = membership.role === 'MEMBER' || currentUser?.role === 'PARENT';
  const isCoachOrAdmin = membership.role === 'OWNER' || membership.role === 'HEAD_COACH' || membership.role === 'ADMIN' || membership.role === 'COACH';

  const roleLabel = useMemo(() => {
    switch (membership.role) {
      case 'OWNER': return 'Owner';
      case 'HEAD_COACH': return 'Head Coach';
      case 'ADMIN': return 'Admin';
      case 'COACH': return 'Coach';
      default: return 'Member';
    }
  }, [membership.role]);

  const badgeText = club.name?.slice(0, 2).toUpperCase() || 'CL';

  // Handle message coach action
  const handleMessageCoach = async () => {
    if (!currentUser) return;

    try {
      // Create or find a direct thread with the club owner
      const thread = await messagingService.createThread({
        participants: [
          { id: club.ownerId, name: club.ownerName, role: 'coach' },
          { id: currentUser.id, name: currentUser.fullName || currentUser.username || 'Parent', role: 'parent' },
        ],
        title: `Message ${club.ownerName}`,
        subtitle: `${club.name} coach`,
      });

      // Navigate to the chat
      router.push(`/chat/${thread.id}`);
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  // Handle opening group chat
  const handleOpenGroupChat = async () => {
    if (!currentUser) return;

    try {
      // Get or create the club group thread
      const userRole = isCoachOrAdmin ? 'coach' : 'parent';
      const thread = await messagingService.getOrCreateClubThread(
        club.id,
        club.name,
        currentUser.id,
        currentUser.fullName || currentUser.username || 'User',
        userRole
      );

      // Navigate to the chat
      router.push(`/chat/${thread.id}`);
    } catch (error) {
      console.error('Failed to open group chat:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.clubHeader}>
        <View style={[styles.clubAvatar, { backgroundColor: `${palette.tint}10` }]}>
          <ThemedText style={styles.clubAvatarText}>{badgeText}</ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="title" style={{ fontSize: 20 }}>{club.name}</ThemedText>
          <ThemedText style={{ color: palette.muted }}>{roleLabel} · {club.memberCount} members</ThemedText>
        </View>
        <TouchableOpacity onPress={onLeave} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="ellipsis-horizontal" size={20} color={palette.muted} />
        </TouchableOpacity>
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        {/* Group Chat button - for everyone */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
          onPress={handleOpenGroupChat}
        >
          <Ionicons name="chatbubbles-outline" size={18} color={palette.tint} />
          <ThemedText style={[styles.actionButtonText, { color: palette.tint }]}>
            Group Chat
          </ThemedText>
        </TouchableOpacity>

        {/* Message Coach button - only for parents */}
        {isParent && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: palette.tint }]}
            onPress={handleMessageCoach}
          >
            <Ionicons name="chatbubble-outline" size={18} color="#fff" />
            <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>
              Message Coach
            </ThemedText>
          </TouchableOpacity>
        )}

        {/* Broadcast button - only for coaches */}
        {isCoachOrAdmin && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: palette.tint }]}
            onPress={handleOpenGroupChat}
          >
            <Ionicons name="megaphone-outline" size={18} color="#fff" />
            <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>
              Broadcast
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export interface ClubStatsRowProps {
  memberCount: number;
  squads: ClubSquad[];
  sessions: SessionOffering[];
  invites: ClubInvite[];
  canManageMembers: boolean;
  showMembersSection: boolean;
  onToggleMembersSection: () => void;
}

export function ClubStatsRow({
  memberCount,
  squads,
  sessions,
  invites,
  canManageMembers,
  showMembersSection,
  onToggleMembersSection,
}: ClubStatsRowProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={[styles.statsRow, { borderColor: palette.border }]}>
      <TouchableOpacity
        style={styles.statItem}
        onPress={() => canManageMembers && onToggleMembersSection()}
      >
        <ThemedText type="title" style={{ fontSize: 18 }}>{memberCount}</ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <ThemedText style={{ color: palette.muted, fontSize: 12 }}>Members</ThemedText>
          {canManageMembers && (
            <Ionicons
              name={showMembersSection ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={palette.muted}
            />
          )}
        </View>
      </TouchableOpacity>
      <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
      <View style={styles.statItem}>
        <ThemedText type="title" style={{ fontSize: 18 }}>{squads.length}</ThemedText>
        <ThemedText style={{ color: palette.muted, fontSize: 12 }}>Squads</ThemedText>
      </View>
      <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
      <View style={styles.statItem}>
        <ThemedText type="title" style={{ fontSize: 18 }}>{sessions.length}</ThemedText>
        <ThemedText style={{ color: palette.muted, fontSize: 12 }}>Sessions</ThemedText>
      </View>
      <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
      <View style={styles.statItem}>
        <ThemedText type="title" style={{ fontSize: 18 }}>{invites.length}</ThemedText>
        <ThemedText style={{ color: palette.muted, fontSize: 12 }}>Invites</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  clubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  clubAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubAvatarText: {
    fontSize: 22,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
});
