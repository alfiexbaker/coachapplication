import { Slot } from 'expo-router';

import { RouteAccessGate } from '@/components/auth/route-access-gate';
import { useAuth } from '@/hooks/use-auth';
import { Routes } from '@/navigation/routes';

export default function VerificationLayout() {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) return null;

  const redirectHref =
    currentUser?.role === 'USER' &&
    !currentUser.hasChildren &&
    (currentUser.children?.length ?? 0) === 0
      ? Routes.DEVELOPMENT_MY_PROGRESS
      : Routes.ROOT;

  return (
    <RouteAccessGate allowed={currentUser?.role === 'COACH'} redirectHref={redirectHref}>
      <Slot />
    </RouteAccessGate>
  );
}
