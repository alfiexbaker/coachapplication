import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { Routes } from '@/navigation/routes';
import { clubService, type ClubMember } from '@/services/club-service';
import type { ThemeColors } from '@/hooks/useTheme';

interface SquadMembersCardProps {
  members: ClubMember[];
  clubId: string | null;
  showAddMembers: boolean;
  colors: ThemeColors;
  onToggleAdd: () => void;
  onRemove: (member: ClubMember) => void;
}

export const SquadMembersCard = memo(function SquadMembersCard({
  members,
  clubId,
  showAddMembers,
  colors,
  onToggleAdd,
  onRemove,
}: SquadMembersCardProps) {
  return (
    <SurfaceCard style={styles.card}>
      <Row align="center" justify="space-between">
        <ThemedText type="defaultSemiBold" style={Typography.subheading}>
          Squad Members ({members.length})
        </ThemedText>
        <Clickable
          style={[styles.addBtn, { backgroundColor: withAlpha(colors.tint, 0.06) }]}
          onPress={onToggleAdd}
        >
          <Row align="center" gap="xxs">
            <Ionicons
              name={showAddMembers ? 'close' : 'person-add-outline'}
              size={16}
              color={colors.tint}
            />
            <ThemedText style={[Typography.caption, { color: colors.tint }]}>
              {showAddMembers ? 'Done' : 'Add'}
            </ThemedText>
          </Row>
        </Clickable>
      </Row>

      {members.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={40} color={colors.muted} />
          <ThemedText style={[Typography.body, { color: colors.muted, textAlign: 'center' }]}>
            No members in this squad yet. Add members from the club roster.
          </ThemedText>
        </View>
      ) : (
        <View style={styles.list}>
          {members.map((member) => {
            const roleColor = clubService.getRoleColor(member.role);
            const initials = member.userName.slice(0, 2).toUpperCase();
            return (
              <Clickable
                key={member.userId}
                style={[styles.row, { borderBottomColor: colors.border }]}
                onPress={() => {
                  if (clubId) router.push(Routes.clubMember(clubId, member.userId));
                }}
              >
                <Row align="center" gap="sm">
                  <View style={[styles.avatar, { backgroundColor: withAlpha(roleColor, 0.09) }]}>
                    <ThemedText style={[Typography.smallSemiBold, { color: roleColor }]}>
                      {initials}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold">{member.userName}</ThemedText>
                    <ThemedText style={[Typography.caption, { color: roleColor }]}>
                      {clubService.formatRole(member.role)}
                    </ThemedText>
                  </View>
                  <Row gap="xs" align="center">
                    <Clickable onPress={() => onRemove(member)} hitSlop={8}>
                      <Ionicons name="remove-circle-outline" size={20} color={colors.error} />
                    </Clickable>
                    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                  </Row>
                </Row>
              </Clickable>
            );
          })}
        </View>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  addBtn: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  empty: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm },
  list: { gap: Spacing.xxs },
  row: { paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
