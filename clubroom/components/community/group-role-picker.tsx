import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme, type ThemeColors } from '@/hooks/useTheme';
import type { GroupMember, GroupMemberRole } from '@/constants/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<GroupMemberRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
  MEMBER: 'Member',
};

const ROLE_DESCRIPTIONS: Record<GroupMemberRole, string> = {
  OWNER: 'Full control of the group',
  ADMIN: 'Can manage members and settings',
  MODERATOR: 'Can moderate content and messages',
  MEMBER: 'Standard group member',
};

function getRoleBadgeColor(role: GroupMemberRole, palette: ThemeColors) {
  switch (role) {
    case 'OWNER':
      return { bg: withAlpha(palette.warning, 0.12), text: palette.warning };
    case 'ADMIN':
      return { bg: withAlpha(palette.info, 0.12), text: palette.info };
    case 'MODERATOR':
      return { bg: withAlpha(palette.success, 0.12), text: palette.success };
    default:
      return { bg: withAlpha(palette.muted, 0.09), text: palette.muted };
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GroupRolePickerProps {
  visible: boolean;
  onClose: () => void;
  selectedMember: GroupMember | null;
  assignableRoles: GroupMemberRole[];
  onRoleChange: (role: GroupMemberRole) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function GroupRolePickerInner({
  visible,
  onClose,
  selectedMember,
  assignableRoles,
  onRoleChange,
}: GroupRolePickerProps) {
  const { colors: palette } = useTheme();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Clickable
        style={[styles.rolePickerOverlay, { backgroundColor: withAlpha(palette.text, 0.4) }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close role picker"
      >
        <View style={[styles.rolePickerCard, { backgroundColor: palette.surface }]}>
          <ThemedText type="subtitle" style={styles.rolePickerTitle}>
            Change Role
          </ThemedText>
          {selectedMember && (
            <ThemedText style={[styles.rolePickerSubtitle, { color: palette.muted }]}>
              {selectedMember.parentId} - currently {ROLE_LABELS[selectedMember.role]}
            </ThemedText>
          )}
          <View style={styles.rolePickerOptions}>
            {assignableRoles.map((role) => {
              const isCurrentRole = selectedMember?.role === role;
              const colors = getRoleBadgeColor(role, palette);

              return (
                <Clickable
                  key={role}
                  style={({ pressed }) => [
                    styles.roleOption,
                    {
                      borderColor: isCurrentRole ? palette.tint : palette.border,
                      backgroundColor: pressed
                        ? withAlpha(palette.tint, 0.03)
                        : isCurrentRole
                          ? withAlpha(palette.tint, 0.03)
                          : 'transparent',
                    },
                  ]}
                  onPress={() => onRoleChange(role)}
                  disabled={isCurrentRole}
                  accessibilityRole="button"
                  accessibilityLabel={`Set role to ${ROLE_LABELS[role]}`}
                  accessibilityState={{ selected: isCurrentRole, disabled: isCurrentRole }}
                >
                  <View style={[styles.roleOptionDot, { backgroundColor: colors.text }]} />
                  <View style={styles.roleOptionInfo}>
                    <ThemedText style={[styles.roleOptionLabel, { color: palette.text }]}>
                      {ROLE_LABELS[role]}
                    </ThemedText>
                    <ThemedText style={[styles.roleOptionDesc, { color: palette.muted }]}>
                      {ROLE_DESCRIPTIONS[role]}
                    </ThemedText>
                  </View>
                  {isCurrentRole && (
                    <Ionicons name="checkmark-circle" size={22} color={palette.tint} />
                  )}
                </Clickable>
              );
            })}
          </View>
          <Clickable
            onPress={onClose}
            style={[styles.rolePickerCancel, { borderColor: palette.border }]}
          >
            <ThemedText style={[styles.rolePickerCancelText, { color: palette.muted }]}>
              Cancel
            </ThemedText>
          </Clickable>
        </View>
      </Clickable>
    </Modal>
  );
}

export const GroupRolePicker = React.memo(GroupRolePickerInner);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  rolePickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  rolePickerCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radii.card,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  rolePickerTitle: {
    ...Typography.heading,
    textAlign: 'center',
  },
  rolePickerSubtitle: {
    ...Typography.small,
    textAlign: 'center',
  },
  rolePickerOptions: {
    gap: Spacing.xs,
  },
  roleOption: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  roleOptionDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.sm,
  },
  roleOptionInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  roleOptionLabel: {
    ...Typography.bodySemiBold,
  },
  roleOptionDesc: {
    ...Typography.caption,
  },
  rolePickerCancel: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  rolePickerCancelText: {
    ...Typography.bodySemiBold,
  },
});
