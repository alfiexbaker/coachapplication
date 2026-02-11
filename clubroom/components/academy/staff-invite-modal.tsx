import React, { memo } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { StaffRolePicker } from '@/components/academy/staff-role-picker';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { AcademyMembership } from '@/constants/types';
import { Row } from '@/components/primitives';

interface StaffInviteModalProps {
  visible: boolean;
  colors: ThemeColors;
  inviteRole: AcademyMembership['role'];
  creatingInvite: boolean;
  inviteCode: string;
  onRoleChange: (role: AcademyMembership['role']) => void;
  onCreateInvite: () => void;
  onClose: () => void;
}

export const StaffInviteModal = memo(function StaffInviteModal({
  visible, colors, inviteRole, creatingInvite, inviteCode,
  onRoleChange, onCreateInvite, onClose,
}: StaffInviteModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: withAlpha(colors.text, 0.5) }]}>
        <View style={[styles.content, { backgroundColor: colors.surface }]}>
          <Row style={styles.header}>
            <ThemedText type="title">Invite Staff</ThemedText>
            <Clickable accessibilityLabel="Close" onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Clickable>
          </Row>

          {inviteCode ? (
            <View style={styles.codeSection}>
              <ThemedText style={[styles.codeLabel, { color: colors.muted }]}>
                Share this code with your staff:
              </ThemedText>
              <View style={[styles.codeBox, { backgroundColor: colors.background }]}>
                <ThemedText type="heading" style={styles.codeText}>{inviteCode}</ThemedText>
              </View>
              <ThemedText style={[styles.codeHint, { color: colors.muted }]}>
                Valid for 30 days, up to 10 uses
              </ThemedText>
              <Button onPress={onClose}>Done</Button>
            </View>
          ) : (
            <>
              <ThemedText style={styles.label}>Select Role</ThemedText>
              <StaffRolePicker selectedRole={inviteRole} onSelectRole={onRoleChange} />
              <Button onPress={onCreateInvite} disabled={creatingInvite}>
                {creatingInvite ? 'Creating...' : 'Create Invite Code'}
              </Button>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  content: { borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, padding: Spacing.lg, paddingBottom: Spacing['2xl'], gap: Spacing.md },
  header: { alignItems: 'center', justifyContent: 'space-between' },
  label: { ...Typography.smallSemiBold, marginTop: Spacing.sm },
  codeSection: { alignItems: 'center', gap: Spacing.md },
  codeLabel: { ...Typography.bodySmall, textAlign: 'center' },
  codeBox: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, borderRadius: Radii.md },
  codeText: { ...Typography.display, letterSpacing: 4 },
  codeHint: { ...Typography.caption },
});
