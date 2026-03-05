import { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageContainer } from '@/components/primitives/page-container';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { ThemedText } from '@/components/themed-text';
import { JoinClubCard } from '@/components/club/JoinClubCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { useToast } from '@/components/ui/toast';
import { Routes } from '@/navigation/routes';
import { socialFeedService } from '@/services/social-feed-service';
import type { ClubMembership } from '@/constants/types';
import { ok } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

interface MyClubsData {
  clubs: ReturnType<typeof socialFeedService.getUserClubs>;
  memberships: ClubMembership[];
}

function roleLabel(role: ClubMembership['role']): string {
  if (role === 'HEAD_COACH') return 'Head Coach';
  if (role === 'COACH') return 'Coach';
  if (role === 'OWNER') return 'Owner';
  if (role === 'ADMIN') return 'Admin';
  return 'Member';
}

function mapUserRoleToClubRole(role: string | undefined): ClubMembership['role'] {
  if (role === 'ADMIN') return 'ADMIN';
  if (role === 'COACH') return 'COACH';
  return 'MEMBER';
}

function isStaffMembership(role: ClubMembership['role'] | undefined): boolean {
  return role === 'OWNER' || role === 'HEAD_COACH' || role === 'ADMIN' || role === 'COACH';
}

export default function MyClubsScreen() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const isCoachAccount = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  const loadMyClubs = useCallback(async () => {
    if (!currentUser?.id) {
      return ok<MyClubsData>({ clubs: [], memberships: [] });
    }
    return ok<MyClubsData>({
      clubs: socialFeedService.getUserClubs(currentUser.id),
      memberships: socialFeedService.getUserMemberships(currentUser.id),
    });
  }, [currentUser?.id]);

  const { data, status, error, retry, onRefresh, refreshing, colors } = useScreen<MyClubsData>({
    load: loadMyClubs,
    deps: [loadMyClubs],
    isEmpty: (value) => value.clubs.length === 0,
    refetchOnFocus: true,
  });

  const clubs = data?.clubs ?? [];
  const membershipByClubId = useMemo(() => {
    const map = new Map<string, ClubMembership>();
    (data?.memberships ?? []).forEach((membership) => map.set(membership.clubId, membership));
    return map;
  }, [data?.memberships]);

  const handleJoin = useCallback(
    (code: string) => {
      if (!currentUser?.id) {
        uiFeedback.alert('Sign in required', 'Please sign in to join a club.');
        return;
      }
      const joinRole = mapUserRoleToClubRole(currentUser.role);
      const result = socialFeedService.joinClub(currentUser.id, code, joinRole);
      if (!result.success) {
        uiFeedback.alert('Unable to join', result.error.message);
        return;
      }

      showToast('Joined club successfully', 'success');
      onRefresh();
    },
    [currentUser, onRefresh, showToast],
  );

  if (status === 'loading') {
    return (
      <PageContainer
        header={
          <ScreenHeader
            title="My Clubs"
            subtitle="All your clubs in one place"
            action={{ icon: 'close', onPress: () => router.back(), label: 'Close' }}
          />
        }
      >
        <LoadingState variant="list" />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer
        header={
          <ScreenHeader
            title="My Clubs"
            subtitle="All your clubs in one place"
            action={{ icon: 'close', onPress: () => router.back(), label: 'Close' }}
          />
        }
      >
        <ErrorState message={error?.message ?? 'Could not load your clubs'} onRetry={retry} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={
        <ScreenHeader
          title="My Clubs"
          subtitle="All your clubs in one place"
          action={{ icon: 'close', onPress: () => router.back(), label: 'Close' }}
        />
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentStyle={styles.content}
      gap={Spacing.md}
    >
      <JoinClubCard isCoach={isCoachAccount} onJoin={handleJoin} />

      {clubs.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No clubs yet"
          message="Join a club with an invite code to see updates and sessions."
        />
      ) : (
        <View style={styles.list}>
          {clubs.map((club) => {
            const membership = membershipByClubId.get(club.id);
            return (
              <SurfaceCard
                key={club.id}
                style={styles.clubCard}
                onPress={() =>
                  router.push(
                    isStaffMembership(membership?.role)
                      ? Routes.clubHub({ clubId: club.id })
                      : Routes.club(club.id),
                  )
                }
              >
                <View
                  style={[
                    styles.clubBadge,
                    { backgroundColor: withAlpha(colors.tint, 0.09) },
                  ]}
                >
                  <ThemedText style={[styles.clubBadgeText, { color: colors.tint }]}>
                    {club.badge || club.name.slice(0, 2).toUpperCase()}
                  </ThemedText>
                </View>

                <View style={styles.clubBody}>
                  <ThemedText type="defaultSemiBold" numberOfLines={1}>
                    {club.name}
                  </ThemedText>
                  <ThemedText style={[styles.metaText, { color: colors.muted }]} numberOfLines={1}>
                    {[club.city, `${club.memberCount} members`].filter(Boolean).join(' · ')}
                  </ThemedText>
                  {membership ? (
                    <View
                      style={[
                        styles.rolePill,
                        { borderColor: withAlpha(colors.tint, 0.3), backgroundColor: withAlpha(colors.tint, 0.08) },
                      ]}
                    >
                      <ThemedText style={[styles.rolePillText, { color: colors.tint }]}>
                        {roleLabel(membership.role)}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>

                <Row align="center" gap="xxs">
                  <ThemedText style={[styles.openLabel, { color: colors.tint }]}>Open</ThemedText>
                  <Ionicons name="chevron-forward" size={16} color={colors.tint} />
                </Row>
              </SurfaceCard>
            );
          })}
        </View>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing.xl,
  },
  list: {
    gap: Spacing.sm,
  },
  clubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  clubBadge: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubBadgeText: {
    ...Typography.bodySemiBold,
  },
  clubBody: {
    flex: 1,
    gap: Spacing.xxs,
  },
  metaText: {
    ...Typography.caption,
  },
  rolePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  rolePillText: {
    ...Typography.micro,
  },
  openLabel: {
    ...Typography.smallSemiBold,
  },
});
