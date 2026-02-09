import React, { memo } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { StaffRolePicker } from '@/components/academy/staff-role-picker';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { AcademyMembership } from '@/constants/types';

interface StaffEditModalProps {
  member: AcademyMembership | null;
  colors: ThemeColors;
  editRole: AcademyMembership['role'];
  onRoleChange: (role: AcademyMembership['role']) => void;
  onUpdateRole: () => void;
  onRemove: () => void;
  onClose: () => void;
}

export const StaffEditModal = memo(function StaffEditModal({
  member, colors, editRole, onRoleChange, onUpdateRole, onRemove, onClose,
}: StaffEditModalProps) {
  return (
    <Modal visible={!!member} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <ThemedText type="title">Edit Member</ThemedText>
            <Clickable accessibilityLabel="Close" onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Clickable>
          </View>

          {member && (
            <>
              <ThemedText style={[styles.memberName, { color: colors.muted }]}>{member.userName}</ThemedText>
              <ThemedText style={styles.label}>Change Role</ThemedText>
              <StaffRolePicker selectedRole={editRole} onSelectRole={onRoleChange} />
              <View style={styles.actions}>
                <Button onPress={onUpdateRole}>Update Role</Button>
                <Clickable onPress={onRemove} style={[styles.removeButton, { borderColor: colors.error }]}>
                  <ThemedText style={{ color: colors.error, fontWeight: '600' }}>Remove from Academy</ThemedText>
                </Clickable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, padding: Spacing.lg, paddingBottom: Spacing['2xl'], gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberName: { ...Typography.bodySmall, marginTop: -Spacing.xs },
  label: { ...Typography.smallSemiBold, marginTop: Spacing.sm },
  actions: { gap: Spacing.sm, marginTop: Spacing.md },
  removeButton: { paddingVertical: Spacing.md, borderRadius: Radii.md, borderWidth: 1, alignItems: 'center' },
});
