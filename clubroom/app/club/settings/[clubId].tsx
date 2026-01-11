import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
  ActionSheetIOS,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/ui/toast';
import { getClubById, getAllClubMembershipsForUser } from '@/constants/mock-data';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import type { Club, ClubMembership, ClubRole } from '@/constants/types';
import { clubSettingsService, type ClubSettings } from '@/services/club-settings-service';
import { clubService, type ClubMember } from '@/services/club-service';

type SettingsSection = 'general' | 'members' | 'notifications' | 'danger';

export default function ClubSettingsScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [club, setClub] = useState<Club | undefined>();
  const [membership, setMembership] = useState<ClubMembership | undefined>();
  const [settings, setSettings] = useState<ClubSettings | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Editable fields
  const [clubName, setClubName] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>();
  const [isPublic, setIsPublic] = useState(false);
  const [notifyOnNewSession, setNotifyOnNewSession] = useState(true);
  const [notifyOnNewPost, setNotifyOnNewPost] = useState(true);
  const [notifyOnNewMatch, setNotifyOnNewMatch] = useState(true);
  const [notifyOnNewEvent, setNotifyOnNewEvent] = useState(true);
  const [sessionReminderHours, setSessionReminderHours] = useState(24);
  const [inviteCode, setInviteCode] = useState('');

  const canManageSettings = membership && clubSettingsService.canManageSettings(membership.role);
  const canDeleteClub = membership && clubSettingsService.canDeleteClub(membership.role);
  const canPromoteMembers = membership && ['OWNER', 'ADMIN'].includes(membership.role);

  const loadData = useCallback(async () => {
    if (!clubId) return;

    setIsLoading(true);
    try {
      const clubData = getClubById(clubId);
      setClub(clubData);

      if (currentUser?.id) {
        const memberships = getAllClubMembershipsForUser(currentUser.id);
        const userMembership = memberships.find((m) => m.clubId === clubId);
        setMembership(userMembership);
      }

      if (clubData) {
        const clubSettings = await clubSettingsService.getClubSettings(
          clubId,
          clubData.name,
          clubData.inviteCode
        );
        setSettings(clubSettings);
        setClubName(clubSettings.name || clubData.name);
        setDescription(clubSettings.description);
        setPhotoUri(clubSettings.photoUri || clubData.photoUrl);
        setIsPublic(clubSettings.isPublic);
        setNotifyOnNewSession(clubSettings.notifyOnNewSession);
        setNotifyOnNewPost(clubSettings.notifyOnNewPost);
        setNotifyOnNewMatch(clubSettings.notifyOnNewMatch);
        setNotifyOnNewEvent(clubSettings.notifyOnNewEvent);
        setSessionReminderHours(clubSettings.sessionReminderHours);
        setInviteCode(clubSettings.inviteCode || clubData.inviteCode);

        // Load members
        const memberList = await clubService.getMembers(clubId);
        setMembers(memberList);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      showToast('Failed to load settings', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [clubId, currentUser?.id, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveSettings = async () => {
    if (!clubId || !canManageSettings) return;

    setIsSaving(true);
    try {
      await clubSettingsService.updateClubSettings(clubId, {
        name: clubName,
        description,
        photoUri,
        isPublic,
        notifyOnNewSession,
        notifyOnNewPost,
        notifyOnNewMatch,
        notifyOnNewEvent,
        sessionReminderHours,
      });
      showToast('Settings saved', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickImage = async () => {
    if (!canManageSettings) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleRegenerateCode = async () => {
    if (!clubId || !canManageSettings) return;

    Alert.alert(
      'Regenerate Invite Code',
      'This will invalidate the current invite code. Anyone with the old code will not be able to join. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            try {
              const newCode = await clubSettingsService.regenerateInviteCode(clubId);
              setInviteCode(newCode);
              showToast('New invite code generated', 'success');
            } catch (error) {
              showToast('Failed to regenerate code', 'error');
            }
          },
        },
      ]
    );
  };

  const handleCopyCode = () => {
    // In production, use a proper clipboard library
    showToast(`Code copied: ${inviteCode}`, 'success');
  };

  const handlePromoteMember = (member: ClubMember) => {
    if (!canPromoteMembers) return;

    const options: { label: string; role: ClubRole }[] = [
      { label: 'Admin', role: 'ADMIN' },
      { label: 'Head Coach', role: 'HEAD_COACH' },
      { label: 'Coach', role: 'COACH' },
      { label: 'Member', role: 'MEMBER' },
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', ...options.map((o) => o.label)],
          cancelButtonIndex: 0,
          title: `Change role for ${member.userName}`,
          message: `Current role: ${clubService.formatRole(member.role)}`,
        },
        (buttonIndex) => {
          if (buttonIndex > 0) {
            const selectedRole = options[buttonIndex - 1].role;
            // In a real app, this would update the member's role
            showToast(`Role changed to ${options[buttonIndex - 1].label}`, 'success');
          }
        }
      );
    } else {
      Alert.alert(
        `Change role for ${member.userName}`,
        `Current role: ${clubService.formatRole(member.role)}`,
        [
          { text: 'Cancel', style: 'cancel' },
          ...options.map((option) => ({
            text: option.label,
            onPress: () => {
              showToast(`Role changed to ${option.label}`, 'success');
            },
          })),
        ]
      );
    }
  };

  const handleDeleteClub = () => {
    if (!canDeleteClub) return;

    Alert.alert(
      'Delete Club',
      'Are you sure you want to delete this club? This action cannot be undone. All members, posts, sessions, and data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Club',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm Deletion',
              `Type "${club?.name}" to confirm deletion.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'I understand, delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      if (clubId) {
                        await clubSettingsService.deleteClubSettings(clubId);
                      }
                      showToast('Club deleted', 'success');
                      router.replace('/(tabs)');
                    } catch (error) {
                      showToast('Failed to delete club', 'error');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  if (!clubId || (!isLoading && !club)) {
    return (
      <>
        <Stack.Screen options={{ title: 'Settings' }} />
        <View style={[styles.container, { backgroundColor: palette.background }]}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={palette.muted} />
            <ThemedText style={{ color: palette.muted }}>Club not found</ThemedText>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: palette.tint }]}
              onPress={() => router.back()}
            >
              <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Go Back</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  if (!canManageSettings) {
    return (
      <>
        <Stack.Screen options={{ title: 'Settings' }} />
        <View style={[styles.container, { backgroundColor: palette.background }]}>
          <View style={styles.errorContainer}>
            <Ionicons name="lock-closed-outline" size={48} color={palette.muted} />
            <ThemedText style={{ color: palette.muted, textAlign: 'center' }}>
              You don't have permission to access club settings
            </ThemedText>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: palette.tint }]}
              onPress={() => router.back()}
            >
              <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Go Back</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Club Settings',
          headerBackTitle: 'Club',
          headerRight: () => (
            <TouchableOpacity onPress={handleSaveSettings} disabled={isSaving}>
              <ThemedText
                style={{
                  color: isSaving ? palette.muted : palette.tint,
                  fontWeight: '600',
                  fontSize: 16,
                }}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </ThemedText>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Club Photo & Name */}
          <SurfaceCard style={styles.section}>
            <View style={styles.photoSection}>
              <TouchableOpacity onPress={handlePickImage} style={styles.photoContainer}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.clubPhoto} />
                ) : (
                  <View style={[styles.clubPhotoPlaceholder, { backgroundColor: `${palette.tint}10` }]}>
                    <ThemedText style={styles.clubPhotoText}>
                      {clubName?.slice(0, 2).toUpperCase() || 'CL'}
                    </ThemedText>
                  </View>
                )}
                <View style={[styles.cameraIcon, { backgroundColor: palette.tint }]}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              </TouchableOpacity>
              <ThemedText style={{ color: palette.muted, fontSize: 13, marginTop: Spacing.xs }}>
                Tap to change photo
              </ThemedText>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Club Name</ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                ]}
                value={clubName}
                onChangeText={setClubName}
                placeholder="Enter club name"
                placeholderTextColor={palette.muted}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Description</ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  styles.textArea,
                  { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder="Tell members about your club"
                placeholderTextColor={palette.muted}
                multiline
                numberOfLines={4}
              />
            </View>
          </SurfaceCard>

          {/* Invite Code */}
          <SurfaceCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="ticket-outline" size={20} color={palette.tint} />
              <ThemedText type="defaultSemiBold">Invite Code</ThemedText>
            </View>
            <ThemedText style={{ color: palette.muted, fontSize: 13, marginBottom: Spacing.sm }}>
              Share this code with people you want to invite to the club
            </ThemedText>
            <View style={styles.inviteCodeRow}>
              <View style={[styles.inviteCodeBox, { backgroundColor: `${palette.tint}08`, borderColor: palette.border }]}>
                <ThemedText style={[styles.inviteCodeText, { color: palette.tint }]}>{inviteCode}</ThemedText>
              </View>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: palette.tint }]}
                onPress={handleCopyCode}
              >
                <Ionicons name="copy-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: palette.warning }]}
                onPress={handleRegenerateCode}
              >
                <Ionicons name="refresh" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </SurfaceCard>

          {/* Member Roles */}
          <SurfaceCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people-outline" size={20} color={palette.tint} />
              <ThemedText type="defaultSemiBold">Member Roles</ThemedText>
            </View>
            <ThemedText style={{ color: palette.muted, fontSize: 13, marginBottom: Spacing.sm }}>
              Tap a member to change their role
            </ThemedText>
            <View style={styles.memberList}>
              {members.map((member) => (
                <TouchableOpacity
                  key={member.userId}
                  style={[styles.memberRow, { borderColor: palette.border }]}
                  onPress={() => handlePromoteMember(member)}
                  disabled={!canPromoteMembers || member.role === 'OWNER'}
                >
                  <View style={[styles.memberAvatar, { backgroundColor: `${clubService.getRoleColor(member.role)}15` }]}>
                    <ThemedText style={[styles.memberAvatarText, { color: clubService.getRoleColor(member.role) }]}>
                      {member.userName.slice(0, 2).toUpperCase()}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold">{member.userName}</ThemedText>
                    <ThemedText style={{ color: clubService.getRoleColor(member.role), fontSize: 12 }}>
                      {clubService.formatRole(member.role)}
                    </ThemedText>
                  </View>
                  {canPromoteMembers && member.role !== 'OWNER' && (
                    <Ionicons name="chevron-forward" size={18} color={palette.muted} />
                  )}
                  {member.role === 'OWNER' && (
                    <View style={[styles.ownerBadge, { backgroundColor: `${palette.tint}15` }]}>
                      <ThemedText style={{ color: palette.tint, fontSize: 10, fontWeight: '600' }}>OWNER</ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </SurfaceCard>

          {/* Privacy Settings */}
          <SurfaceCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-outline" size={20} color={palette.tint} />
              <ThemedText type="defaultSemiBold">Privacy</ThemedText>
            </View>
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">Public Club</ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
                  Allow anyone to discover and request to join
                </ThemedText>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: palette.border, true: palette.tint }}
                thumbColor="#fff"
              />
            </View>
          </SurfaceCard>

          {/* Notification Settings */}
          <SurfaceCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="notifications-outline" size={20} color={palette.tint} />
              <ThemedText type="defaultSemiBold">Notifications</ThemedText>
            </View>
            <ThemedText style={{ color: palette.muted, fontSize: 13, marginBottom: Spacing.sm }}>
              Choose what members are notified about
            </ThemedText>

            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <ThemedText>New Sessions</ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                  Notify when new training sessions are created
                </ThemedText>
              </View>
              <Switch
                value={notifyOnNewSession}
                onValueChange={setNotifyOnNewSession}
                trackColor={{ false: palette.border, true: palette.tint }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.settingRow, { borderTopWidth: 1, borderColor: palette.border, paddingTop: Spacing.sm }]}>
              <View style={{ flex: 1 }}>
                <ThemedText>New Posts</ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                  Notify when new announcements are posted
                </ThemedText>
              </View>
              <Switch
                value={notifyOnNewPost}
                onValueChange={setNotifyOnNewPost}
                trackColor={{ false: palette.border, true: palette.tint }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.settingRow, { borderTopWidth: 1, borderColor: palette.border, paddingTop: Spacing.sm }]}>
              <View style={{ flex: 1 }}>
                <ThemedText>New Matches</ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                  Notify when new fixtures are scheduled
                </ThemedText>
              </View>
              <Switch
                value={notifyOnNewMatch}
                onValueChange={setNotifyOnNewMatch}
                trackColor={{ false: palette.border, true: palette.tint }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.settingRow, { borderTopWidth: 1, borderColor: palette.border, paddingTop: Spacing.sm }]}>
              <View style={{ flex: 1 }}>
                <ThemedText>New Events</ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                  Notify when club events are created
                </ThemedText>
              </View>
              <Switch
                value={notifyOnNewEvent}
                onValueChange={setNotifyOnNewEvent}
                trackColor={{ false: palette.border, true: palette.tint }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.settingRow, { borderTopWidth: 1, borderColor: palette.border, paddingTop: Spacing.sm }]}>
              <View style={{ flex: 1 }}>
                <ThemedText>Session Reminders</ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                  Hours before session to send reminder
                </ThemedText>
              </View>
              <View style={styles.reminderPicker}>
                {[0, 1, 24, 48].map((hours) => (
                  <TouchableOpacity
                    key={hours}
                    style={[
                      styles.reminderOption,
                      {
                        backgroundColor: sessionReminderHours === hours ? palette.tint : palette.surface,
                        borderColor: sessionReminderHours === hours ? palette.tint : palette.border,
                      },
                    ]}
                    onPress={() => setSessionReminderHours(hours)}
                  >
                    <ThemedText
                      style={{
                        color: sessionReminderHours === hours ? '#fff' : palette.text,
                        fontSize: 12,
                        fontWeight: '600',
                      }}
                    >
                      {hours === 0 ? 'Off' : `${hours}h`}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </SurfaceCard>

          {/* Danger Zone */}
          {canDeleteClub && (
            <SurfaceCard style={[styles.section, styles.dangerSection]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="warning-outline" size={20} color={palette.error} />
                <ThemedText type="defaultSemiBold" style={{ color: palette.error }}>
                  Danger Zone
                </ThemedText>
              </View>
              <ThemedText style={{ color: palette.muted, fontSize: 13, marginBottom: Spacing.sm }}>
                These actions are irreversible. Please be careful.
              </ThemedText>
              <TouchableOpacity
                style={[styles.dangerButton, { borderColor: palette.error }]}
                onPress={handleDeleteClub}
              >
                <Ionicons name="trash-outline" size={18} color={palette.error} />
                <ThemedText style={{ color: palette.error, fontWeight: '600' }}>Delete Club</ThemedText>
              </TouchableOpacity>
            </SurfaceCard>
          )}

          <View style={{ height: Spacing.xl * 2 }} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  button: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    marginTop: Spacing.sm,
  },
  section: {
    marginHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  photoContainer: {
    position: 'relative',
  },
  clubPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  clubPhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubPhotoText: {
    fontSize: 36,
    fontWeight: '700',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inviteCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  inviteCodeBox: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  inviteCodeText: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberList: {
    gap: Spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ownerBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  reminderPicker: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  reminderOption: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  dangerSection: {
    borderColor: '#FEE2E2',
    borderWidth: 1,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
});
