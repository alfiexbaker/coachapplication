import { useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { LoadingState } from '@/components/ui/screen-states';
import { Routes } from '@/navigation/routes';

export default function ClubBrandingRedirectScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();

  useEffect(() => {
    router.replace(Routes.clubSettings({ clubId, section: 'branding' }));
  }, [clubId]);

  return (
    <PageContainer header={<PageHeader title="Club Branding" showBack subtitle="Redirecting..." />}>
      <LoadingState variant="form" />
    </PageContainer>
  );
}
