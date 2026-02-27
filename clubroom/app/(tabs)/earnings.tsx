import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

import EarningsScreen from '../earnings';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/useTheme';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';

export default function TabEarningsScreen() {
  const { currentUser, isLoading, error, logout } = useAuth();
  const { colors } = useTheme();
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
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
        icon="person-outline"
        title="Sign in required"
        message="Please sign in to view earnings."
      />,
    );
  }

  return <EarningsScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
