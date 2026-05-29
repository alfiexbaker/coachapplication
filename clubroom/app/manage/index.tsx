import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { socialFeedService } from '@/services/social-feed-service';
import { isAdmin, isCoach } from '@/utils/user-helpers';
import { pickOwnerDashboardClubId } from '@/utils/manage-home-routing';
import { err, ok, serviceError, type Result, type ServiceError } from '@/types/result';

interface ManageRedirectTarget {
  href: Parameters<typeof router.replace>[0] | null;
}

export default function ManageRedirectScreen() {
  const { currentUser } = useAuth();
  const { clubId } = useLocalSearchParams<{ clubId?: string }>();
  const hasCoachAccess = isCoach(currentUser) || isAdmin(currentUser);

  const loadTarget = async (): Promise<Result<ManageRedirectTarget, ServiceError>> => {
    if (!hasCoachAccess || !currentUser?.id) {
      return ok({ href: null });
    }

    try {
      const memberships = await socialFeedService.getUserMembershipsHydrated(currentUser.id);
      const ownerDashboardClubId = pickOwnerDashboardClubId(memberships, clubId);

      if (ownerDashboardClubId) {
        return ok({ href: Routes.clubDashboard(ownerDashboardClubId) });
      }

      return ok({ href: Routes.manageBookings({ clubId }) });
    } catch (error) {
      return err(serviceError('UNKNOWN', 'Failed to open operations.', error));
    }
  };

  const { data, status, error, retry } = useScreen<ManageRedirectTarget>({
    load: loadTarget,
    deps: [clubId, currentUser?.id, hasCoachAccess],
    isEmpty: () => false,
    loadingStrategy: 'section-skeleton',
    dataKey: `manage-redirect:${currentUser?.id ?? 'guest'}:${clubId ?? 'default'}`,
  });

  useEffect(() => {
    if (status === 'success' && data?.href) {
      router.replace(data.href);
    }
  }, [data?.href, status]);

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

  if (status === 'loading') {
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
        <LoadingState variant="detail" />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer
        header={<PageHeader title="Operations" subtitle="Coach operations" showBack />}
      >
        <ErrorState
          title="Operations unavailable"
          message={error?.message ?? 'Failed to open operations.'}
          error={error ?? undefined}
          onRetry={retry}
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
