import { memo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ROLE_INFO } from '@/hooks/use-family-sharing';
import { RELATIONSHIP_OPTIONS } from '@/services/family';
import type { GuardianRole } from '@/constants/types';
import { Row } from '@/components/primitives';

interface SharingInviteModalProps {
  visible: boolean;
  onClose: () => void;
  inviteEmail: string; onEmailChange: (v: string) => void;
  inviteName: string; onNameChange: (v: string) => void;
  inviteRole: GuardianRole; onRoleChange: (v: GuardianRole) => void;
  inviteRelationship: string; onRelationshipChange: (v: string) => void;
  inviteMessage: string; onMessageChange: (v: string) => void;
  inviting: boolean;
  onSend: () => void;
}

export const SharingInviteModal = memo(function SharingInviteModal({
  visible, onClose, inviteEmail, onEmailChange, inviteName, onNameChange,
  inviteRole, onRoleChange, inviteRelationship, onRelationshipChange,
  inviteMessage, onMessageChange, inviting, onSend,
}: SharingInviteModalProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modal, { backgroundColor: colors.background }]} edges={['top']}>
        <Row style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={{ padding: Spacing.xxs }}>
            <Ionicons name="close" size={28} color={colors.text} />
          </Pressable>
          <ThemedText type="subtitle">Invite Guardian</ThemedText>
          <View style={{ width: 28 }} />
        </Row>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
          <View style={styles.group}>
            <ThemedText type="defaultSemiBold">Email Address</ThemedText>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Enter their email address" placeholderTextColor={colors.muted}
              value={inviteEmail} onChangeText={onEmailChange} keyboardType="email-address" autoCapitalize="none" />
          </View>

          <View style={styles.group}>
            <ThemedText type="defaultSemiBold">Name (optional)</ThemedText>
            <TextInput style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Their name for your reference" placeholderTextColor={colors.muted}
              value={inviteName} onChangeText={onNameChange} />
          </View>

          <View style={styles.group}>
            <ThemedText type="defaultSemiBold">Relationship</ThemedText>
            <Row style={styles.chips}>
              {RELATIONSHIP_OPTIONS.map((rel) => (
                <Pressable key={rel} onPress={() => onRelationshipChange(rel)}
                  style={[styles.chip, { borderColor: inviteRelationship === rel ? colors.tint : colors.border,
                    backgroundColor: inviteRelationship === rel ? withAlpha(colors.tint, 0.06) : 'transparent' }]}>
                  <ThemedText style={{ color: inviteRelationship === rel ? colors.tint : colors.text }}>{rel}</ThemedText>
                </Pressable>
              ))}
            </Row>
          </View>

          <View style={styles.group}>
            <ThemedText type="defaultSemiBold">Access Level</ThemedText>
            {(['GUARDIAN', 'VIEWER'] as GuardianRole[]).map((role) => (
              <Pressable key={role} onPress={() => onRoleChange(role)}
                style={[styles.roleOption, { borderColor: inviteRole === role ? colors.tint : colors.border,
                  backgroundColor: inviteRole === role ? withAlpha(colors.tint, 0.06) : 'transparent' }]}>
                <View style={[styles.radio, { borderColor: inviteRole === role ? colors.tint : colors.border }]}>
                  {inviteRole === role && <View style={[styles.radioDot, { backgroundColor: colors.tint }]} />}
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">{ROLE_INFO[role].label}</ThemedText>
                  <ThemedText style={[Typography.small, { color: colors.muted, marginTop: Spacing.micro }]}>{ROLE_INFO[role].description}</ThemedText>
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.group}>
            <ThemedText type="defaultSemiBold">Personal Message (optional)</ThemedText>
            <TextInput style={[styles.textArea, { borderColor: colors.border, color: colors.text }]}
              placeholder="Add a note to your invitation..." placeholderTextColor={colors.muted}
              value={inviteMessage} onChangeText={onMessageChange} multiline numberOfLines={3} />
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Pressable style={[styles.sendBtn, { backgroundColor: inviting ? colors.muted : colors.tint }]}
            onPress={onSend} disabled={inviting}>
            {inviting ? <ActivityIndicator size="small" color={colors.onPrimary} /> : (
              <>
                <Ionicons name="send" size={20} color={colors.onPrimary} />
                <ThemedText style={[Typography.heading, { color: colors.onPrimary }]}>Send Invitation</ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modal: { flex: 1 },
  header: { alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderBottomWidth: 1 },
  content: { padding: Spacing.md, gap: Spacing.lg },
  group: { gap: Spacing.sm },
  input: { borderWidth: 1.5, borderRadius: Radii.md, padding: Spacing.md, ...Typography.subheading },
  textArea: { borderWidth: 1.5, borderRadius: Radii.md, padding: Spacing.md, ...Typography.subheading, minHeight: 80, textAlignVertical: 'top' },
  chips: { flexWrap: 'wrap', gap: Spacing.xs },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.pill, borderWidth: 1.5 },
  roleOption: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1.5 },
  radio: { width: 22, height: 22, borderRadius: Radii.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: Radii.sm },
  footer: { padding: Spacing.md, borderTopWidth: 1 },
  sendBtn: { alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, borderRadius: Radii.md },
});
