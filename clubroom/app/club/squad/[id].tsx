/**
 * Squad Detail Screen
 *
 * Shows squad information, member roster, and management actions.
 * Allows renaming, adding/removing members, and navigating to squad invite.
 */

import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { LoadingState, EmptyState } from '@/components/ui/screen-states';
import { SquadInfoCard } from '@/components/squad/squad-info-card';
import { SquadMembersCard } from '@/components/squad/squad-members-card';
import { SquadAddMembers } from '@/components/squad/squad-add-members';
import { SquadQuickActions } from '@/components/squad/squad-quick-actions';
import { SquadDangerZone, RemoveMemberOverlay } from '@/components/squad/squad-danger-zone';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useSquadDetail } from '@/hooks/use-squad-detail';

export default function SquadDetailScreen() {
  const { id: squadId } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const {
    squad,
    members,
    loading,
    resolvedClubId,
    isEditing,
    setIsEditing,
    editName,
    setEditName,
    cancelEdit,
    showAddMembers,
    setShowAddMembers,
    membersNotInSquad,
    showDeleteConfirm,
    setShowDeleteConfirm,
    deleting,
    memberToRemove,
    setMemberToRemove,
    openingGroupChat,
    handleGroupChat,
    handleSaveName,
    handleAddToSquad,
    handleRemoveFromSquad,
    confirmRemoveMember,
    handleDeleteSquad,
    confirmDeleteSquad,
    handleInviteSquad,
    handleOpenSchedule,
  } = useSquadDetail(squadId);
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );

  if (loading) {
    return renderShell(<LoadingState variant="form" />);
  }

  if (!squad) {
    return renderShell(
      <>
        <PageHeader title="Squad" showBack centerTitle />
        <EmptyState
          icon="people-outline"
          title="Squad not found"
          message="This squad could not be loaded."
          actionLabel="Go Back"
          onPressAction={() => router.back()}
        />
      </>,
    );
  }

  return renderShell(
    <>
      <PageHeader
        title={squad.name}
        showBack
        centerTitle
        right={
          <Row align="center" gap="sm">
            <Clickable onPress={handleOpenSchedule} hitSlop={8} accessibilityLabel="Open team schedule">
              <Ionicons name="calendar-outline" size={22} color={colors.tint} />
            </Clickable>
            <Clickable onPress={handleInviteSquad} hitSlop={8} accessibilityLabel="Invite squad">
              <Ionicons name="paper-plane-outline" size={22} color={colors.tint} />
            </Clickable>
          </Row>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <SquadInfoCard
            squad={squad}
            members={members}
            isEditing={isEditing}
            editName={editName}
            colors={colors}
            onEditNameChange={setEditName}
            onSaveName={handleSaveName}
            onCancelEdit={cancelEdit}
            onStartEdit={() => setIsEditing(true)}
          />
          <SquadMembersCard
            members={members}
            clubId={resolvedClubId}
            showAddMembers={showAddMembers}
            colors={colors}
            onToggleAdd={() => setShowAddMembers(!showAddMembers)}
            onRemove={handleRemoveFromSquad}
          />
          <SquadAddMembers
            visible={showAddMembers}
            membersNotInSquad={membersNotInSquad}
            squadName={squad.name}
            colors={colors}
            onAdd={handleAddToSquad}
          />
          <SquadQuickActions
            colors={colors}
            openingGroupChat={openingGroupChat}
            onGroupChat={handleGroupChat}
            onInvite={handleInviteSquad}
            onSchedule={handleOpenSchedule}
          />
          <SquadDangerZone
            squadName={squad.name}
            showDeleteConfirm={showDeleteConfirm}
            deleting={deleting}
            colors={colors}
            onDelete={handleDeleteSquad}
            onConfirmDelete={confirmDeleteSquad}
            onCancelDelete={() => setShowDeleteConfirm(false)}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <RemoveMemberOverlay
        member={memberToRemove}
        squadName={squad.name}
        colors={colors}
        onConfirm={confirmRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />
    </>,
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, paddingTop: 0, gap: Spacing.md, paddingBottom: Spacing.xl * 2 },
});
