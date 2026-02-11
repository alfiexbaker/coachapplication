import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { AcademyMembership } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

interface StaffRolePickerProps {
  selectedRole: AcademyMembership['role'];
  onSelectRole: (role: AcademyMembership['role']) => void;
  excludeOwner?: boolean;
}

const ROLES: {
  key: AcademyMembership['role'];
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    key: 'ADMIN',
    label: 'Admin',
    description: 'Full management access, invite staff',
    icon: 'shield',
  },
  {
    key: 'HEAD_COACH',
    label: 'Head Coach',
    description: 'Create sessions, view analytics, post content',
    icon: 'medal',
  },
  {
    key: 'COACH',
    label: 'Coach',
    description: 'Create and manage sessions',
    icon: 'person',
  },
  {
    key: 'ASSISTANT',
    label: 'Assistant',
    description: 'View-only access',
    icon: 'people',
  },
];

export function StaffRolePicker({
  selectedRole,
  onSelectRole,
  excludeOwner = true,
}: StaffRolePickerProps) {
  const { colors: palette } = useTheme();

  // Role-specific colors from theme tokens for consistent semantics.
  const roleColors: Record<AcademyMembership['role'], string> = {
    OWNER: palette.premium,
    ADMIN: palette.info,
    HEAD_COACH: palette.success,
    COACH: palette.tint,
    ASSISTANT: palette.muted,
    MEMBER: palette.tabIconDefault,
  };

  const availableRoles = excludeOwner
    ? ROLES.filter((r) => r.key !== 'OWNER')
    : ROLES;

  return (
    <View style={styles.container}>
      {availableRoles.map((role) => {
        const isSelected = selectedRole === role.key;
        const color = roleColors[role.key];

        return (
          <Clickable
            key={role.key}
            onPress={() => onSelectRole(role.key)}
            style={[
              styles.roleCard,
              {
                backgroundColor: isSelected ? withAlpha(color, 0.06) : palette.surface,
                borderColor: isSelected ? color : palette.border,
              },
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: withAlpha(color, 0.12) }]}>
              <Ionicons name={role.icon as keyof typeof Ionicons.glyphMap} size={20} color={color} />
            </View>
            <View style={styles.roleInfo}>
              <ThemedText
                type="defaultSemiBold"
                style={{ color: isSelected ? color : palette.text }}
              >
                {role.label}
              </ThemedText>
              <ThemedText style={[styles.roleDescription, { color: palette.muted }]}>
                {role.description}
              </ThemedText>
            </View>
            <View
              style={[
                styles.radio,
                {
                  borderColor: isSelected ? color : palette.border,
                  backgroundColor: isSelected ? color : 'transparent',
                },
              ]}
            >
              {isSelected && <Ionicons name="checkmark" size={12} color={palette.onPrimary} />}
            </View>
          </Clickable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  roleCard: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 2,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleInfo: {
    flex: 1,
  },
  roleDescription: { ...Typography.caption, marginTop: Spacing.micro },
  radio: {
    width: 22,
    height: 22,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
