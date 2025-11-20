import { useAuth } from '@/hooks/use-auth';
import { CoachAnalyticsScreen } from '@/components/coach/analytics-screen';
import { UserFindCoachScreen } from '@/components/user/find-coach-screen';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Note: PARENT role doesn't use the "more" tab, so we don't need a specific screen for them
// ADMIN also doesn't use it in current nav structure

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
