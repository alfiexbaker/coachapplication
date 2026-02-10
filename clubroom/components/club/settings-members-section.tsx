import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Routes } from '@/navigation/routes';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { clubService, type ClubMember } from '@/services/club-service';
import type { ThemeColors } from '@/hooks/useTheme';

interface SettingsMembersSectionProps {
  members: ClubMember[];
  clubId: string | undefined;
  colors: ThemeColors;
}

export const SettingsMembersSection = memo(function SettingsMembersSection({
  members, clubId, colors,
}: SettingsMembersSectionProps) {
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <SurfaceCard style={styles.card}>
        <Row align="flex-start" justify="space-between">
          <View>
            <ThemedText type="defaultSemiBold" style={Typography.heading}>Members ({members.length})</ThemedText>
            <ThemedText style={[Typography.small, { color: colors.muted, marginTop: Spacing.micro }]}>Manage club members and roles</ThemedText>
          </View>
          <Clickable style={[styles.inviteBtn, { borderColor: colors.tint }]} onPress={() => router.push(Routes.CLUB_INVITE_MEMBERS)}>
            <Ionicons name="person-add-outline" size={18} color={colors.tint} />
            <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>Invite</ThemedText>
          </Clickable>
        </Row>

        {members.map((member) => (
          <Clickable
            key={member.userId}
            style={[styles.row, { borderColor: colors.border }]}
            onPress={() => { if (clubId) router.push(Routes.clubMember(clubId, member.userId)); }}
          >
            <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
              <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>{member.userName.charAt(0)}</ThemedText>
            </View>
            <View style={{ flex: 1, gap: Spacing.xs }}>
              <ThemedText type="defaultSemiBold">{member.userName}</ThemedText>
              <View style={[styles.roleBadge, { backgroundColor: withAlpha(clubService.getRoleColor(member.role), 0.12) }]}>
                <ThemedText style={[Typography.caption, { color: clubService.getRoleColor(member.role) }]}>{clubService.formatRole(member.role)}</ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Clickable>
        ))}
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  inviteBtn: { alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.full, borderWidth: 1.5 },
  row: { alignItems: 'center', gap: Spacing.md, padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
  avatar: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  roleBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.micro, borderRadius: Radii.sm, alignSelf: 'flex-start' },
});
