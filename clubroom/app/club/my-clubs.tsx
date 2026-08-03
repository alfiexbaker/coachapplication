import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageContainer } from '@/components/primitives/page-container';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { ThemedText } from '@/components/themed-text';
import { JoinClubCard } from '@/components/club/JoinClubCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { api } from '@/constants/config';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { useToast } from '@/components/ui/toast';
import { Routes } from '@/navigation/routes';
import type { Club, ClubMembership } from '@/constants/types';
import { ok } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';
import { clubAuthorityService } from '@/services/club-authority-service';
import {
  formatOrganizationRoleLabel,
  isClubStaffRole,
} from '@/contracts/club-governance';

interface MyClubsData {
  clubs: Club[];
  memberships: ClubMembership[];
}
type UserClub = MyClubsData['clubs'][number];
type ShowToast = ReturnType<typeof useToast>['showToast'];

function isStaffMembership(role: ClubMembership['role'] | undefined): boolean {
  return role ? isClubStaffRole(role) : false;
}

async function joinClubWithCode({
  code,
  currentUserId,
  onRefresh,
  showToast,
}: {
  code: string;
  currentUserId: string | undefined;
  onRefresh: () => void;
  showToast: ShowToast;
}) {
  if (!currentUserId) {
    uiFeedback.showToast('Please sign in to join a club.', 'error');
    return;
  }
  const result = await clubAuthorityService.joinWithCode(code);
  if (!result.success) {
    uiFeedback.showToast(result.error.message, 'error');
    return;
  }

  if (result.data.outcome === 'invite_pending') {
    showToast(`Review the ${result.data.club.name} invite in Club Invites`, 'success');
    router.push(Routes.COACH_INVITES);
    return;
  }

  if (result.data.outcome === 'already_member') {
    showToast(`You're already in ${result.data.club.name}`, 'success');
  } else {
    showToast(`Joined ${result.data.club.name}`, 'success');
  }
  onRefresh();
}

function closeMyClubs() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(Routes.HOME);
}

export default function MyClubsScreen() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ inviteCode?: string }>();
  const isCoachAccount = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';
  const initialInviteCode =
    typeof params.inviteCode === 'string' ? params.inviteCode.trim().toUpperCase() : '';

  const loadMyClubs = async () => {
    if (!currentUser?.id) {
      return ok<MyClubsData>({ clubs: [], memberships: [] });
    }
    return clubAuthorityService.listClubs();
  };

  const { data, status, error, retry, onRefresh, refreshing, colors } = useScreen<MyClubsData>({
    load: loadMyClubs,
    deps: [loadMyClubs],
    isEmpty: (value) => value.clubs.length === 0,
    refetchOnFocus: true,
  });

  const clubs = data?.clubs ?? [];
  const membershipByClubId = (() => {
    const map = new Map<string, ClubMembership>();
    (data?.memberships ?? []).forEach((membership) => map.set(membership.clubId, membership));
    return map;
  })();
  const staffClubs = clubs.filter((club) =>
    isStaffMembership(membershipByClubId.get(club.id)?.role),
  );
  const memberClubs = clubs.filter(
    (club) => !isStaffMembership(membershipByClubId.get(club.id)?.role),
  );

  const renderClubCard = (club: UserClub) => {
    const membership = membershipByClubId.get(club.id);
    return (
      <SurfaceCard
        key={club.id}
        style={styles.clubCard}
        onPress={() =>
          router.push(
            api.useMock && isStaffMembership(membership?.role)
              ? Routes.clubHub({ clubId: club.id })
              : Routes.club(club.id),
          )
        }
      >
        <View style={[styles.clubBadge, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
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
                {
                  borderColor: withAlpha(colors.tint, 0.3),
                  backgroundColor: withAlpha(colors.tint, 0.08),
                },
              ]}
            >
              <ThemedText style={[styles.rolePillText, { color: colors.tint }]}>
                {formatOrganizationRoleLabel(membership.role)}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <Row align="center" gap="xxs">
          <Ionicons name="chevron-forward" size={16} color={colors.tint} />
        </Row>
      </SurfaceCard>
    );
  };

  const handleJoin = async ({ code }: { code: string; role?: string }) =>
    joinClubWithCode({
      code,
      currentUserId: currentUser?.id,
      onRefresh,
      showToast,
    });

  if (status === 'loading') {
    return (
      <PageContainer
        header={
          <ScreenHeader
            title="My Clubs"
            action={{ icon: 'close', onPress: closeMyClubs, accessibilityLabel: 'Close' }}
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
            action={{ icon: 'close', onPress: closeMyClubs, accessibilityLabel: 'Close' }}
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
          action={{ icon: 'close', onPress: closeMyClubs, accessibilityLabel: 'Close' }}
        />
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentStyle={styles.content}
      gap={Spacing.md}
    >
      {clubs.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No clubs yet"
          message={
            isCoachAccount
              ? 'Create your first club or join one with an invite code.'
              : 'Join a club with an invite code to see updates and sessions.'
          }
        />
      ) : (
        <View style={styles.list}>
          {staffClubs.length > 0 ? (
            <View style={styles.sectionBlock}>
              <ThemedText style={[styles.sectionHeading, { color: colors.muted }]}>
                Clubs you manage
              </ThemedText>
              <View style={styles.list}>{staffClubs.map(renderClubCard)}</View>
            </View>
          ) : null}
          {memberClubs.length > 0 ? (
            <View style={styles.sectionBlock}>
              <ThemedText style={[styles.sectionHeading, { color: colors.muted }]}>
                {staffClubs.length > 0 ? 'Clubs you follow' : 'Your clubs'}
              </ThemedText>
              <View style={styles.list}>{memberClubs.map(renderClubCard)}</View>
            </View>
          ) : null}
        </View>
      )}

      <JoinClubCard
        key={initialInviteCode || 'manual-invite'}
        isCoach={isCoachAccount}
        initialCode={initialInviteCode}
        onJoin={handleJoin}
      />
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
  sectionBlock: {
    gap: Spacing.xs,
  },
  sectionHeading: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
});
