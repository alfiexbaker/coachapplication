import { useMemo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Club, ClubMembership, ClubSquad, SessionOffering, ClubInvite } from '@/constants/types';

export interface ClubHeaderProps {
  club: Club;
  membership: ClubMembership;
  onLeave: () => void;
}

export function ClubHeader({ club, membership, onLeave }: ClubHeaderProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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

  return (
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
