import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { Routes } from '@/navigation/routes';
import { clubService, type ClubMember } from '@/services/club-service';
import type { ThemeColors } from '@/hooks/useTheme';
import { uiFeedback } from '@/services/ui-feedback';

/**
 * Formats a name for privacy: coaches see full names, parents see "First L." for
 * other children, and full names for their own children.
 */
function formatNameForPrivacy(
  name: string,
  viewerRole: 'coach' | 'parent' | 'athlete',
): string {
  if (viewerRole === 'coach') return name;

  const parts = name.split(' ');
  if (parts.length === 0) return name;

  const firstName = parts[0];
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0] : '';

  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
}

interface SquadMembersCardProps {
  members: ClubMember[];
  clubId: string | null;
  showAddMembers: boolean;
  colors: ThemeColors;
  viewerRole?: 'coach' | 'parent' | 'athlete';
  onToggleAdd: () => void;
  onRemove: (member: ClubMember) => void;
}

export const SquadMembersCard = function SquadMembersCard({
  members,
  clubId,
  showAddMembers,
  colors,
  viewerRole = 'coach',
  onToggleAdd,
  onRemove,
}: SquadMembersCardProps) {
  const handleRemove = (member: ClubMember) => {
    uiFeedback.alert(
      'Remove Squad Member',
      `Remove ${member.userName} from this squad?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemove(member),
        },
      ],
    );
  };

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
            const displayName = formatNameForPrivacy(member.userName, viewerRole);
            const initials = displayName.slice(0, 2).toUpperCase();
            return (
              <View key={member.userId} style={[styles.row, { borderBottomColor: colors.border }]}>
                <Row align="center" gap="xs">
                  <Clickable
                    style={styles.rowMainAction}
                    onPress={() => {
                      if (clubId) router.push(Routes.clubMember(clubId, member.userId));
                    }}
                    accessibilityLabel={`View ${member.userName}`}
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
                      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                    </Row>
                  </Clickable>

                  <Clickable
                    onPress={() => handleRemove(member)}
                    hitSlop={8}
                    accessibilityLabel={`Remove ${member.userName}`}
                  >
                    <Ionicons name="remove-circle-outline" size={20} color={colors.error} />
                  </Clickable>
                </Row>
              </View>
            );
          })}
        </View>
      )}
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  addBtn: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  empty: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.sm },
  list: { gap: Spacing.xxs },
  row: { paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  rowMainAction: { flex: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
