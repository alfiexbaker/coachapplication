import { useAuth } from '@/hooks/use-auth';
import { CoachAnalyticsScreen } from '@/components/coach/analytics-screen';
import { UserFindCoachScreen } from '@/components/user/find-coach-screen';
import { ParentDevelopmentScreen } from '@/components/parent/development-screen';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';

export default function MoreScreen() {
  const { currentUser, isLoading, error, logout } = useAuth();
  const { colors: palette } = useTheme();

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <ScreenHeader title="More" subtitle="Settings and options" />
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <ScreenHeader title="More" subtitle="Settings and options" />
        <ErrorState message={error} onRetry={() => void logout()} />
      </SafeAreaView>
    );
  }

  if (!currentUser) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <ScreenHeader title="More" subtitle="Settings and options" />
        <EmptyState
          icon="person-outline"
          title="Sign in required"
          message="Please sign in to access role-specific tools."
        />
      </SafeAreaView>
    );
  }

  // Route to appropriate screen based on role
  switch (currentUser?.role) {
    case 'COACH':
      // Analytics screen for coaches
      return <CoachAnalyticsScreen />;
    case 'USER':
      // Find Coach screen for users
      return <UserFindCoachScreen />;
    case 'PARENT':
      // Development/Progress screen for parents
      return <ParentDevelopmentScreen />;
    default:
      return (
        <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
          <ScreenHeader title="More" subtitle="Settings and options" />
        </SafeAreaView>
      );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
