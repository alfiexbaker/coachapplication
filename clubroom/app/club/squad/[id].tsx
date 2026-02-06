/**
 * Squad Detail Screen
 *
 * Shows squad information, member roster, and management actions.
 * Allows renaming, adding/removing members, and navigating to squad invite.
 */

import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { useToast } from '@/components/ui/toast';
import { Colors, Spacing, Radii, Typography, Components , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { clubService, type ClubMember } from '@/services/club-service';
import { clubSquads as allClubSquads } from '@/constants/mock-data';
import type { ClubSquad } from '@/constants/types';
import { apiClient } from '@/services/api-client';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SquadDetail');

export default function SquadDetailScreen() {
  const { id: squadId } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [squad, setSquad] = useState<ClubSquad | null>(null);
  const [resolvedClubId, setResolvedClubId] = useState<string | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [allClubMembers, setAllClubMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [showAddMembers, setShowAddMembers] = useState(false);

  const loadData = useCallback(async () => {
    if (!squadId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Find squad from all squads (route only provides squadId, not clubId)
      const squadData = allClubSquads.find((s) => s.id === squadId) || null;
      setSquad(squadData);
      const clubId = squadData?.clubId;
      setResolvedClubId(clubId || null);

      if (squadData) {
        setEditName(squadData.name);
      }

      if (!clubId) {
        setLoading(false);
        return;
      }

      // Load all members and filter those in this squad
      const clubMembers = await clubService.getMembers(clubId);
      setAllClubMembers(clubMembers);
      const squadMembers = clubMembers.filter(
        (m) => m.squadIds?.includes(squadId)
      );
      setMembers(squadMembers);
    } catch (error) {
      logger.error('Failed to load squad data', error);
    } finally {
      setLoading(false);
    }
  }, [squadId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const membersNotInSquad = allClubMembers.filter(
    (m) => !m.squadIds?.includes(squadId || '')
  );

  const handleSaveName = async () => {
    if (!squad || !resolvedClubId || !editName.trim()) return;

    try {
      // Update squad name in storage
      const storedSquads = await apiClient.get<ClubSquad[]>('club_squads', []);
      const idx = storedSquads.findIndex((s) => s.id === squad.id);
      if (idx !== -1) {
        storedSquads[idx].name = editName.trim();
        await apiClient.set('club_squads', storedSquads);
      }

      setSquad({ ...squad, name: editName.trim() });
      setIsEditing(false);
      showToast('Squad name updated', 'success');
      logger.action('RenameSquad', { squadId, newName: editName.trim() });
    } catch (error) {
      logger.error('Failed to rename squad', error);
      showToast('Failed to rename squad', 'error');
    }
  };

  const handleAddToSquad = async (member: ClubMember) => {
    if (!resolvedClubId || !squadId) return;

    try {
      const result = await clubService.addMemberToSquad(resolvedClubId, member.userId, squadId);
      if (result.success) {
        await loadData();
        showToast(`${member.userName} added to squad`, 'success');
      } else {
        showToast('Failed to add member', 'error');
      }
    } catch (error) {
      logger.error('Failed to add member to squad', error);
      showToast('Failed to add member', 'error');
    }
  };

  const handleRemoveFromSquad = (member: ClubMember) => {
    if (!resolvedClubId || !squadId) return;

    Alert.alert(
      'Remove from Squad',
      `Remove ${member.userName} from ${squad?.name || 'this squad'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await clubService.removeMemberFromSquad(resolvedClubId, member.userId, squadId);
              if (result.success) {
                await loadData();
                showToast(`${member.userName} removed from squad`, 'success');
              } else {
                showToast('Failed to remove member', 'error');
              }
            } catch (error) {
              logger.error('Failed to remove from squad', error);
              showToast('Failed to remove member', 'error');
            }
          },
        },
      ]
    );
  };

  const handleDeleteSquad = () => {
    Alert.alert(
      'Delete Squad',
      `Are you sure you want to delete ${squad?.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const storedSquads = await apiClient.get<ClubSquad[]>('club_squads', []);
              const filtered = storedSquads.filter((s) => s.id !== squadId);
              await apiClient.set('club_squads', filtered);
              showToast('Squad deleted', 'success');
              logger.action('DeleteSquad', { squadId });
              router.back();
            } catch (error) {
              logger.error('Failed to delete squad', error);
              showToast('Failed to delete squad', 'error');
            }
          },
        },
      ]
    );
  };

  const handleInviteSquad = () => {
    router.push(Routes.squadInvite(squadId || ''));
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: palette.muted }}>Loading squad...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!squad) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>Squad</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="people-outline" size={48} color={palette.muted} />
          <ThemedText style={{ color: palette.muted, marginTop: Spacing.md }}>
            Squad not found
          </ThemedText>
          <Clickable
            onPress={() => router.back()}
            style={[styles.goBackButton, { borderColor: palette.border }]}
          >
            <ThemedText>Go Back</ThemedText>
          </Clickable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title" style={styles.headerTitle}>
          {squad.name}
        </ThemedText>
        <Clickable onPress={handleInviteSquad} hitSlop={8}>
          <Ionicons name="paper-plane-outline" size={22} color={palette.tint} />
        </Clickable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Squad Info Card */}
        <SurfaceCard style={styles.infoCard}>
          <View style={[styles.squadBanner, { backgroundColor: withAlpha(palette.tint, 0.03) }]}>
            <View style={[styles.squadIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <Ionicons name="people" size={28} color={palette.tint} />
            </View>
            {isEditing ? (
              <View style={styles.editNameContainer}>
                <TextInput
                  style={[styles.nameInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.surface }]}
                  value={editName}
                  onChangeText={setEditName}
                  autoFocus
                  selectTextOnFocus
                />
                <View style={styles.editActions}>
                  <Clickable
                    style={[styles.editButton, { backgroundColor: palette.tint }]}
                    onPress={handleSaveName}
                  >
                    <Ionicons name="checkmark" size={18} color={palette.surface} />
                  </Clickable>
                  <Clickable
                    style={[styles.editButton, { backgroundColor: palette.border }]}
                    onPress={() => {
                      setEditName(squad.name);
                      setIsEditing(false);
                    }}
                  >
                    <Ionicons name="close" size={18} color={palette.muted} />
                  </Clickable>
                </View>
              </View>
            ) : (
              <View style={styles.squadNameRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="title" style={{ ...Typography.title }}>{squad.name}</ThemedText>
                  <ThemedText style={{ ...Typography.small, color: palette.muted }}>
                    {squad.level} -- {squad.primaryCoach}
                  </ThemedText>
                </View>
                <Clickable onPress={() => setIsEditing(true)} hitSlop={8}>
                  <Ionicons name="pencil-outline" size={18} color={palette.muted} />
                </Clickable>
              </View>
            )}
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText type="title" style={{ ...Typography.title }}>{members.length}</ThemedText>
              <ThemedText style={{ ...Typography.caption, color: palette.muted }}>Members</ThemedText>
            </View>
            {squad.meetLocation && (
              <View style={[styles.statItem, { borderLeftWidth: 1, borderLeftColor: palette.border }]}>
                <Ionicons name="location-outline" size={20} color={palette.tint} />
                <ThemedText style={{ ...Typography.caption, color: palette.muted }}>{squad.meetLocation}</ThemedText>
              </View>
            )}
          </View>

          {/* Tags */}
          {squad.tags && squad.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {squad.tags.map((tag, idx) => (
                <View key={idx} style={[styles.tag, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                  <ThemedText style={{ ...Typography.caption, color: palette.tint }}>{tag}</ThemedText>
                </View>
              ))}
            </View>
          )}
        </SurfaceCard>

        {/* Squad Members */}
        <SurfaceCard style={styles.membersCard}>
          <View style={styles.membersSectionHeader}>
            <ThemedText type="defaultSemiBold" style={{ ...Typography.subheading }}>
              Squad Members ({members.length})
            </ThemedText>
            <Clickable
              style={[styles.addMemberButton, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
              onPress={() => setShowAddMembers(!showAddMembers)}
            >
              <Ionicons name={showAddMembers ? 'close' : 'person-add-outline'} size={16} color={palette.tint} />
              <ThemedText style={{ ...Typography.caption, color: palette.tint }}>
                {showAddMembers ? 'Done' : 'Add'}
              </ThemedText>
            </Clickable>
          </View>

          {members.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color={palette.muted} />
              <ThemedText style={{ ...Typography.body, color: palette.muted, textAlign: 'center' }}>
                No members in this squad yet. Add members from the club roster.
              </ThemedText>
            </View>
          ) : (
            <View style={styles.membersList}>
              {members.map((member) => {
                const roleColor = clubService.getRoleColor(member.role);
                const initials = member.userName.slice(0, 2).toUpperCase();
                return (
                  <Clickable
                    key={member.userId}
                    style={[styles.memberRow, { borderBottomColor: palette.border }]}
                    onPress={() => {
                      if (resolvedClubId) {
                        router.push(Routes.clubMember(resolvedClubId, member.userId));
                      }
                    }}
                  >
                    <View style={[styles.memberAvatar, { backgroundColor: withAlpha(roleColor, 0.09) }]}>
                      <ThemedText style={{ color: roleColor, ...Typography.smallSemiBold }}>
                        {initials}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="defaultSemiBold">{member.userName}</ThemedText>
                      <ThemedText style={{ ...Typography.caption, color: roleColor }}>
                        {clubService.formatRole(member.role)}
                      </ThemedText>
                    </View>
                    <View style={styles.memberRowActions}>
                      <Clickable
                        onPress={() => handleRemoveFromSquad(member)}
                        hitSlop={8}
                      >
                        <Ionicons name="remove-circle-outline" size={20} color={palette.error} />
                      </Clickable>
                      <Ionicons name="chevron-forward" size={18} color={palette.muted} />
                    </View>
                  </Clickable>
                );
              })}
            </View>
          )}
        </SurfaceCard>

        {/* Add Members Panel */}
        {showAddMembers && membersNotInSquad.length > 0 && (
          <SurfaceCard style={styles.addMembersCard}>
            <ThemedText type="defaultSemiBold">
              Add Club Members
            </ThemedText>
            <ThemedText style={{ ...Typography.small, color: palette.muted }}>
              Tap to add to {squad.name}
            </ThemedText>
            <View style={styles.membersList}>
              {membersNotInSquad.map((member) => {
                const roleColor = clubService.getRoleColor(member.role);
                const initials = member.userName.slice(0, 2).toUpperCase();
                return (
                  <Clickable
                    key={member.userId}
                    style={[styles.addMemberRow, { borderColor: palette.border }]}
                    onPress={() => handleAddToSquad(member)}
                  >
                    <View style={[styles.memberAvatar, { backgroundColor: withAlpha(roleColor, 0.09) }]}>
                      <ThemedText style={{ color: roleColor, ...Typography.smallSemiBold }}>
                        {initials}
                      </ThemedText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <ThemedText type="defaultSemiBold">{member.userName}</ThemedText>
                      <ThemedText style={{ ...Typography.caption, color: roleColor }}>
                        {clubService.formatRole(member.role)}
                      </ThemedText>
                    </View>
                    <View style={[styles.addIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                      <Ionicons name="add" size={18} color={palette.tint} />
                    </View>
                  </Clickable>
                );
              })}
            </View>
          </SurfaceCard>
        )}

        {showAddMembers && membersNotInSquad.length === 0 && (
          <SurfaceCard style={styles.addMembersCard}>
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={32} color={palette.success} />
              <ThemedText style={{ ...Typography.body, color: palette.muted, textAlign: 'center' }}>
                All club members are already in this squad.
              </ThemedText>
            </View>
          </SurfaceCard>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Clickable
            style={[styles.quickActionButton, { backgroundColor: palette.tint }]}
            onPress={handleInviteSquad}
          >
            <Ionicons name="paper-plane-outline" size={18} color={palette.surface} />
            <ThemedText style={{ color: palette.surface, fontWeight: '600' }}>
              Send Squad Invite
            </ThemedText>
          </Clickable>
        </View>

        {/* Delete Squad */}
        <SurfaceCard style={[styles.dangerCard, { borderColor: withAlpha(palette.error, 0.19) }]}>
          <Clickable
            style={[styles.deleteButton, { borderColor: palette.error }]}
            onPress={handleDeleteSquad}
          >
            <Ionicons name="trash-outline" size={18} color={palette.error} />
            <ThemedText style={{ color: palette.error, fontWeight: '600' }}>Delete Squad</ThemedText>
          </Clickable>
        </SurfaceCard>
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  goBackButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    ...Typography.heading,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
    paddingBottom: Spacing.xl * 2,
  },
  infoCard: {
    gap: Spacing.sm,
  },
  squadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  squadIcon: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  editNameContainer: {
    flex: 1,
    gap: Spacing.xs,
  },
  nameInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.subheading,
  },
  editActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squadNameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
  },
  membersCard: {
    gap: Spacing.sm,
  },
  membersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  membersList: {
    gap: Spacing.xs / 2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  memberRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMembersCard: {
    gap: Spacing.sm,
  },
  addMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  addIcon: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    gap: Spacing.sm,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  dangerCard: {
    gap: Spacing.sm,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
});
