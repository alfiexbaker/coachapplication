import { useAuth } from '@/hooks/use-auth';
import { CoachDevelopmentScreen } from '@/components/coach/development-screen';
import { UserHomeScreen } from '@/components/user/home-screen';
import { ParentDiscoverScreen } from '@/components/parent/discover-screen';
import { AdminUsersScreen } from '@/components/admin/users-screen';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing} from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function IndexScreen() {
  const { currentUser } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Route to appropriate screen based on role
  switch (currentUser?.role) {
    case 'COACH':
      return <CoachDevelopmentScreen />;
    case 'USER':
      return <UserHomeScreen />;
    case 'PARENT':
      return <ParentDiscoverScreen />;
    case 'ADMIN':
      return <AdminUsersScreen />;
    default:
      return (
        <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
          <View style={styles.content}>
            <ThemedText type="title">Welcome</ThemedText>
            <ThemedText style={{ color: palette.muted }}>Please log in to continue</ThemedText>
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
    gap: Spacing.xs + Spacing.xxs,
    padding: 20,
  },
});
