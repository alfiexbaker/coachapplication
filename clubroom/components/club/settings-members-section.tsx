import React from 'react';
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

export const SettingsMembersSection = function SettingsMembersSection({
  members,
  clubId,
  colors,
}: SettingsMembersSectionProps) {
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <SurfaceCard style={styles.card}>
        <Row align="center" justify="space-between" gap="sm">
          <View style={styles.headerText}>
            <ThemedText type="defaultSemiBold" style={Typography.heading}>
              Members ({members.length})
            </ThemedText>
            <ThemedText
              style={[Typography.small, { color: colors.muted, marginTop: Spacing.micro }]}
            >
              Manage club members and roles
            </ThemedText>
          </View>
          <Clickable
            style={[styles.inviteBtn, { borderColor: colors.tint }]}
            onPress={() => router.push(Routes.CLUB_INVITE_MEMBERS)}
          >
            <Row align="center" gap="xs">
              <Ionicons name="person-add-outline" size={16} color={colors.tint} />
              <ThemedText style={[Typography.small, { color: colors.tint, fontWeight: '600' }]}>Invite</ThemedText>
            </Row>
          </Clickable>
        </Row>

        <View style={styles.list}>
          {members.map((member, index) => (
            <React.Fragment key={member.userId}>
              <Clickable
                onPress={() => {
                  if (clubId) router.push(Routes.clubMember(clubId, member.userId));
                }}
              >
                <Row align="center" gap="sm" style={styles.memberRow}>
                  <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
                    <ThemedText style={[Typography.body, { color: colors.tint, fontWeight: '600' }]}>
                      {member.userName.charAt(0)}
                    </ThemedText>
                  </View>
                  <View style={styles.memberInfo}>
                    <ThemedText type="defaultSemiBold" numberOfLines={1}>
                      {member.userName}
                    </ThemedText>
                    <ThemedText
                      style={[Typography.caption, { color: clubService.getRoleColor(member.role) }]}
                    >
                      {clubService.formatRole(member.role)}
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Row>
              </Clickable>
              {index < members.length - 1 && (
                <View style={[styles.separator, { backgroundColor: colors.border }]} />
              )}
            </React.Fragment>
          ))}
        </View>
      </SurfaceCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: { gap: Spacing.md, overflow: 'hidden' },
  headerText: {
    flex: 1,
    flexShrink: 1,
  },
  inviteBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  list: {
    marginTop: Spacing.xxs,
  },
  memberRow: {
    paddingVertical: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56,
  },
});
