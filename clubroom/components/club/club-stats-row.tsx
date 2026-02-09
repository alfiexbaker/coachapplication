import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ClubStatsRowProps {
  memberCount: number;
  squadCount: number;
  sessionCount: number;
  inviteCount: number;
  canManageMembers: boolean;
  showMembersSection: boolean;
  onToggleMembersSection: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const ClubStatsRow = memo(function ClubStatsRow({
  memberCount,
  squadCount,
  sessionCount,
  inviteCount,
  canManageMembers,
  showMembersSection,
  onToggleMembersSection,
}: ClubStatsRowProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={[styles.statsRow, { borderColor: palette.border }]}>
      <Clickable style={styles.statItem} onPress={() => canManageMembers && onToggleMembersSection()}>
        <ThemedText type="title" style={{ ...Typography.heading }}>{memberCount}</ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.micro }}>
          <ThemedText style={{ ...Typography.caption, color: palette.muted }}>Members</ThemedText>
          {canManageMembers && (
            <Ionicons name={showMembersSection ? 'chevron-up' : 'chevron-down'} size={12} color={palette.muted} />
          )}
        </View>
      </Clickable>
      <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
      <View style={styles.statItem}>
        <ThemedText type="title" style={{ ...Typography.heading }}>{squadCount}</ThemedText>
        <ThemedText style={{ ...Typography.caption, color: palette.muted }}>Squads</ThemedText>
      </View>
      <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
      <View style={styles.statItem}>
        <ThemedText type="title" style={{ ...Typography.heading }}>{sessionCount}</ThemedText>
        <ThemedText style={{ ...Typography.caption, color: palette.muted }}>Sessions</ThemedText>
      </View>
      <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
      <View style={styles.statItem}>
        <ThemedText type="title" style={{ ...Typography.heading }}>{inviteCount}</ThemedText>
        <ThemedText style={{ ...Typography.caption, color: palette.muted }}>Invites</ThemedText>
      </View>
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', paddingVertical: Spacing.md, marginHorizontal: Spacing.md, borderTopWidth: 1, borderBottomWidth: 1 },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: '100%' },
});
