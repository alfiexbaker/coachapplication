import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';

type MenuItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  showChevron?: boolean;
};

export default function MoreScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser, logout } = useAuth();

  const menuItems: MenuItem[] = [
    {
      id: 'profile',
      icon: 'person-circle-outline',
      label: 'My Profile',
      onPress: () => router.push('/(tabs)/profile'),
      showChevron: true,
    },
    {
      id: 'objectives',
      icon: 'football-outline',
      label: 'My Objectives',
      onPress: () => router.push('/bookings/objectives'),
      showChevron: true,
    },
    {
      id: 'statistics',
      icon: 'stats-chart-outline',
      label: 'Progress & Stats',
      onPress: () => router.push('/bookings/statistics'),
      showChevron: true,
    },
    {
      id: 'settings',
      icon: 'settings-outline',
      label: 'Settings',
      onPress: () => {
        // TODO: Create settings screen
        alert('Settings - coming soon!');
      },
      showChevron: true,
    },
    {
      id: 'help',
      icon: 'help-circle-outline',
      label: 'Help & Support',
      onPress: () => {
        // TODO: Create help screen
        alert('Help & Support - coming soon!');
      },
      showChevron: true,
    },
    {
      id: 'logout',
      icon: 'log-out-outline',
      label: 'Log Out',
      onPress: () => logout(),
      showChevron: false,
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">More</ThemedText>
      </ThemedView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* User Info Card */}
        <SurfaceCard style={styles.userCard}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: palette.tint }]}>
              <ThemedText style={styles.avatarText} lightColor="#FFFFFF" darkColor="#000000">
                {currentUser?.fullName?.[0] || currentUser?.username?.[0] || 'U'}
              </ThemedText>
            </View>
            <View style={styles.userDetails}>
              <ThemedText type="subtitle">{currentUser?.fullName || currentUser?.username}</ThemedText>
              <ThemedText style={styles.roleText}>{currentUser?.role || 'User'}</ThemedText>
            </View>
          </View>
        </SurfaceCard>

        {/* Menu Items */}
        <SurfaceCard style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <View key={item.id}>
              <Pressable
                onPress={item.onPress}
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && { backgroundColor: palette.border, opacity: 0.7 },
                ]}>
                <View style={styles.menuItemLeft}>
                  <Ionicons name={item.icon} size={24} color={palette.foreground} />
                  <ThemedText style={styles.menuLabel}>{item.label}</ThemedText>
                </View>
                {item.showChevron && (
                  <Ionicons name="chevron-forward" size={20} color={palette.muted} />
                )}
              </Pressable>
              {index < menuItems.length - 1 && (
                <View style={[styles.divider, { backgroundColor: palette.border }]} />
              )}
            </View>
          ))}
        </SurfaceCard>

        {/* App Version */}
        <ThemedText style={styles.version}>Version 1.0.0</ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  userCard: {
    padding: Spacing.lg,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
  },
  userDetails: {
    gap: 4,
  },
  roleText: {
    fontSize: 14,
    opacity: 0.6,
  },
  menuCard: {
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 56,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginLeft: Spacing.lg + 24 + Spacing.md, // Align with text
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    opacity: 0.4,
    marginTop: Spacing.md,
  },
});
