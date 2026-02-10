import { memo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, Components, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { clubService, type ClubMember } from '@/services/club-service';

interface MemberProfileCardProps {
  member: ClubMember;
}

export const MemberProfileCard = memo(function MemberProfileCard({ member }: MemberProfileCardProps) {
  const { colors } = useTheme();
  const roleColor = clubService.getRoleColor(member.role);
  const initials = member.userName.slice(0, 2).toUpperCase();
  const joinDate = new Date(member.joinedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <SurfaceCard style={styles.card}>
      <Row gap="md" align="center">
        {member.userPhotoUrl ? (
          <Image source={{ uri: member.userPhotoUrl }} style={[styles.avatar, { borderColor: roleColor }]} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: withAlpha(roleColor, 0.09), borderColor: roleColor }]}>
            <ThemedText style={[Typography.display, { color: roleColor }]}>{initials}</ThemedText>
          </View>
        )}
        <View style={{ flex: 1, gap: Spacing.xs }}>
          <ThemedText type="title">{member.userName}</ThemedText>
          <Row style={[styles.roleBadge, { backgroundColor: withAlpha(roleColor, 0.09) }]}>
            <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
            <ThemedText style={[Typography.caption, { color: roleColor }]}>{clubService.formatRole(member.role)}</ThemedText>
          </Row>
        </View>
      </Row>

      <View style={[styles.details, { borderTopColor: colors.border }]}>
        <Row gap="xs" align="center">
          <Ionicons name="calendar-outline" size={16} color={colors.muted} />
          <ThemedText style={[Typography.small, { color: colors.muted }]}>Joined {joinDate}</ThemedText>
        </Row>
        <Row gap="xs" align="center">
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.muted} />
          <ThemedText style={[Typography.small, { color: colors.muted }]}>
            Status: {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
          </ThemedText>
        </Row>
        {member.squadIds && member.squadIds.length > 0 && (
          <Row gap="xs" align="center">
            <Ionicons name="people-outline" size={16} color={colors.muted} />
            <ThemedText style={[Typography.small, { color: colors.muted }]}>
              {member.squadIds.length} squad{member.squadIds.length !== 1 ? 's' : ''}
            </ThemedText>
          </Row>
        )}
      </View>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  avatar: { width: Components.avatar.lg, height: Components.avatar.lg, borderRadius: Components.avatar.lg / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  roleBadge: { alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs / 2, borderRadius: Radii.pill, alignSelf: 'flex-start' },
  roleDot: { width: 8, height: 8, borderRadius: Radii.xs },
  details: { borderTopWidth: 1, paddingTop: Spacing.md, gap: Spacing.sm },
});
