import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href, useLocalSearchParams } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, LoadingState } from '@/components/ui/screen-states';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { socialFeedService } from '@/services/social-feed-service';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { isCoach, isAdmin } from '@/utils/user-helpers';
import { pickOwnerDashboardClubId } from '@/utils/manage-home-routing';

interface ManageAction {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  colorKey: 'tint' | 'success' | 'warning' | 'error' | 'accent' | 'icon';
  route: Href;
}

export default function ManageScreen() {
  const { currentUser } = useAuth();
  const { colors } = useTheme();
  const { clubId } = useLocalSearchParams<{ clubId?: string }>();
  const [checkingRedirect, setCheckingRedirect] = useState(true);

  const hasCoachAccess = isCoach(currentUser) || isAdmin(currentUser);

  useEffect(() => {
    let cancelled = false;

    async function redirectOwnersToDashboard() {
      if (!currentUser?.id) {
        if (!cancelled) {
          setCheckingRedirect(false);
        }
        return;
      }

      try {
        const memberships = await socialFeedService.getUserMembershipsHydrated(currentUser.id);
        const ownerDashboardClubId = pickOwnerDashboardClubId(memberships, clubId);

        if (ownerDashboardClubId) {
          router.replace(Routes.clubDashboard(ownerDashboardClubId));
          return;
        }
      } finally {
        if (!cancelled) {
          setCheckingRedirect(false);
        }
      }
    }

    void redirectOwnersToDashboard();

    return () => {
      cancelled = true;
    };
  }, [clubId, currentUser?.id]);

  const actions = useMemo<ManageAction[]>(
    () => [
      {
        id: 'booking-console',
        title: 'Staffing Console',
        description:
          'Assign, reassign, and monitor club-owned sessions from one operations surface.',
        icon: 'layers-outline',
        colorKey: 'warning',
        route: Routes.manageBookings({ clubId }),
      },
      {
        id: 'head-coach-oversight',
        title: 'Head Coach Oversight',
        description:
          'Review completion health, athlete watchlists, and delivery standards in one scoped view.',
        icon: 'shield-checkmark-outline',
        colorKey: 'success',
        route: Routes.manageHeadCoach({ clubId }),
      },
      {
        id: 'new',
        title: 'Create New Session',
        description: 'Build a fresh session flow with schedule, pricing, and invite steps.',
        icon: 'sparkles-outline',
        colorKey: 'tint',
        route: Routes.sessionsCreateIntent({
          intent: 'new',
          source: 'club_manage',
          actingAs: clubId ? 'club' : undefined,
          clubId,
        }),
      },
      {
        id: 'existing',
        title: 'Invite to Existing Session',
        description: 'Quick-add athletes into already published upcoming sessions.',
        icon: 'paper-plane-outline',
        colorKey: 'success',
        route: Routes.sessionsCreateIntent({
          intent: 'existing',
          source: 'club_manage',
          actingAs: clubId ? 'club' : undefined,
          clubId,
        }),
      },
      {
        id: 'club-hub',
        title: 'Club Hub & Admin',
        description: 'Single club surface for feed, settings, branding, invites, and member ops.',
        icon: 'shield-outline',
        colorKey: 'accent',
        route: Routes.clubHub({ clubId }),
      },
      {
        id: 'invites',
        title: 'Invite Inbox',
        description: 'Track pending invites, counters, and responses.',
        icon: 'mail-open-outline',
        colorKey: 'warning',
        route: Routes.SESSION_INVITES,
      },
      {
        id: 'earnings-reconciler',
        title: 'Earnings Reconciler',
        description: 'Reconcile session payments: owed, paid, and written-off.',
        icon: 'wallet-outline',
        colorKey: 'tint',
        route: Routes.EARNINGS,
      },
    ],
    [clubId],
  );

  if (checkingRedirect) {
    return (
      <PageContainer
        header={
          <PageHeader title="Operations" subtitle="Checking the right working surface" showBack />
        }
      >
        <LoadingState variant="detail" />
      </PageContainer>
    );
  }

  if (!hasCoachAccess) {
    return (
      <PageContainer
        header={<PageHeader title="Operations" subtitle="Coach operations" showBack />}
        horizontalSpacing={0}
      >
        <EmptyState
          icon="lock-closed-outline"
          title="Coach access only"
          message="Operations tools are available on coach accounts."
          actionLabel="Go back"
          onPressAction={() => router.back()}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={
        <PageHeader
          title="Coach Operations"
          subtitle="Bridge into staffing, oversight, and live session controls"
          showBack
        />
      }
    >
      <SurfaceCard style={[styles.hintCard, { borderColor: colors.border }]}>
        <ThemedText style={styles.hintTitle}>Why this screen still exists</ThemedText>
        <ThemedText style={[styles.hintText, { color: colors.muted }]}>
          Owners now land on the club dashboard instead. This bridge stays for coach and head-coach
          cases where the app does not yet know which club context to open first.
        </ThemedText>
      </SurfaceCard>

      {actions.map((action) => {
        const color = colors[action.colorKey];
        return (
          <Clickable
            key={action.id}
            onPress={() => router.push(action.route)}
            style={[
              styles.actionCard,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
            accessibilityRole="button"
            accessibilityLabel={action.title}
          >
            <Row gap="sm" align="center">
              <View style={[styles.actionIcon, { backgroundColor: withAlpha(color, 0.12) }]}>
                <Ionicons name={action.icon} size={18} color={color} />
              </View>
              <View style={styles.actionText}>
                <ThemedText style={styles.actionTitle}>{action.title}</ThemedText>
                <ThemedText style={[styles.actionDescription, { color: colors.muted }]}>
                  {action.description}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Row>
          </Clickable>
        );
      })}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.md,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    gap: Spacing.micro,
  },
  actionTitle: {
    ...Typography.bodySemiBold,
  },
  actionDescription: {
    ...Typography.caption,
    lineHeight: 16,
  },
  hintCard: {
    marginTop: Spacing.xs,
    borderWidth: 1,
  },
  hintTitle: {
    ...Typography.smallSemiBold,
  },
  hintText: {
    ...Typography.caption,
    marginTop: Spacing.xxs,
  },
});
