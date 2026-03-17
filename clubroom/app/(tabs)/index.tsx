import { useAuth } from '@/hooks/use-auth';
import { CoachDevelopmentScreen } from '@/components/coach/development-screen';
import { FamilyCalendarScreen } from '@/components/family/family-calendar-screen';
import { NotificationBell } from '@/components/ui/notification-bell';
import { UserHomeScreen } from '@/components/user/home-screen';
import { AdminUsersScreen } from '@/components/admin/users-screen';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { useTheme } from '@/hooks/useTheme';
import { isParentLikeUser } from '@/utils/user-helpers';

export default function IndexScreen() {
  const { currentUser, isLoading, error, logout } = useAuth();
  const { colors: palette } = useTheme();
  const renderShell = (content: ReactNode) => (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
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
        message="Please sign in to continue."
      />,
    );
  }

  if (isParentLikeUser(currentUser)) {
    return (
      <FamilyCalendarScreen
        headerTitle="Family"
        headerSubtitle="Run your family week"
        showBack={false}
        rightAction={<NotificationBell size={20} />}
      />
    );
  }

  switch (currentUser?.role) {
    case 'COACH':
      return <CoachDevelopmentScreen />;
    case 'USER':
      return <UserHomeScreen />;
    case 'ADMIN':
      return <AdminUsersScreen />;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
