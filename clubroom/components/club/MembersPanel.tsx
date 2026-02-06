import { Platform, ActionSheetIOS, Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { clubService, type ClubMember } from '@/services/club-service';

export interface MemberRowProps {
  member: ClubMember;
  canRemove: boolean;
  onRemove?: () => void;
  onPress?: () => void;
}

export function MemberRow({ member, canRemove, onRemove, onPress }: MemberRowProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const roleColor = clubService.getRoleColor(member.role);
  const initials = member.userName.slice(0, 2).toUpperCase();

  const handleLongPress = () => {
    if (!canRemove || !onRemove) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Remove from Club'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: member.userName,
          message: clubService.formatRole(member.role),
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            onRemove();
          }
        }
      );
    } else {
      Alert.alert(
        member.userName,
        clubService.formatRole(member.role),
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove from Club',
            style: 'destructive',
            onPress: onRemove,
          },
        ]
      );
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={handleLongPress}
      delayLongPress={500}
      activeOpacity={0.7}
    >
      <View style={[styles.memberRow, { borderColor: palette.border }]}>
        <View style={[styles.memberAvatar, { backgroundColor: withAlpha(roleColor, 0.09) }]}>
          <ThemedText style={[styles.memberAvatarText, { color: roleColor }]}>{initials}</ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold">{member.userName}</ThemedText>
          <ThemedText style={{ ...Typography.caption, color: roleColor }}>
            {clubService.formatRole(member.role)}
          </ThemedText>
        </View>
        {member.status === 'pending' && (
          <Chip>Pending</Chip>
        )}
        <Ionicons name="chevron-forward" size={18} color={palette.muted} />
      </View>
    </TouchableOpacity>
  );
}

export interface MembersPanelProps {
  members: ClubMember[];
  canRemoveMembers: boolean;
  onRemoveMember: (member: ClubMember) => void;
  clubId?: string;
}

export function MembersPanel({ members, canRemoveMembers, onRemoveMember, clubId }: MembersPanelProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SurfaceCard style={styles.membersCard}>
      <View style={styles.membersSectionHeader}>
        <ThemedText type="defaultSemiBold">Club Members</ThemedText>
        <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
          Tap to manage
        </ThemedText>
      </View>
      <View style={styles.membersList}>
        {members.map((member) => (
          <MemberRow
            key={member.userId}
            member={member}
            canRemove={canRemoveMembers && clubService.canBeRemoved(member.role)}
            onRemove={() => onRemoveMember(member)}
            onPress={clubId ? () => {
              router.push(Routes.clubMember(clubId, member.userId));
            } : undefined}
          />
        ))}
        {members.length === 0 && (
          <ThemedText style={{ color: palette.muted, textAlign: 'center', paddingVertical: Spacing.md }}>
            No members found
          </ThemedText>
        )}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  membersCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  membersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  membersList: {
    gap: Spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    ...Typography.bodySmallSemiBold,
  },
});
