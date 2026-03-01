/**
 * Member Management Screen
 *
 * Deep management screen for individual club members.
 * Allows role changes, squad assignments, banning, and removal.
 */

import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { PageHeader } from '@/components/primitives/page-header';
import { MemberProfileCard } from '@/components/club/member-profile-card';
import { MemberSquadAssignments } from '@/components/club/member-squad-assignments';
import { MemberRoleManagement } from '@/components/club/member-role-management';
import { MemberDangerZone } from '@/components/club/member-danger-zone';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useMemberManagement } from '@/hooks/use-member-management';

export default function MemberManagementScreen() {
  const { colors } = useTheme();
  const {
    member,
    club,
    squads,
    status,
    error,
    retry,
    canManage,
    showRolePicker,
    setShowRolePicker,
    assignableRoles,
    handleChangeRole,
    handleRemoveMember,
    handleBanMember,
    handleToggleSquad,
  } = useMemberManagement();
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );
  const renderMemberShell = (content: ReactNode) =>
    renderShell(
      <>
        <PageHeader title="Member" showBack centerTitle />
        {content}
      </>,
    );

  if (status === 'loading') {
    return renderShell(<LoadingState variant="detail" />);
  }

  if (status === 'error') {
    return renderShell(
      <ErrorState message={error?.message || 'Failed to load member details.'} onRetry={retry} />,
    );
  }

  if (status === 'empty' || !member || !club) {
    return renderMemberShell(
      <EmptyState
        icon="person-outline"
        title="Member not found"
        message="This member could not be loaded."
        actionLabel="Go Back"
        onPressAction={() => router.back()}
      />,
    );
  }

  return renderMemberShell(
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <MemberProfileCard member={member} />

        {canManage && squads.length > 0 && (
          <MemberSquadAssignments
            squads={squads}
            memberSquadIds={member.squadIds || []}
            onToggle={handleToggleSquad}
          />
        )}

        {canManage && (
          <MemberRoleManagement
            currentRole={member.role}
            assignableRoles={assignableRoles}
            showPicker={showRolePicker}
            onShowPicker={setShowRolePicker}
            onChangeRole={handleChangeRole}
          />
        )}

        {canManage && <MemberDangerZone onRemove={handleRemoveMember} onBan={handleBanMember} />}

        {!canManage && (
          <SurfaceCard style={{ gap: Spacing.sm }}>
            <Row gap="xs" align="center">
              <Ionicons name="information-circle-outline" size={20} color={colors.muted} />
              <ThemedText style={[Typography.small, { color: colors.muted }]}>
                Only club admins and coaches can manage member settings.
              </ThemedText>
            </Row>
          </SurfaceCard>
        )}
      </ScrollView>
    </>,
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  content: { padding: Spacing.lg, paddingTop: 0, gap: Spacing.md, paddingBottom: Spacing.xl * 2 },
});
