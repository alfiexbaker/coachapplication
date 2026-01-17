/**
 * Coach Invites Screen
 *
 * Inbox for coaches to view and respond to club/organization invites.
 * When a coach uses a club invite code, they land here to confirm joining.
 *
 * FLOW:
 * 1. Coach enters invite code in Club Hub
 * 2. Code is validated and invite details shown here
 * 3. Coach can Accept (joins the club) or Decline (cancel)
 * 4. On Accept, coach becomes a member with the invited role
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { clubInvites as mockClubInvites, getClubById } from '@/constants/mock-data';
import type { ClubInvite, ClubRole } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CoachInvitesScreen');

const PENDING_CLUB_INVITES_KEY = 'pending_club_invites';

interface PendingClubInvite {
  id: string;
  inviteCode: string;
  clubId: string;
  clubName: string;
  clubBadge?: string;
  role: ClubRole;
  invitedBy: string;
  invitedAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'declined';
}

// Role display names
const ROLE_LABELS: Record<ClubRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Administrator',
  HEAD_COACH: 'Head Coach',
  COACH: 'Coach',
  MEMBER: 'Member',
};

export default function CoachInvitesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const params = useLocalSearchParams<{ code?: string; clubId?: string; clubName?: string; role?: string }>();

  const [invites, setInvites] = useState<PendingClubInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  // Load pending invites
  const loadInvites = useCallback(async () => {
    if (!currentUser) return;

    try {
      const stored = await AsyncStorage.getItem(`${PENDING_CLUB_INVITES_KEY}_${currentUser.id}`);
      if (stored) {
        const parsed: PendingClubInvite[] = JSON.parse(stored);
        // Filter to only pending invites that haven't expired
        const validInvites = parsed.filter(
          (inv) => inv.status === 'pending' && new Date(inv.expiresAt) > new Date()
        );
        setInvites(validInvites);
      }
    } catch (error) {
      logger.error('Failed to load invites', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  // Handle incoming invite code from params
  useEffect(() => {
    const processIncomingInvite = async () => {
      if (params.code && params.clubId && params.clubName && currentUser) {
        // Check if this invite is already pending
        const stored = await AsyncStorage.getItem(`${PENDING_CLUB_INVITES_KEY}_${currentUser.id}`);
        const existing: PendingClubInvite[] = stored ? JSON.parse(stored) : [];

        if (!existing.find((inv) => inv.inviteCode === params.code)) {
          // Get club details for badge
          const club = getClubById(params.clubId);

          const newInvite: PendingClubInvite = {
            id: `invite_${Date.now()}`,
            inviteCode: params.code,
            clubId: params.clubId,
            clubName: params.clubName,
            clubBadge: club?.badge,
            role: (params.role as ClubRole) || 'COACH',
            invitedBy: 'Club Admin',
            invitedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            status: 'pending',
          };

          existing.push(newInvite);
          await AsyncStorage.setItem(
            `${PENDING_CLUB_INVITES_KEY}_${currentUser.id}`,
            JSON.stringify(existing)
          );
          setInvites(existing.filter((inv) => inv.status === 'pending'));
        }
      }
    };

    processIncomingInvite();
  }, [params.code, params.clubId, params.clubName, currentUser]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  useFocusEffect(
    useCallback(() => {
      loadInvites();
    }, [loadInvites])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadInvites();
  };

  const handleAccept = async (invite: PendingClubInvite) => {
    if (!currentUser) return;

    setRespondingTo(invite.id);
    try {
      // Update invite status
      const stored = await AsyncStorage.getItem(`${PENDING_CLUB_INVITES_KEY}_${currentUser.id}`);
      const allInvites: PendingClubInvite[] = stored ? JSON.parse(stored) : [];
      const updated = allInvites.map((inv) =>
        inv.id === invite.id ? { ...inv, status: 'accepted' as const } : inv
      );
      await AsyncStorage.setItem(
        `${PENDING_CLUB_INVITES_KEY}_${currentUser.id}`,
        JSON.stringify(updated)
      );

      // TODO: In real app, this would create the club membership via API
      logger.info('Accepted club invite', { clubId: invite.clubId, role: invite.role });

      Alert.alert(
        'Welcome!',
        `You've joined ${invite.clubName} as ${ROLE_LABELS[invite.role]}.`,
        [
          {
            text: 'Go to Club',
            onPress: () => router.push({ pathname: '/club/[id]', params: { id: invite.clubId } }),
          },
        ]
      );

      loadInvites();
    } catch (error) {
      logger.error('Failed to accept invite', error);
      Alert.alert('Error', 'Failed to accept invite. Please try again.');
    } finally {
      setRespondingTo(null);
    }
  };

  const handleDecline = (invite: PendingClubInvite) => {
    Alert.alert(
      'Decline Invite',
      `Are you sure you want to decline the invitation to join ${invite.clubName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setRespondingTo(invite.id);
            try {
              const stored = await AsyncStorage.getItem(`${PENDING_CLUB_INVITES_KEY}_${currentUser?.id}`);
              const allInvites: PendingClubInvite[] = stored ? JSON.parse(stored) : [];
              const updated = allInvites.map((inv) =>
                inv.id === invite.id ? { ...inv, status: 'declined' as const } : inv
              );
              await AsyncStorage.setItem(
                `${PENDING_CLUB_INVITES_KEY}_${currentUser?.id}`,
                JSON.stringify(updated)
              );
              loadInvites();
            } catch (error) {
              logger.error('Failed to decline invite', error);
              Alert.alert('Error', 'Failed to decline invite.');
            } finally {
              setRespondingTo(null);
            }
          },
        },
      ]
    );
  };

  const formatExpiry = (expiresAt: string): string => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Expired';
    if (diffDays === 1) return 'Expires today';
    if (diffDays <= 7) return `Expires in ${diffDays} days`;
    return `Expires ${expires.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
  };

  const renderInvite = ({ item: invite }: { item: PendingClubInvite }) => {
    const isResponding = respondingTo === invite.id;

    return (
      <SurfaceCard style={styles.inviteCard}>
        {/* Club Info */}
        <View style={styles.inviteHeader}>
          <View style={[styles.clubBadge, { backgroundColor: `${palette.tint}15` }]}>
            <ThemedText style={[styles.clubBadgeText, { color: palette.tint }]}>
              {invite.clubBadge?.slice(0, 2) || invite.clubName.slice(0, 2).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.clubInfo}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 17 }}>
              {invite.clubName}
            </ThemedText>
            <View style={[styles.roleBadge, { backgroundColor: `${palette.success}15` }]}>
              <Ionicons name="shield-checkmark" size={14} color={palette.success} />
              <ThemedText style={[styles.roleText, { color: palette.success }]}>
                Invited as {ROLE_LABELS[invite.role]}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Invite Details */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={16} color={palette.muted} />
            <ThemedText style={{ color: palette.muted }}>Invited by {invite.invitedBy}</ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color={palette.warning} />
            <ThemedText style={{ color: palette.warning }}>{formatExpiry(invite.expiresAt)}</ThemedText>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.declineButton, { borderColor: palette.border }]}
            onPress={() => handleDecline(invite)}
            disabled={isResponding}
          >
            <ThemedText style={[styles.declineText, { color: palette.muted }]}>Decline</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.acceptButton, { backgroundColor: palette.tint }]}
            onPress={() => handleAccept(invite)}
            disabled={isResponding}
          >
            {isResponding ? (
              <ThemedText style={styles.acceptText}>Joining...</ThemedText>
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#fff" />
                <ThemedText style={styles.acceptText}>Accept & Join</ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </SurfaceCard>
    );
  };

  const pendingCount = invites.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader
        title="Club Invites"
        subtitle={pendingCount > 0 ? `${pendingCount} pending` : 'No pending invites'}
        showBack
        onBackPress={() => router.back()}
      />

      <FlatList
        data={invites}
        keyExtractor={(item) => item.id}
        renderItem={renderInvite}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: `${palette.muted}10` }]}>
              <Ionicons name="shield-outline" size={40} color={palette.muted} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
              {loading ? 'Loading...' : 'No pending invites'}
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              When you enter a club invite code, the invitation will appear here for you to review and accept.
            </ThemedText>
            <Pressable
              style={[styles.goToClubHubButton, { backgroundColor: palette.tint }]}
              onPress={() => router.push('/(tabs)/club-hub')}
            >
              <Ionicons name="people" size={18} color="#fff" />
              <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Go to Club Hub</ThemedText>
            </Pressable>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: Spacing.md,
  },
  inviteCard: {
    gap: Spacing.md,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  clubBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubBadgeText: {
    fontSize: 18,
    fontWeight: '700',
  },
  clubInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailsSection: {
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  declineButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  declineText: {
    fontSize: 15,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  acceptText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  separator: {
    height: Spacing.sm,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontSize: 18,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  goToClubHubButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.md,
  },
});
