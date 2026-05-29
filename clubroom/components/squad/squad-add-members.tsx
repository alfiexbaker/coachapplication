import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { clubService, type ClubMember } from '@/services/club-service';
import type { ThemeColors } from '@/hooks/useTheme';

import { runAsyncFinally } from '@/utils/async-control';

interface SquadAddMembersProps {
  visible: boolean;
  membersNotInSquad: ClubMember[];
  squadName: string;
  colors: ThemeColors;
  onAdd: (member: ClubMember) => void;
}

export const SquadAddMembers = function SquadAddMembers({
  visible,
  membersNotInSquad,
  squadName,
  colors,
  onAdd,
}: SquadAddMembersProps) {
  const [isAddingByMemberId, setIsAddingByMemberId] = useState<Map<string, boolean>>(new Map());

  const handleAddMember = async (member: ClubMember) => {
    if (isAddingByMemberId.get(member.userId)) return;

    setIsAddingByMemberId((prev) => new Map(prev).set(member.userId, true));

    await runAsyncFinally(async () => {
      await Promise.resolve(onAdd(member));
    }, () => {
      setIsAddingByMemberId((prev) => {
        const next = new Map(prev);
        next.delete(member.userId);
        return next;
      });
    });
  };

  if (!visible) return null;

  if (membersNotInSquad.length === 0) {
    return (
      <SurfaceCard style={styles.card}>
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle-outline" size={32} color={colors.success} />
          <ThemedText style={[Typography.body, { color: colors.muted, textAlign: 'center' }]}>
            All club members are already in this squad.
          </ThemedText>
        </View>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="defaultSemiBold">Add Club Members</ThemedText>
      <ThemedText style={[Typography.small, { color: colors.muted }]}>
        Tap to add to {squadName}
      </ThemedText>
      <View style={styles.list}>
        {membersNotInSquad.map((member) => {
          const roleColor = clubService.getRoleColor(member.role);
          const initials = member.userName.slice(0, 2).toUpperCase();
          const isAdding = Boolean(isAddingByMemberId.get(member.userId));
          return (
            <Clickable
              key={member.userId}
              style={[styles.row, { borderColor: colors.border }]}
              onPress={() => {
                void handleAddMember(member);
              }}
              disabled={isAdding}
            >
              <Row align="center" gap="sm">
                <View style={[styles.avatar, { backgroundColor: withAlpha(roleColor, 0.09) }]}>
                  <ThemedText style={[Typography.smallSemiBold, { color: roleColor }]}>
                    {initials}
                  </ThemedText>
                </View>
                <Column flex>
                  <ThemedText type="defaultSemiBold">{member.userName}</ThemedText>
                  <ThemedText style={[Typography.caption, { color: roleColor }]}>
                    {clubService.formatRole(member.role)}
                  </ThemedText>
                </Column>
                <View style={styles.addAction}>
                  {isAdding ? (
                    <Row align="center" gap="xxs">
                      <ActivityIndicator size="small" color={colors.tint} />
                      <ThemedText style={[Typography.caption, { color: colors.tint }]}>
                        Adding…
                      </ThemedText>
                    </Row>
                  ) : (
                    <View style={[styles.addIcon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
                      <Ionicons name="add" size={18} color={colors.tint} />
                    </View>
                  )}
                </View>
              </Row>
            </Clickable>
          );
        })}
      </View>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  empty: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm },
  list: { gap: Spacing.xxs },
  row: { padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAction: {
    minWidth: 72,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
