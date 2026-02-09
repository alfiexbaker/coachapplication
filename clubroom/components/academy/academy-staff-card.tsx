/**
 * AcademyStaffCard — Staff member card for academy detail screen.
 */

import React, { memo } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { academyService } from '@/services/academy-service';
import type { AcademyMembership } from '@/constants/types';

const ROLE_COLORS = {
  OWNER: '#7C3AED',
  ADMIN: '#0284C7',
  HEAD_COACH: '#059669',
  ASSISTANT: '#6B7280',
  MEMBER: '#9CA3AF',
} as const;

interface AcademyStaffCardProps {
  member: AcademyMembership;
  index: number;
  isOwner: boolean;
  onManage: () => void;
}

export const AcademyStaffCard = memo(function AcademyStaffCard({
  member,
  index,
  isOwner,
  onManage,
}: AcademyStaffCardProps) {
  const { colors: palette } = useTheme();

  const roleColors: Record<AcademyMembership['role'], string> = {
    ...ROLE_COLORS,
    COACH: palette.tint,
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <SurfaceCard style={styles.staffCard}>
        <View style={styles.staffMain}>
          {member.userPhotoUrl ? (
            <Image source={{ uri: member.userPhotoUrl }} style={styles.staffPhoto} />
          ) : (
            <View style={[styles.staffPhotoPlaceholder, { backgroundColor: palette.border }]}>
              <Ionicons name="person" size={20} color={palette.muted} />
            </View>
          )}
          <View style={styles.staffInfo}>
            <ThemedText type="defaultSemiBold">{member.userName}</ThemedText>
            <View
              style={[styles.roleBadge, { backgroundColor: withAlpha(roleColors[member.role], 0.09) }]}
            >
              <ThemedText style={[styles.roleText, { color: roleColors[member.role] }]}>
                {academyService.formatRole(member.role)}
              </ThemedText>
            </View>
          </View>
        </View>
        {isOwner && member.role !== 'OWNER' && (
          <Clickable accessibilityLabel="Manage staff member" onPress={onManage} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={20} color={palette.muted} />
          </Clickable>
        )}
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  staffCard: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  staffMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  staffPhoto: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
  },
  staffPhotoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffInfo: {
    flex: 1,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
    marginTop: Spacing.xxs,
  },
  roleText: {
    ...Typography.caption,
  },
});
