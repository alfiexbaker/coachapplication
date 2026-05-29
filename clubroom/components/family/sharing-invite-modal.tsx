import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { PageHeader } from '@/components/primitives/page-header';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ROLE_INFO } from '@/hooks/use-family-sharing';
import { RELATIONSHIP_OPTIONS } from '@/services/family';
import type { GuardianRole } from '@/constants/types';
import { Row, Column } from '@/components/primitives';
import { uiFeedback } from '@/services/ui-feedback';

interface SharingInviteModalProps {
  visible: boolean;
  onClose: () => void;
  inviteEmail: string;
  onEmailChange: (v: string) => void;
  emailError?: string | null;
  onEmailBlur?: () => void;
  inviteName: string;
  onNameChange: (v: string) => void;
  inviteRole: GuardianRole;
  onRoleChange: (v: GuardianRole) => void;
  inviteRelationship: string;
  onRelationshipChange: (v: string) => void;
  inviteMessage: string;
  onMessageChange: (v: string) => void;
  inviting: boolean;
  onSend: () => void;
}

export const SharingInviteModal = function SharingInviteModal({
  visible,
  onClose,
  inviteEmail,
  onEmailChange,
  emailError,
  onEmailBlur,
  inviteName,
  onNameChange,
  inviteRole,
  onRoleChange,
  inviteRelationship,
  onRelationshipChange,
  inviteMessage,
  onMessageChange,
  inviting,
  onSend,
}: SharingInviteModalProps) {
  const { colors } = useTheme();
  const hasUnsavedChanges =
    inviteEmail.trim().length > 0 ||
    inviteName.trim().length > 0 ||
    inviteMessage.trim().length > 0 ||
    inviteRelationship !== 'Co-parent' ||
    inviteRole !== 'GUARDIAN';

  const closeNow = () => {
    Keyboard.dismiss();
    onClose();
  };

  const handleClose = () => {
    if (inviting) return;
    if (!hasUnsavedChanges) {
      closeNow();
      return;
    }
    uiFeedback.alert(
      'Discard Invite?',
      'You have an unsent invite. Are you sure you want to close?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: closeNow },
      ],
    );
  };

  const handleSend = () => {
    Keyboard.dismiss();
    onSend();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <PageHeader
          title="Invite Guardian"
          showBack
          onBackPress={handleClose}
          backIcon="close"
          centerTitle
          containerStyle={[styles.header, { borderBottomColor: colors.border }]}
        />

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
        >
          <View style={styles.group}>
            <ThemedText type="defaultSemiBold">Email Address</ThemedText>
            <TextInput
              style={[
                styles.input,
                { borderColor: emailError ? colors.error : colors.border, color: colors.text },
              ]}
              placeholder="Enter their email address"
              placeholderTextColor={colors.muted}
              value={inviteEmail}
              onChangeText={(v) => onEmailChange(v)}
              onBlur={onEmailBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={100}
            />
            {emailError ? (
              <ThemedText style={[Typography.caption, { color: colors.error }]}>
                {emailError}
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.group}>
            <ThemedText type="defaultSemiBold">Name (optional)</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Their name for your reference"
              placeholderTextColor={colors.muted}
              value={inviteName}
              onChangeText={onNameChange}
              maxLength={50}
            />
          </View>

          <View style={styles.group}>
            <ThemedText type="defaultSemiBold">Relationship</ThemedText>
            <Row style={styles.chips}>
              {RELATIONSHIP_OPTIONS.map((rel) => (
                <Clickable
                  key={rel}
                  onPress={() => onRelationshipChange(rel)}
                  style={[
                    styles.chip,
                    {
                      borderColor: inviteRelationship === rel ? colors.tint : colors.border,
                      backgroundColor:
                        inviteRelationship === rel ? withAlpha(colors.tint, 0.06) : 'transparent',
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Set relationship to ${rel}`}
                  accessibilityState={{ selected: inviteRelationship === rel }}
                >
                  <ThemedText
                    style={{ color: inviteRelationship === rel ? colors.tint : colors.text }}
                  >
                    {rel}
                  </ThemedText>
                </Clickable>
              ))}
            </Row>
          </View>

          <View style={styles.group}>
            <ThemedText type="defaultSemiBold">Access Level</ThemedText>
            {(['GUARDIAN', 'VIEWER'] as GuardianRole[]).map((role) => (
              <Clickable
                key={role}
                onPress={() => onRoleChange(role)}
                style={[
                  styles.roleOption,
                  {
                    borderColor: inviteRole === role ? colors.tint : colors.border,
                    backgroundColor:
                      inviteRole === role ? withAlpha(colors.tint, 0.06) : 'transparent',
                  },
                ]}
                accessibilityRole="radio"
                accessibilityLabel={`Set access level to ${ROLE_INFO[role].label}`}
                accessibilityState={{ checked: inviteRole === role }}
              >
                <View
                  style={[
                    styles.radio,
                    { borderColor: inviteRole === role ? colors.tint : colors.border },
                  ]}
                >
                  {inviteRole === role && (
                    <View style={[styles.radioDot, { backgroundColor: colors.tint }]} />
                  )}
                </View>
                <Column flex>
                  <ThemedText type="defaultSemiBold">{ROLE_INFO[role].label}</ThemedText>
                  <ThemedText
                    style={[Typography.small, { color: colors.muted, marginTop: Spacing.micro }]}
                  >
                    {ROLE_INFO[role].description}
                  </ThemedText>
                </Column>
              </Clickable>
            ))}
          </View>

          <View style={styles.group}>
            <ThemedText type="defaultSemiBold">Personal Message (optional)</ThemedText>
            <TextInput
              style={[styles.textArea, { borderColor: colors.border, color: colors.text }]}
              placeholder="Add a note to your invitation..."
              placeholderTextColor={colors.muted}
              value={inviteMessage}
              onChangeText={onMessageChange}
              multiline
              numberOfLines={3}
              maxLength={500}
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Clickable
            style={[styles.sendBtn, { backgroundColor: inviting ? colors.muted : colors.tint }]}
            onPress={handleSend}
            disabled={inviting || !inviteEmail.trim() || !!emailError}
            accessibilityLabel="Send guardian invitation"
            accessibilityRole="button"
            accessibilityState={{ disabled: inviting || !inviteEmail.trim() || !!emailError }}
          >
            {inviting ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : (
              <>
                <Ionicons name="send" size={20} color={colors.onPrimary} />
                <ThemedText style={[Typography.heading, { color: colors.onPrimary }]}>
                  Send Invitation
                </ThemedText>
              </>
            )}
          </Clickable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: { flex: 1 },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  content: { padding: Spacing.md, gap: Spacing.lg },
  group: { gap: Spacing.sm },
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.md,
    ...Typography.subheading,
  },
  textArea: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.md,
    ...Typography.subheading,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chips: { flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  roleOption: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 12, height: 12, borderRadius: Radii.sm },
  footer: { padding: Spacing.md, borderTopWidth: 1 },
  sendBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
});
