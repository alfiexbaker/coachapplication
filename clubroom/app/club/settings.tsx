import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert, Share, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/ui/toast';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { clubService, type ClubMember } from '@/services/club-service';
import { getClubById, getClubSquads, getClubInvites, getClubMembershipForUser } from '@/constants/mock-data';
import type { Club, ClubSquad, ClubRole } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ClubSettings');

type SettingsSection = 'details' | 'invites' | 'squads' | 'members' | 'danger';

interface InviteCodeItem {
  code: string;
  role: ClubRole;
  remainingUses: number;
  expiresAt: string;
}

export default function ClubSettingsScreen() {
  const { clubId: paramClubId, section: paramSection } = useLocalSearchParams<{ clubId?: string; section?: string }>();
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  // Derive clubId from param or user's membership (settings is a static route)
  const membership = currentUser ? getClubMembershipForUser(currentUser.id) : undefined;
  const clubId = paramClubId || membership?.clubId;

  const [club, setClub] = useState<Club | null>(null);
  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCodeItem[]>([]);
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    (paramSection as SettingsSection) || 'details'
  );
  const [loading, setLoading] = useState(true);

  // Editable fields
  const [editName, setEditName] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editCity, setEditCity] = useState('');

  const loadData = useCallback(async () => {
    if (!clubId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const clubData = getClubById(clubId);
      if (clubData) {
        setClub(clubData);
        setEditName(clubData.name);
        setEditTagline(clubData.tagline || '');
        setEditCity(clubData.city);
      }

      const squadData = getClubSquads(clubId);
      setSquads(squadData);

      const memberData = await clubService.getMembers(clubId);
      setMembers(memberData);

      const inviteData = getClubInvites(clubId);
      setInviteCodes(inviteData.map(i => ({
        code: i.code,
        role: i.role,
        remainingUses: i.remainingUses,
        expiresAt: i.expiresAt,
      })));

      logger.debug('ClubSettingsLoaded', { clubId, memberCount: memberData.length });
    } catch (error) {
      logger.error('LoadSettingsFailed', error);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    showToast('Code copied!', 'success');
    logger.action('CopyInviteCode', { code });
  };

  const handleShareCode = async (code: string, role: string) => {
    try {
      await Share.share({
        message: `Join ${club?.name} on ClubRoom! Use invite code: ${code}`,
      });
      logger.action('ShareInviteCode', { code, role });
    } catch (error) {
      logger.error('ShareFailed', error);
    }
  };

  const handleGenerateCode = (role: ClubRole) => {
    const prefix = club?.name.slice(0, 4).toUpperCase() || 'CLUB';
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newCode = `${prefix}-${suffix}`;

    setInviteCodes(prev => [...prev, {
      code: newCode,
      role,
      remainingUses: 10,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }]);

    showToast(`New ${role.toLowerCase()} invite code created`, 'success');
    logger.action('GenerateInviteCode', { role, code: newCode });
  };

  const handleSaveDetails = () => {
    if (!club) return;
    // In real app, would save to API/storage
    showToast('Club details saved', 'success');
    logger.action('SaveClubDetails', { name: editName, city: editCity });
  };

  const handleCreateSquad = () => {
    router.push(Routes.CLUB_SQUAD_CREATE);
  };

  const handleDeleteClub = () => {
    Alert.alert(
      'Delete Club',
      'This will permanently delete the club and remove all members. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            logger.action('DeleteClub', { clubId });
            showToast('Club deleted', 'success');
            router.replace(Routes.CLUB_HUB);
          },
        },
      ]
    );
  };

  const sections: { key: SettingsSection; icon: string; label: string }[] = [
    { key: 'details', icon: 'information-circle-outline', label: 'Details' },
    { key: 'invites', icon: 'mail-outline', label: 'Invites' },
    { key: 'squads', icon: 'layers-outline', label: 'Squads' },
    { key: 'members', icon: 'people-outline', label: 'Members' },
    { key: 'danger', icon: 'warning-outline', label: 'Danger' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!club) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.muted} />
          <ThemedText type="subtitle" style={{ textAlign: 'center' }}>No club found</ThemedText>
          <ThemedText style={{ color: palette.muted, textAlign: 'center' }}>
            Join or create a club to manage settings.
          </ThemedText>
          <Clickable
            onPress={() => router.back()}
            style={{ backgroundColor: palette.tint, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.button }}
          >
            <ThemedText style={{ color: palette.onPrimary, fontWeight: '600' }}>Go Back</ThemedText>
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
        <View style={styles.headerTitle}>
          <ThemedText type="title">Club Settings</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            {club.name}
          </ThemedText>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Section Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContainer}
      >
        {sections.map((section) => (
          <Clickable
            key={section.key}
            style={[
              styles.tab,
              activeSection === section.key && { backgroundColor: withAlpha(palette.tint, 0.09) },
              { borderColor: activeSection === section.key ? palette.tint : palette.border },
            ].filter(Boolean) as ViewStyle[]}
            onPress={() => setActiveSection(section.key)}
          >
            <Ionicons
              name={section.icon as keyof typeof Ionicons.glyphMap}
              size={18}
              color={activeSection === section.key ? palette.tint : palette.muted}
            />
            <ThemedText
              style={[
                styles.tabLabel,
                { color: activeSection === section.key ? palette.tint : palette.muted },
              ]}
            >
              {section.label}
            </ThemedText>
          </Clickable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Details Section */}
        {activeSection === 'details' && (
          <Animated.View entering={FadeInDown.springify()}>
            <SurfaceCard style={styles.sectionCard}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Club Information
              </ThemedText>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                  Club Name
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
                  value={editName}
                  onChangeText={setEditName}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                  Tagline
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
                  value={editTagline}
                  onChangeText={setEditTagline}
                  placeholder="Add a tagline..."
                  placeholderTextColor={palette.muted}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                  City
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
                  value={editCity}
                  onChangeText={setEditCity}
                />
              </View>

              <Clickable
                style={[styles.saveButton, { backgroundColor: palette.tint }]}
                onPress={handleSaveDetails}
              >
                <ThemedText style={[styles.saveButtonText, { color: palette.onPrimary }]}>Save Changes</ThemedText>
              </Clickable>
            </SurfaceCard>
          </Animated.View>
        )}

        {/* Invites Section */}
        {activeSection === 'invites' && (
          <Animated.View entering={FadeInDown.springify()}>
            <SurfaceCard style={styles.sectionCard}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Invite Codes
              </ThemedText>
              <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
                Share codes to invite coaches and members
              </ThemedText>

              {inviteCodes.map((invite, index) => (
                <View
                  key={invite.code}
                  style={[styles.inviteRow, { borderColor: palette.border }]}
                >
                  <View style={styles.inviteInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.inviteCode}>
                      {invite.code}
                    </ThemedText>
                    <View style={styles.inviteMeta}>
                      <View style={[styles.roleBadge, { backgroundColor: withAlpha(clubService.getRoleColor(invite.role), 0.12) }]}>
                        <ThemedText style={[styles.roleText, { color: clubService.getRoleColor(invite.role) }]}>
                          {clubService.formatRole(invite.role)}
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.inviteUses, { color: palette.muted }]}>
                        {invite.remainingUses} uses left
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.inviteActions}>
                    <Clickable
                      style={[styles.iconButton, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
                      onPress={() => handleCopyCode(invite.code)}
                    >
                      <Ionicons name="copy-outline" size={18} color={palette.tint} />
                    </Clickable>
                    <Clickable
                      style={[styles.iconButton, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
                      onPress={() => handleShareCode(invite.code, invite.role)}
                    >
                      <Ionicons name="share-outline" size={18} color={palette.tint} />
                    </Clickable>
                  </View>
                </View>
              ))}

              <View style={styles.generateButtons}>
                <Clickable
                  style={[styles.generateButton, { borderColor: palette.border }]}
                  onPress={() => handleGenerateCode('COACH')}
                >
                  <Ionicons name="add" size={18} color={palette.tint} />
                  <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
                    Coach Invite
                  </ThemedText>
                </Clickable>
                <Clickable
                  style={[styles.generateButton, { borderColor: palette.border }]}
                  onPress={() => handleGenerateCode('MEMBER')}
                >
                  <Ionicons name="add" size={18} color={palette.tint} />
                  <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
                    Member Invite
                  </ThemedText>
                </Clickable>
              </View>
            </SurfaceCard>
          </Animated.View>
        )}

        {/* Squads Section */}
        {activeSection === 'squads' && (
          <Animated.View entering={FadeInDown.springify()}>
            <SurfaceCard style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View>
                  <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                    Squads
                  </ThemedText>
                  <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
                    Organize athletes into teams
                  </ThemedText>
                </View>
                <Clickable
                  style={[styles.addButton, { backgroundColor: palette.tint }]}
                  onPress={handleCreateSquad}
                >
                  <Ionicons name="add" size={20} color={palette.onPrimary} />
                </Clickable>
              </View>

              {squads.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="layers-outline" size={40} color={palette.muted} />
                  <ThemedText style={{ color: palette.muted, textAlign: 'center' }}>
                    No squads yet. Create one to organize your athletes.
                  </ThemedText>
                </View>
              ) : (
                squads.map((squad) => (
                  <Clickable
                    key={squad.id}
                    style={[styles.squadRow, { borderColor: palette.border }]}
                    onPress={() => router.push(Routes.clubSquad(squad.id))}
                  >
                    <View style={styles.squadInfo}>
                      <ThemedText type="defaultSemiBold">{squad.name}</ThemedText>
                      <ThemedText style={[styles.squadMeta, { color: palette.muted }]}>
                        {squad.level} · {squad.memberCount} members
                      </ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={palette.muted} />
                  </Clickable>
                ))
              )}
            </SurfaceCard>
          </Animated.View>
        )}

        {/* Members Section */}
        {activeSection === 'members' && (
          <Animated.View entering={FadeInDown.springify()}>
            <SurfaceCard style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View>
                  <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                    Members ({members.length})
                  </ThemedText>
                  <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
                    Manage club members and roles
                  </ThemedText>
                </View>
                <Clickable
                  style={[styles.inviteButton, { borderColor: palette.tint }]}
                  onPress={() => router.push(Routes.CLUB_INVITE_MEMBERS)}
                >
                  <Ionicons name="person-add-outline" size={18} color={palette.tint} />
                  <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
                    Invite
                  </ThemedText>
                </Clickable>
              </View>

              {members.map((member) => (
                <Clickable
                  key={member.userId}
                  style={[styles.memberRow, { borderColor: palette.border }]}
                  onPress={() => {
                    if (clubId) router.push(Routes.clubMember(clubId, member.userId));
                  }}
                >
                  <View style={[styles.memberAvatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                    <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
                      {member.userName.charAt(0)}
                    </ThemedText>
                  </View>
                  <View style={styles.memberInfo}>
                    <ThemedText type="defaultSemiBold">{member.userName}</ThemedText>
                    <View style={[styles.roleBadge, { backgroundColor: withAlpha(clubService.getRoleColor(member.role), 0.12) }]}>
                      <ThemedText style={[styles.roleText, { color: clubService.getRoleColor(member.role) }]}>
                        {clubService.formatRole(member.role)}
                      </ThemedText>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={palette.muted} />
                </Clickable>
              ))}
            </SurfaceCard>
          </Animated.View>
        )}

        {/* Danger Section */}
        {activeSection === 'danger' && (
          <Animated.View entering={FadeInDown.springify()}>
            <SurfaceCard style={[styles.sectionCard, { borderColor: palette.error }]}>
              <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, { color: palette.error }]}>
                Danger Zone
              </ThemedText>
              <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
                These actions are irreversible
              </ThemedText>

              <Clickable
                style={[styles.dangerButton, { borderColor: palette.error }]}
                onPress={handleDeleteClub}
              >
                <Ionicons name="trash-outline" size={18} color={palette.error} />
                <ThemedText style={{ color: palette.error, fontWeight: '600' }}>
                  Delete Club
                </ThemedText>
              </Clickable>
            </SurfaceCard>
          </Animated.View>
        )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  subtitle: {
    ...Typography.small,
    marginTop: Spacing.micro,
  },
  tabsScroll: {
    flexGrow: 0,
  },
  tabsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  tabLabel: {
    ...Typography.smallSemiBold,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
  },
  sectionCard: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...Typography.heading,
  },
  sectionSubtitle: {
    ...Typography.small,
    marginTop: Spacing.micro,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    ...Typography.smallSemiBold,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
  },
  saveButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.sm,
  },
  saveButtonText: {
    fontWeight: '600',
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  inviteInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  inviteCode: {
    ...Typography.subheading,
    fontFamily: 'monospace',
  },
  inviteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  roleText: {
    ...Typography.caption,
  },
  inviteUses: {
    ...Typography.caption,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  generateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
    borderWidth: 1.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  squadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  squadInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  squadMeta: {
    ...Typography.small,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
});
