import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { clubService } from '@/services/club-service';
import type { ClubRole } from '@/constants/types';

interface MemberRoleManagementProps {
  currentRole: ClubRole;
  assignableRoles: ClubRole[];
  showPicker: boolean;
  onShowPicker: (show: boolean) => void;
  onChangeRole: (role: ClubRole) => void;
}

export const MemberRoleManagement = memo(function MemberRoleManagement({
  currentRole, assignableRoles, showPicker, onShowPicker, onChangeRole,
}: MemberRoleManagementProps) {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <Row gap="xs" align="center">
        <Ionicons name="key-outline" size={20} color={colors.tint} />
        <ThemedText type="defaultSemiBold" style={Typography.subheading}>Role Management</ThemedText>
      </Row>
      <ThemedText style={[Typography.small, { color: colors.muted }]}>Current role: {clubService.formatRole(currentRole)}</ThemedText>

      {showPicker ? (
        <View style={styles.picker}>
          {assignableRoles.map((role) => {
            const isCurrent = role === currentRole;
            const color = clubService.getRoleColor(role);
            return (
              <Clickable key={role} disabled={isCurrent} onPress={() => onChangeRole(role)}
                style={[styles.option, { borderColor: isCurrent ? color : colors.border, backgroundColor: isCurrent ? withAlpha(color, 0.06) : colors.surface }]}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <ThemedText type="defaultSemiBold" style={{ flex: 1 }}>{clubService.formatRole(role)}</ThemedText>
                {isCurrent && <Ionicons name="checkmark-circle" size={20} color={color} />}
              </Clickable>
            );
          })}
          <Clickable style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => onShowPicker(false)}>
            <ThemedText style={{ color: colors.muted }}>Cancel</ThemedText>
          </Clickable>
        </View>
      ) : (
        <Clickable style={[styles.actionRow, { borderColor: colors.border }]} onPress={() => onShowPicker(true)}>
          <Ionicons name="swap-horizontal-outline" size={20} color={colors.tint} />
          <ThemedText style={{ flex: 1, color: colors.text }}>Change Role</ThemedText>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Clickable>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  picker: { gap: Spacing.xs },
  option: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  dot: { width: 12, height: 12, borderRadius: Radii.sm },
  cancelBtn: { alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  actionRow: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
});
