/**
 * AcademyStaffCard — Staff member card for academy detail screen.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { academyService } from '@/services/academy-service';
import type { AcademyMembership } from '@/constants/types';
import { Row } from '@/components/primitives';

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
    OWNER: palette.premium,
    ADMIN: palette.info,
    HEAD_COACH: palette.success,
    COACH: palette.tint,
    ASSISTANT: palette.muted,
    MEMBER: palette.tabIconDefault,
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <SurfaceCard style={styles.staffCard}>
        <Row style={styles.staffMain}>
          <View style={[styles.staffPhotoPlaceholder, { backgroundColor: palette.border }]}>
            <Ionicons name="person" size={20} color={palette.muted} />
          </View>
          <View style={styles.staffInfo}>
            <ThemedText type="defaultSemiBold">{member.userId}</ThemedText>
            <View
              style={[styles.roleBadge, { backgroundColor: withAlpha(roleColors[member.role], 0.09) }]}
            >
              <ThemedText style={[styles.roleText, { color: roleColors[member.role] }]}>
                {academyService.formatRole(member.role)}
              </ThemedText>
            </View>
          </View>
        </Row>
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
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
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
