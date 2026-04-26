import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/screen-states';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { socialFeedService } from '@/services/social-feed-service';
import { isAdmin, isCoach } from '@/utils/user-helpers';
import { pickOwnerDashboardClubId } from '@/utils/manage-home-routing';

export default function ManageRedirectScreen() {
  const { currentUser } = useAuth();
  const { clubId } = useLocalSearchParams<{ clubId?: string }>();
  const [checkingTarget, setCheckingTarget] = useState(true);

  const hasCoachAccess = isCoach(currentUser) || isAdmin(currentUser);

  useEffect(() => {
    let cancelled = false;

    async function redirectToRealSurface() {
      if (!hasCoachAccess || !currentUser?.id) {
        if (!cancelled) {
          setCheckingTarget(false);
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

        router.replace(Routes.manageBookings({ clubId }));
      } finally {
        if (!cancelled) {
          setCheckingTarget(false);
        }
      }
    }

    void redirectToRealSurface();

    return () => {
      cancelled = true;
    };
  }, [clubId, currentUser?.id, hasCoachAccess]);

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
          title="Operations"
          subtitle="Opening the correct staffing surface"
          showBack
        />
      }
    >
      <SurfaceCard>
        <ThemedText>Opening the correct staffing surface.</ThemedText>
      </SurfaceCard>
    </PageContainer>
  );
}
