import { useAuth } from '@/hooks/use-auth';
import { CoachAnalyticsScreen } from '@/components/coach/analytics-screen';
import { UserFindCoachScreen } from '@/components/user/find-coach-screen';
import { ParentDevelopmentScreen } from '@/components/parent/development-screen';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
          <View style={styles.content}>
            <ThemedText type="title">More</ThemedText>
            <ThemedText style={{ color: palette.muted }}>Additional features</ThemedText>
          </View>
        </SafeAreaView>
      );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 20,
  },
});
