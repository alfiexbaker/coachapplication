import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { EmptyState } from '@/components/ui/empty-state';
import { StaffInviteModal } from '@/components/academy/staff-invite-modal';
import { StaffEditModal } from '@/components/academy/staff-edit-modal';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAcademyStaff, ROLE_COLORS } from '@/hooks/use-academy-staff';
import { academyService } from '@/services/academy-service';
import type { AcademyMembership } from '@/constants/types';

export default function AcademyStaffScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const {
    academy, staff, loading, canManageStaff,
    showInviteModal, inviteRole, creatingInvite, inviteCode,
    editingMember, editRole,
    setShowInviteModal, setInviteRole, setEditRole, setEditingMember,
    openInviteModal, handleCreateInvite,
    openEditMember, handleUpdateRole, handleRemoveMember,
  } = useAcademyStaff(id);

  const roleColors: Record<AcademyMembership['role'], string> = { ...ROLE_COLORS, COACH: colors.tint };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Clickable>
          <ThemedText type="title">Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Row gap="md" align="center" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <View style={{ flex: 1 }}>
          <ThemedText type="title">Staff</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.muted }]}>{academy?.name}</ThemedText>
        </View>
        {canManageStaff && (
          <Clickable onPress={openInviteModal} style={[styles.inviteButton, { backgroundColor: colors.tint }]}>
            <Ionicons name="person-add" size={18} color={colors.onPrimary} />
          </Clickable>
        )}
      </Row>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {staff.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No staff members"
            message="Invite coaches to join your academy"
            actionLabel="Create Invite"
            onPressAction={() => setShowInviteModal(true)}
          />
        ) : (
          <View style={styles.list}>
            {staff.map((member, index) => (
              <Animated.View key={member.id} entering={FadeInDown.delay(index * 50).springify()}>
                <SurfaceCard
                  style={styles.staffCard}
                  onPress={canManageStaff && member.role !== 'OWNER' ? () => openEditMember(member) : undefined}
                >
                  <Row gap="md" align="center">
                    <View style={[styles.avatar, { backgroundColor: withAlpha(roleColors[member.role], 0.12) }]}>
                      <ThemedText style={[styles.avatarText, { color: roleColors[member.role] }]}>
                        {member.userName.slice(0, 2).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="defaultSemiBold">{member.userName}</ThemedText>
                      <View style={[styles.roleBadge, { backgroundColor: withAlpha(roleColors[member.role], 0.09) }]}>
                        <ThemedText style={[styles.roleText, { color: roleColors[member.role] }]}>
                          {academyService.formatRole(member.role)}
                        </ThemedText>
                      </View>
                    </View>
                    {canManageStaff && member.role !== 'OWNER' && (
                      <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                    )}
                  </Row>
                </SurfaceCard>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      <StaffInviteModal
        visible={showInviteModal}
        colors={colors}
        inviteRole={inviteRole}
        creatingInvite={creatingInvite}
        inviteCode={inviteCode}
        onRoleChange={setInviteRole}
        onCreateInvite={handleCreateInvite}
        onClose={() => setShowInviteModal(false)}
      />

      <StaffEditModal
        member={editingMember}
        colors={colors}
        editRole={editRole}
        onRoleChange={setEditRole}
        onUpdateRole={handleUpdateRole}
        onRemove={() => { setEditingMember(null); editingMember && handleRemoveMember(editingMember); }}
        onClose={() => setEditingMember(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  subtitle: { ...Typography.small, marginTop: Spacing.micro },
  inviteButton: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg },
  list: { gap: Spacing.sm },
  staffCard: { padding: Spacing.md },
  avatar: { width: 48, height: 48, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...Typography.subheading },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: Spacing.micro, borderRadius: Radii.sm, marginTop: Spacing.xxs },
  roleText: { ...Typography.caption },
});
