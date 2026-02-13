import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EarningsScreen from '../earnings';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/useTheme';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';

export default function TabEarningsScreen() {
  const { currentUser, isLoading, error, logout } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <ErrorState message={error} onRetry={() => void logout()} />
      </SafeAreaView>
    );
  }

  if (!currentUser) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <EmptyState
          icon="person-outline"
          title="Sign in required"
          message="Please sign in to view earnings."
        />
      </SafeAreaView>
    );
  }

  return <EarningsScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
