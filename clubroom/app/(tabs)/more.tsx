import { useAuth } from '@/hooks/use-auth';
import { CoachAnalyticsScreen } from '@/components/coach/analytics-screen';
import { UserFindCoachScreen } from '@/components/user/find-coach-screen';
import { ParentDevelopmentScreen } from '@/components/parent/development-screen';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ScreenHeader } from '@/components/primitives/screen-header';

export default function MoreScreen() {
  const { currentUser } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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
          <ScreenHeader
            title="More"
            subtitle="Settings and options"
          />
        </SafeAreaView>
      );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
