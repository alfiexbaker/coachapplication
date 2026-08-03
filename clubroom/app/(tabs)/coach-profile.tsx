import { Redirect } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { Routes } from '@/navigation/routes';

export default function CoachProfileScreen() {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <Redirect href={currentUser?.role === 'COACH' ? Routes.EDIT_PROFILE : Routes.HOME} />
  );
}
