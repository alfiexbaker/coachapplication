import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/useTheme';

import SettingsScreen from './settings';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { currentUser, isLoading, error, logout } = useAuth();
  const renderShell = (content: ReactNode) => (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
      {content}
    </SafeAreaView>
  );

  if (isLoading) {
    return renderShell(<LoadingState variant="detail" />);
  }

  if (error) {
    return renderShell(<ErrorState message={error} onRetry={() => void logout()} />);
  }

  if (!currentUser) {
    return renderShell(
      <EmptyState
        icon="person-circle-outline"
        title="No active account"
        message="Please sign in to view your profile."
      />,
    );
  }

  return <SettingsScreen />;
}
