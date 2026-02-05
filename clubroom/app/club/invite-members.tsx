import { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TextInput, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/ui/toast';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { bookings, getUserById, getClubById } from '@/constants/mock-data';
import type { ClubRole } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('InviteMembers');

interface PastSessionUser {
  userId: string;
  userName: string;
  userAvatar?: string;
  sessionCount: number;
  lastSessionDate: string;
  isParent: boolean;
  childName?: string;
}

type InviteTab = 'past-sessions' | 'manual';

export default function InviteMembersScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<InviteTab>('past-sessions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedRole, setSelectedRole] = useState<ClubRole>('MEMBER');
  const [manualEmail, setManualEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const club = clubId ? getClubById(clubId) : null;

  // Get users from past sessions with this coach
  const pastSessionUsers = useMemo(() => {
    if (!currentUser) return [];

    const userMap = new Map<string, PastSessionUser>();

    // Filter bookings where current user was the coach
    const coachBookings = bookings.filter(
      (b) => b.coachId === currentUser.id && b.status === 'COMPLETED'
    );

    coachBookings.forEach((booking) => {
      // Check if booking was made by a parent for a child
      const bookedBy = booking.bookedById || booking.athleteId;
      const isParent = bookedBy !== booking.athleteId;

      // Get the user who booked (could be parent or athlete)
      const user = getUserById(bookedBy!);
      if (!user) return;

      const existing = userMap.get(bookedBy!);
      if (existing) {
        existing.sessionCount++;
        if (new Date(booking.scheduledAt) > new Date(existing.lastSessionDate)) {
          existing.lastSessionDate = booking.scheduledAt;
        }
      } else {
        const athlete = isParent && booking.athleteId ? getUserById(booking.athleteId) : null;
        userMap.set(bookedBy!, {
          userId: bookedBy!,
          userName: user.name || 'Unknown',
          userAvatar: user.avatar,
          sessionCount: 1,
          lastSessionDate: booking.scheduledAt,
          isParent,
          childName: athlete?.name,
        });
      }
    });

    // Sort by session count (most sessions first)
    return Array.from(userMap.values()).sort((a, b) => b.sessionCount - a.sessionCount);
  }, [currentUser]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return pastSessionUsers;
    const query = searchQuery.toLowerCase();
    return pastSessionUsers.filter(
      (u) =>
        u.userName.toLowerCase().includes(query) ||
        u.childName?.toLowerCase().includes(query)
    );
  }, [pastSessionUsers, searchQuery]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.userId)));
    }
  };

  const handleSendInvites = async () => {
    if (selectedUsers.size === 0) {
      showToast('Select at least one user', 'warning');
      return;
    }

    setIsInviting(true);
    logger.action('SendClubInvites', {
      clubId,
      userCount: selectedUsers.size,
      role: selectedRole,
    });

    // Simulate sending invites
    await new Promise((resolve) => setTimeout(resolve, 1000));

    showToast(`Invited ${selectedUsers.size} users to ${club?.name}`, 'success');
    setIsInviting(false);
    router.back();
  };

  const handleManualInvite = () => {
    if (!manualEmail.trim() || !manualEmail.includes('@')) {
      showToast('Enter a valid email', 'warning');
      return;
    }

    logger.action('ManualInvite', { email: manualEmail, role: selectedRole });
    showToast(`Invite sent to ${manualEmail}`, 'success');
    setManualEmail('');
  };

  const roleOptions: { role: ClubRole; label: string; description: string }[] = [
    { role: 'MEMBER', label: 'Member', description: 'Can view posts and RSVP to events' },
    { role: 'COACH', label: 'Coach', description: 'Can post and manage squads' },
    { role: 'ADMIN', label: 'Admin', description: 'Full management access' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title" style={styles.headerTitle}>
          Invite Members
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Clickable
          style={[
            styles.tab,
            activeTab === 'past-sessions' && { backgroundColor: palette.tint },
          ].filter(Boolean) as ViewStyle[]}
          onPress={() => setActiveTab('past-sessions')}
        >
          <Ionicons
            name="people-outline"
            size={18}
            color={activeTab === 'past-sessions' ? '#fff' : palette.text}
          />
          <ThemedText
            style={[
              styles.tabText,
              { color: activeTab === 'past-sessions' ? '#fff' : palette.text },
            ]}
          >
            Past Sessions
          </ThemedText>
        </Clickable>
        <Clickable
          style={[
            styles.tab,
            activeTab === 'manual' && { backgroundColor: palette.tint },
          ].filter(Boolean) as ViewStyle[]}
          onPress={() => setActiveTab('manual')}
        >
          <Ionicons
            name="mail-outline"
            size={18}
            color={activeTab === 'manual' ? '#fff' : palette.text}
          />
          <ThemedText
            style={[
              styles.tabText,
              { color: activeTab === 'manual' ? '#fff' : palette.text },
            ]}
          >
            Manual
          </ThemedText>
        </Clickable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Role Selection */}
        <SurfaceCard style={styles.roleCard}>
          <ThemedText type="defaultSemiBold">Invite as</ThemedText>
          <View style={styles.roleOptions}>
            {roleOptions.map((option) => (
              <Clickable
                key={option.role}
                style={[
                  styles.roleOption,
                  {
                    borderColor:
                      selectedRole === option.role ? palette.tint : palette.border,
                    backgroundColor:
                      selectedRole === option.role ? `${palette.tint}10` : 'transparent',
                  },
                ]}
                onPress={() => setSelectedRole(option.role)}
              >
                <View style={styles.roleHeader}>
                  <View
                    style={[
                      styles.radioOuter,
                      { borderColor: selectedRole === option.role ? palette.tint : palette.border },
                    ]}
                  >
                    {selectedRole === option.role && (
                      <View style={[styles.radioInner, { backgroundColor: palette.tint }]} />
                    )}
                  </View>
                  <ThemedText type="defaultSemiBold">{option.label}</ThemedText>
                </View>
                <ThemedText style={[styles.roleDescription, { color: palette.muted }]}>
                  {option.description}
                </ThemedText>
              </Clickable>
            ))}
          </View>
        </SurfaceCard>

        {activeTab === 'past-sessions' ? (
          <>
            {/* Search */}
            <View style={[styles.searchContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Ionicons name="search" size={20} color={palette.muted} />
              <TextInput
                style={[styles.searchInput, { color: palette.text }]}
                placeholder="Search by name..."
                placeholderTextColor={palette.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <Clickable onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={palette.muted} />
                </Clickable>
              ) : null}
            </View>

            {/* Select All */}
            {filteredUsers.length > 0 && (
              <View style={styles.selectAllRow}>
                <ThemedText style={{ color: palette.muted }}>
                  {selectedUsers.size} of {filteredUsers.length} selected
                </ThemedText>
                <Clickable onPress={handleSelectAll}>
                  <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
                    {selectedUsers.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
                  </ThemedText>
                </Clickable>
              </View>
            )}

            {/* User List */}
            {filteredUsers.length === 0 ? (
              <SurfaceCard style={styles.emptyCard}>
                <Ionicons name="people-outline" size={48} color={palette.muted} />
                <ThemedText style={{ color: palette.muted, textAlign: 'center' }}>
                  {searchQuery
                    ? 'No users match your search'
                    : 'No past session users found. Complete some sessions first!'}
                </ThemedText>
              </SurfaceCard>
            ) : (
              <View style={styles.userList}>
                {filteredUsers.map((user, index) => (
                  <Animated.View
                    key={user.userId}
                    entering={FadeInDown.delay(index * 30).springify()}
                  >
                    <Clickable
                      style={[
                        styles.userRow,
                        {
                          borderColor: selectedUsers.has(user.userId)
                            ? palette.tint
                            : palette.border,
                          backgroundColor: selectedUsers.has(user.userId)
                            ? `${palette.tint}08`
                            : palette.surface,
                        },
                      ]}
                      onPress={() => toggleUserSelection(user.userId)}
                    >
                      <View style={styles.userLeft}>
                        <View
                          style={[
                            styles.checkbox,
                            {
                              borderColor: selectedUsers.has(user.userId)
                                ? palette.tint
                                : palette.border,
                              backgroundColor: selectedUsers.has(user.userId)
                                ? palette.tint
                                : 'transparent',
                            },
                          ]}
                        >
                          {selectedUsers.has(user.userId) && (
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          )}
                        </View>
                        <View style={[styles.avatar, { backgroundColor: `${palette.tint}20` }]}>
                          <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
                            {user.userName.charAt(0)}
                          </ThemedText>
                        </View>
                        <View style={styles.userInfo}>
                          <ThemedText type="defaultSemiBold">{user.userName}</ThemedText>
                          <View style={styles.userMeta}>
                            {user.isParent && user.childName && (
                              <ThemedText style={[styles.childBadge, { color: palette.muted }]}>
                                Parent of {user.childName}
                              </ThemedText>
                            )}
                            <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                              {user.sessionCount} session{user.sessionCount !== 1 ? 's' : ''}
                            </ThemedText>
                          </View>
                        </View>
                      </View>
                      <View style={styles.sessionBadge}>
                        <Ionicons name="calendar-outline" size={14} color={palette.muted} />
                        <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                          {new Date(user.lastSessionDate).toLocaleDateString('en-GB', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </ThemedText>
                      </View>
                    </Clickable>
                  </Animated.View>
                ))}
              </View>
            )}
          </>
        ) : (
          /* Manual Invite Tab */
          <SurfaceCard style={styles.manualCard}>
            <ThemedText type="defaultSemiBold">Invite by Email</ThemedText>
            <ThemedText style={[styles.manualDescription, { color: palette.muted }]}>
              Send an invite link directly to someone&apos;s email
            </ThemedText>

            <View style={styles.manualInputRow}>
              <TextInput
                style={[
                  styles.manualInput,
                  { backgroundColor: palette.background, borderColor: palette.border, color: palette.text },
                ]}
                placeholder="email@example.com"
                placeholderTextColor={palette.muted}
                value={manualEmail}
                onChangeText={setManualEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Clickable
                style={[styles.sendButton, { backgroundColor: palette.tint }]}
                onPress={handleManualInvite}
              >
                <Ionicons name="send" size={18} color="#fff" />
              </Clickable>
            </View>
          </SurfaceCard>
        )}
      </ScrollView>

      {/* Footer */}
      {activeTab === 'past-sessions' && selectedUsers.size > 0 && (
        <View style={[styles.footer, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
          <Clickable
            style={[styles.inviteButton, { backgroundColor: palette.tint }]}
            onPress={handleSendInvites}
            disabled={isInviting}
          >
            {isInviting ? (
              <ThemedText style={styles.inviteButtonText}>Sending...</ThemedText>
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color="#fff" />
                <ThemedText style={styles.inviteButtonText}>
                  Invite {selectedUsers.size} User{selectedUsers.size !== 1 ? 's' : ''}
                </ThemedText>
              </>
            )}
          </Clickable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: 18,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  tabText: {
    fontWeight: '600',
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
    paddingBottom: 120,
  },
  roleCard: {
    gap: Spacing.sm,
  },
  roleOptions: {
    gap: Spacing.sm,
  },
  roleOption: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.xs,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roleDescription: {
    fontSize: 13,
    marginLeft: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xs,
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  userList: {
    gap: Spacing.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  childBadge: {
    fontSize: 12,
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  manualCard: {
    gap: Spacing.sm,
  },
  manualDescription: {
    fontSize: 13,
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
