import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { AcademyMembership } from '@/constants/types';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const roleColors: Record<AcademyMembership['role'], string> = {
    OWNER: '#7C3AED',
    ADMIN: '#0284C7',
    HEAD_COACH: '#059669',
    COACH: palette.tint,
    ASSISTANT: '#6B7280',
    MEMBER: '#9CA3AF',
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
                backgroundColor: isSelected ? `${color}10` : palette.surface,
                borderColor: isSelected ? color : palette.border,
              },
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
              <Ionicons name={role.icon as any} size={20} color={color} />
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
              {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 2,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleInfo: {
    flex: 1,
  },
  roleDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
