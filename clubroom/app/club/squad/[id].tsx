/**
 * Squad Detail Screen
 *
 * Shows squad information, member roster, and management actions.
 * Allows renaming, adding/removing members, and navigating to squad invite.
 */

import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { LoadingState, EmptyState } from '@/components/ui/screen-states';
import { SquadInfoCard } from '@/components/squad/squad-info-card';
import { SquadMembersCard } from '@/components/squad/squad-members-card';
import { SquadAddMembers } from '@/components/squad/squad-add-members';
import { SquadQuickActions } from '@/components/squad/squad-quick-actions';
import { SquadDangerZone, RemoveMemberOverlay } from '@/components/squad/squad-danger-zone';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useSquadDetail } from '@/hooks/use-squad-detail';

export default function SquadDetailScreen() {
  const { id: squadId } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const {
    squad, members, loading, resolvedClubId,
    isEditing, setIsEditing, editName, setEditName, cancelEdit,
    showAddMembers, setShowAddMembers, membersNotInSquad,
    showDeleteConfirm, setShowDeleteConfirm, deleting,
    memberToRemove, setMemberToRemove,
    openingGroupChat,
    handleGroupChat, handleSaveName, handleAddToSquad,
    handleRemoveFromSquad, confirmRemoveMember,
    handleDeleteSquad, confirmDeleteSquad, handleInviteSquad,
  } = useSquadDetail(squadId);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (!squad) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <Row align="center" justify="space-between" style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Clickable>
          <ThemedText type="title" style={Typography.heading}>Squad</ThemedText>
          <View style={{ width: 24 }} />
        </Row>
        <EmptyState
          icon="people-outline"
          title="Squad not found"
          message="This squad could not be loaded."
          actionLabel="Go Back"
          onPressAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Row align="center" justify="space-between" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <ThemedText type="title" style={Typography.heading}>{squad.name}</ThemedText>
        <Clickable onPress={handleInviteSquad} hitSlop={8}>
          <Ionicons name="paper-plane-outline" size={22} color={colors.tint} />
        </Clickable>
      </Row>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <SquadInfoCard
            squad={squad} members={members} isEditing={isEditing} editName={editName} colors={colors}
            onEditNameChange={setEditName} onSaveName={handleSaveName} onCancelEdit={cancelEdit} onStartEdit={() => setIsEditing(true)}
          />
          <SquadMembersCard
            members={members} clubId={resolvedClubId} showAddMembers={showAddMembers} colors={colors}
            onToggleAdd={() => setShowAddMembers(!showAddMembers)} onRemove={handleRemoveFromSquad}
          />
          <SquadAddMembers
            visible={showAddMembers} membersNotInSquad={membersNotInSquad} squadName={squad.name} colors={colors} onAdd={handleAddToSquad}
          />
          <SquadQuickActions colors={colors} openingGroupChat={openingGroupChat} onGroupChat={handleGroupChat} onInvite={handleInviteSquad} />
          <SquadDangerZone
            squadName={squad.name} showDeleteConfirm={showDeleteConfirm} deleting={deleting} colors={colors}
            onDelete={handleDeleteSquad} onConfirmDelete={confirmDeleteSquad} onCancelDelete={() => setShowDeleteConfirm(false)}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <RemoveMemberOverlay
        member={memberToRemove} squadName={squad.name} colors={colors}
        onConfirm={confirmRemoveMember} onCancel={() => setMemberToRemove(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  content: { padding: Spacing.lg, paddingTop: 0, gap: Spacing.md, paddingBottom: Spacing.xl * 2 },
});
