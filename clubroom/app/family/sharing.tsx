/**
 * Family Sharing Screen
 *
 * Allows parents to:
 * - View current guardians with access
 * - Invite new guardians (co-parents, grandparents, etc.)
 * - Manage permissions for each guardian
 * - Remove guardians
 *
 * USER STORY:
 * "As a parent, I want to share access to my children's sports schedule
 * with my partner so we can both manage bookings and stay informed."
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  familyService,
  PERMISSION_DESCRIPTIONS,
  RELATIONSHIP_OPTIONS,
} from '@/services/family-service';
import type {
  FamilyAccount,
  FamilyGuardian,
  GuardianPermission,
  GuardianRole,
} from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('FamilySharing');

const ROLE_INFO: Record<GuardianRole, { label: string; description: string }> = {
  PRIMARY: {
    label: 'Primary',
    description: 'Full access with admin controls',
  },
  GUARDIAN: {
    label: 'Guardian',
    description: 'Can view and book sessions',
  },
  VIEWER: {
    label: 'Viewer',
    description: 'View-only access',
  },
};

export default function FamilySharingScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<FamilyAccount | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<GuardianRole>('GUARDIAN');
  const [inviteRelationship, setInviteRelationship] = useState('Co-parent');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviting, setInviting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadFamilyData();
    }, [currentUser])
  );

  const loadFamilyData = async () => {
    if (!currentUser?.id) return;

    try {
      const account = await familyService.getFamilyAccount(
        currentUser.id,
        currentUser.fullName || 'Parent'
      );
      setFamily(account);
    } catch (error) {
      logger.error('Failed to load family data', error);
      Alert.alert('Error', 'Failed to load family sharing settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!family || !currentUser) return;

    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    if (!inviteEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setInviting(true);
    try {
      await familyService.inviteGuardian(
        family.id,
        currentUser.id,
        currentUser.fullName || 'Parent',
        inviteEmail.trim(),
        inviteName.trim() || 'Guardian',
        inviteRole,
        inviteRelationship,
        [], // All children
        inviteMessage.trim() || undefined
      );

      Alert.alert(
        'Invitation Sent',
        `An invitation has been sent to ${inviteEmail}. They'll receive instructions to join your family account.`
      );

      setShowInviteModal(false);
      resetInviteForm();
      loadFamilyData();

      logger.success('InviteSent', { email: inviteEmail, role: inviteRole });
    } catch (error: any) {
      logger.error('Failed to send invite', error);
      Alert.alert('Error', error.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveGuardian = (guardian: FamilyGuardian) => {
    if (!family || !currentUser) return;

    Alert.alert(
      'Remove Guardian',
      `Are you sure you want to remove ${guardian.userName} from your family account? They will no longer be able to access your children's information.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await familyService.removeGuardian(
                family.id,
                currentUser.id,
                guardian.id
              );
              Alert.alert('Removed', `${guardian.userName} has been removed from your family account.`);
              loadFamilyData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove guardian');
            }
          },
        },
      ]
    );
  };

  const handleCancelInvite = async (inviteId: string, email: string) => {
    if (!family || !currentUser) return;

    Alert.alert(
      'Cancel Invitation',
      `Cancel the invitation to ${email}?`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Invite',
          style: 'destructive',
          onPress: async () => {
            try {
              await familyService.cancelInvite(family.id, currentUser.id, inviteId);
              loadFamilyData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel invitation');
            }
          },
        },
      ]
    );
  };

  const resetInviteForm = () => {
    setInviteEmail('');
    setInviteName('');
    setInviteRole('GUARDIAN');
    setInviteRelationship('Co-parent');
    setInviteMessage('');
  };

  const getPermissionIcons = (permissions: GuardianPermission[]) => {
    const icons: string[] = [];
    if (permissions.includes('VIEW_SCHEDULE')) icons.push('calendar-outline');
    if (permissions.includes('BOOK_SESSIONS')) icons.push('add-circle-outline');
    if (permissions.includes('MANAGE_PAYMENTS')) icons.push('wallet-outline');
    if (permissions.includes('ADMIN')) icons.push('shield-outline');
    return icons.slice(0, 3);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <PageHeader title="Family Sharing" showBack onBackPress={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader title="Family Sharing" showBack onBackPress={() => router.back()} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro Card */}
        <SurfaceCard style={[styles.introCard, { backgroundColor: `${palette.tint}08` }]}>
          <View style={styles.introIcon}>
            <Ionicons name="people-circle" size={40} color={palette.tint} />
          </View>
          <ThemedText type="subtitle" style={styles.introTitle}>
            Share access with family members
          </ThemedText>
          <ThemedText style={[styles.introText, { color: palette.muted }]}>
            Invite your partner, grandparents, or caregivers to view schedules,
            book sessions, and track your children's progress.
          </ThemedText>
        </SurfaceCard>

        {/* Current Guardians */}
        <SurfaceCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={20} color={palette.tint} />
            <ThemedText type="subtitle">Family Members</ThemedText>
            <ThemedText style={[styles.count, { color: palette.muted }]}>
              {family?.guardians.length || 0}
            </ThemedText>
          </View>

          {family?.guardians.map((guardian) => (
            <View
              key={guardian.id}
              style={[styles.guardianCard, { borderColor: palette.border }]}
            >
              <View style={styles.guardianHeader}>
                <View style={[styles.avatar, { backgroundColor: `${palette.tint}15` }]}>
                  <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                    {guardian.userName.charAt(0)}
                  </ThemedText>
                </View>
                <View style={styles.guardianInfo}>
                  <ThemedText type="defaultSemiBold">{guardian.userName}</ThemedText>
                  <ThemedText style={[styles.guardianMeta, { color: palette.muted }]}>
                    {guardian.relationship} • {ROLE_INFO[guardian.role].label}
                  </ThemedText>
                </View>
                {guardian.isPrimary ? (
                  <View style={[styles.primaryBadge, { backgroundColor: `${palette.success}15` }]}>
                    <ThemedText style={[styles.primaryBadgeText, { color: palette.success }]}>
                      Primary
                    </ThemedText>
                  </View>
                ) : (
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => handleRemoveGuardian(guardian)}
                  >
                    <Ionicons name="close-circle" size={22} color={palette.error} />
                  </Pressable>
                )}
              </View>

              <View style={styles.permissionIcons}>
                {getPermissionIcons(guardian.permissions).map((icon, index) => (
                  <Ionicons key={index} name={icon as any} size={18} color={palette.muted} />
                ))}
                <ThemedText style={[styles.permissionCount, { color: palette.muted }]}>
                  {guardian.permissions.length} permissions
                </ThemedText>
              </View>
            </View>
          ))}
        </SurfaceCard>

        {/* Pending Invites */}
        {family?.pendingInvites && family.pendingInvites.length > 0 && (
          <SurfaceCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="mail-outline" size={20} color={palette.warning} />
              <ThemedText type="subtitle">Pending Invitations</ThemedText>
            </View>

            {family.pendingInvites.map((invite) => (
              <View
                key={invite.id}
                style={[styles.inviteCard, { borderColor: palette.border }]}
              >
                <View style={styles.inviteInfo}>
                  <ThemedText type="defaultSemiBold">
                    {invite.inviteeName || invite.inviteeEmail}
                  </ThemedText>
                  <ThemedText style={[styles.inviteMeta, { color: palette.muted }]}>
                    {invite.relationship} • Expires {new Date(invite.expiresAt).toLocaleDateString()}
                  </ThemedText>
                </View>
                <Pressable
                  style={[styles.cancelInviteButton, { borderColor: palette.error }]}
                  onPress={() => handleCancelInvite(invite.id, invite.inviteeEmail)}
                >
                  <ThemedText style={[styles.cancelInviteText, { color: palette.error }]}>
                    Cancel
                  </ThemedText>
                </Pressable>
              </View>
            ))}
          </SurfaceCard>
        )}

        {/* Invite Button */}
        <Pressable
          style={[styles.inviteButton, { backgroundColor: palette.tint }]}
          onPress={() => setShowInviteModal(true)}
        >
          <Ionicons name="person-add" size={22} color="#fff" />
          <ThemedText style={styles.inviteButtonText}>Invite Family Member</ThemedText>
        </Pressable>
      </ScrollView>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <SafeAreaView style={[styles.modal, { backgroundColor: palette.background }]} edges={['top']}>
          <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
            <Pressable onPress={() => setShowInviteModal(false)} style={styles.modalClose}>
              <Ionicons name="close" size={28} color={palette.text} />
            </Pressable>
            <ThemedText type="subtitle">Invite Guardian</ThemedText>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalInner}>
            {/* Email */}
            <View style={styles.formGroup}>
              <ThemedText type="defaultSemiBold">Email Address</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: palette.border, color: palette.text }]}
                placeholder="Enter their email address"
                placeholderTextColor={palette.muted}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Name */}
            <View style={styles.formGroup}>
              <ThemedText type="defaultSemiBold">Name (optional)</ThemedText>
              <TextInput
                style={[styles.input, { borderColor: palette.border, color: palette.text }]}
                placeholder="Their name for your reference"
                placeholderTextColor={palette.muted}
                value={inviteName}
                onChangeText={setInviteName}
              />
            </View>

            {/* Relationship */}
            <View style={styles.formGroup}>
              <ThemedText type="defaultSemiBold">Relationship</ThemedText>
              <View style={styles.relationshipOptions}>
                {RELATIONSHIP_OPTIONS.map((rel) => (
                  <Pressable
                    key={rel}
                    style={[
                      styles.relationshipOption,
                      {
                        borderColor: inviteRelationship === rel ? palette.tint : palette.border,
                        backgroundColor: inviteRelationship === rel ? `${palette.tint}10` : 'transparent',
                      }
                    ]}
                    onPress={() => setInviteRelationship(rel)}
                  >
                    <ThemedText
                      style={{ color: inviteRelationship === rel ? palette.tint : palette.text }}
                    >
                      {rel}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Role */}
            <View style={styles.formGroup}>
              <ThemedText type="defaultSemiBold">Access Level</ThemedText>
              {(['GUARDIAN', 'VIEWER'] as GuardianRole[]).map((role) => (
                <Pressable
                  key={role}
                  style={[
                    styles.roleOption,
                    {
                      borderColor: inviteRole === role ? palette.tint : palette.border,
                      backgroundColor: inviteRole === role ? `${palette.tint}10` : 'transparent',
                    }
                  ]}
                  onPress={() => setInviteRole(role)}
                >
                  <View style={[
                    styles.radioOuter,
                    { borderColor: inviteRole === role ? palette.tint : palette.border }
                  ]}>
                    {inviteRole === role && (
                      <View style={[styles.radioInner, { backgroundColor: palette.tint }]} />
                    )}
                  </View>
                  <View style={styles.roleInfo}>
                    <ThemedText type="defaultSemiBold">{ROLE_INFO[role].label}</ThemedText>
                    <ThemedText style={[styles.roleDesc, { color: palette.muted }]}>
                      {ROLE_INFO[role].description}
                    </ThemedText>
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Message */}
            <View style={styles.formGroup}>
              <ThemedText type="defaultSemiBold">Personal Message (optional)</ThemedText>
              <TextInput
                style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
                placeholder="Add a note to your invitation..."
                placeholderTextColor={palette.muted}
                value={inviteMessage}
                onChangeText={setInviteMessage}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          {/* Send Button */}
          <View style={[styles.modalFooter, { borderTopColor: palette.border }]}>
            <Pressable
              style={[
                styles.sendButton,
                { backgroundColor: inviting ? palette.muted : palette.tint }
              ]}
              onPress={handleInvite}
              disabled={inviting}
            >
              {inviting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" />
                  <ThemedText style={styles.sendButtonText}>Send Invitation</ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl * 2,
    gap: Spacing.md,
  },
  introCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  introIcon: {
    marginBottom: Spacing.xs,
  },
  introTitle: {
    textAlign: 'center',
  },
  introText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  count: {
    marginLeft: 'auto',
    fontSize: 14,
  },
  guardianCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  guardianHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  guardianInfo: {
    flex: 1,
  },
  guardianMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  primaryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  primaryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    padding: 4,
  },
  permissionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginLeft: 56,
  },
  permissionCount: {
    fontSize: 12,
    marginLeft: Spacing.xs,
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  inviteInfo: {
    flex: 1,
  },
  inviteMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  cancelInviteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  cancelInviteText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    marginTop: Spacing.sm,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Modal styles
  modal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  modalClose: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
  },
  modalInner: {
    padding: Spacing.md,
    gap: Spacing.lg,
  },
  formGroup: {
    gap: Spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  relationshipOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  relationshipOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  roleInfo: {
    flex: 1,
  },
  roleDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  modalFooter: {
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
