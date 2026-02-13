import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/useTheme';

import SettingsScreen from './settings';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { currentUser, isLoading, error, logout } = useAuth();

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <ErrorState message={error} onRetry={() => void logout()} />
      </SafeAreaView>
    );
  }

  if (!currentUser) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
        <EmptyState
          icon="person-circle-outline"
          title="No active account"
          message="Please sign in to view your profile."
        />
      </SafeAreaView>
    );
  }

  return <SettingsScreen />;
}
