import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useScreen } from '@/hooks/use-screen';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { EmptyState } from '@/components/ui/empty-state';
import { ok, err, notFound, serviceError } from '@/types/result';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { StaffInviteModal } from '@/components/academy/staff-invite-modal';
import { StaffEditModal } from '@/components/academy/staff-edit-modal';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { academyService } from '@/services/academy-service';
import { ROLE_COLORS } from '@/hooks/use-academy-staff';
import type { Academy, AcademyMembership } from '@/constants/types';

interface StaffScreenData {
  academy: Academy;
  staff: AcademyMembership[];
}

export default function AcademyStaffScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();

  const { data, status, error: loadError, refreshing, onRefresh, retry, colors } = useScreen<StaffScreenData>({
    load: async () => {
      if (!id) return err(serviceError('VALIDATION', 'No academy ID'));
      try {
        const [academyResult, staffResult] = await Promise.all([
          academyService.getAcademy(id),
          academyService.getStaff(id),
        ]);
        if (!academyResult.success) return err(academyResult.error);
        if (!staffResult.success) return err(staffResult.error);
        if (!academyResult.data) return err(notFound('Academy', id));
        return ok({ academy: academyResult.data, staff: staffResult.data });
      } catch (e) {
        return err(serviceError('UNKNOWN', e instanceof Error ? e.message : 'Failed to load staff'));
      }
    },
    deps: [id],
  });

  // Modal / UI state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteRole, setInviteRole] = useState<AcademyMembership['role']>('COACH');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<AcademyMembership | null>(null);
  const [editRole, setEditRole] = useState<AcademyMembership['role']>('COACH');

  const openInviteModal = useCallback(() => { setInviteCode(null); setShowInviteModal(true); }, []);
  const openEditMember = useCallback((member: AcademyMembership) => { setEditingMember(member); setEditRole(member.role); }, []);

  const handleCreateInvite = useCallback(async () => {
    if (!id) return;
    setCreatingInvite(true);
    try {
      const result = await academyService.createInvite(id, data!.academy.name, inviteRole, [], currentUser?.id ?? '', currentUser?.name ?? '');
      if (!result.success) return;
      setInviteCode(result.data.code);
    } finally { setCreatingInvite(false); }
  }, [id, inviteRole]);

  const handleUpdateRole = useCallback(async () => {
    if (!editingMember || !id) return;
    const result = await academyService.updateMemberRole(editingMember.id, editRole, editingMember.permissions);
    if (!result.success) return;
    setEditingMember(null);
    onRefresh();
  }, [editingMember, id, editRole, onRefresh]);

  const handleRemoveMember = useCallback(async (member: AcademyMembership) => {
    if (!id) return;
    const result = await academyService.removeMember(member.id);
    if (!result.success) return;
    onRefresh();
  }, [id, onRefresh]);

  if (status === 'loading') return <LoadingState variant="list" />;
  if (status === 'error') return <ErrorState message={loadError!.message} onRetry={retry} />;
  if (status === 'empty') return <EmptyState icon="business-outline" title="Academy not found" message="This academy may have been removed" />;

  const { academy, staff } = data!;
  const userMembership = staff.find((m) => m.userId === currentUser?.id);
  const canManageStaff = userMembership?.role === 'OWNER' || userMembership?.permissions.includes('MANAGE_STAFF');
  const roleColors: Record<AcademyMembership['role'], string> = { ...ROLE_COLORS, COACH: colors.tint };

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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
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
                        {(member.userId || 'U').slice(0, 2).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="defaultSemiBold">{member.userId}</ThemedText>
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
        inviteCode={inviteCode ?? ''}
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
