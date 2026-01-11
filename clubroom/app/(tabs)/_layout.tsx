import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth, type UserRole } from '@/hooks/use-auth';
import { chatThreads } from '@/constants/mock-data';

type TabDefinition = {
  name: string;
  title: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  badge?: boolean;
};

type RoleTabConfig = {
  primary: TabDefinition[];
  hidden?: string[];
};

// Routes that should be hidden from tab bar but still accessible via navigation
const BASE_HIDDEN_ROUTES = [
  'notifications',
  'availability',
  'coach-profile',
  'edit-profile',
  'edit-user-profile',
  'profile',
  'admin/invite-codes',
  'earnings',
  'badges',
  'roster',
];

// Uber-style grouped navigation - max 5 tabs with cascading hub screens
// Feed shows aggregated posts from all clubs, club-hub is for managing clubs (accessible from Feed/Profile)
const ROLE_TAB_CONFIG: Record<UserRole | 'DEFAULT', RoleTabConfig> = {
  // COACH: Home, Schedule hub, Athletes hub, Feed, Profile
  // Club management accessible from Feed screen or Profile -> My Clubs
  COACH: {
    primary: [
      { name: 'index', title: 'Home', icon: 'house.fill' },
      { name: 'schedule', title: 'Schedule', icon: 'calendar.badge.clock' },
      { name: 'athletes', title: 'Athletes', icon: 'person.2.fill' },
      { name: 'feed', title: 'Feed', icon: 'newspaper.fill' },
      { name: 'settings', title: 'Profile', icon: 'gearshape.fill' },
    ],
    hidden: [...BASE_HIDDEN_ROUTES, 'more', 'messages', 'children', 'bookings', 'club-hub'],
  },
  // USER (Athlete): Home, Find Coach, Bookings, Messages, Profile
  USER: {
    primary: [
      { name: 'index', title: 'Home', icon: 'house.fill' },
      { name: 'more', title: 'Find Coach', icon: 'magnifyingglass' },
      { name: 'bookings', title: 'Bookings', icon: 'calendar.badge.clock' },
      { name: 'messages', title: 'Messages', icon: 'bubble.left.and.bubble.right.fill', badge: true },
      { name: 'settings', title: 'Profile', icon: 'gearshape.fill' },
    ],
    hidden: [...BASE_HIDDEN_ROUTES, 'club-hub', 'feed', 'schedule', 'athletes', 'children'],
  },
  // PARENT: Home, Book, Children hub, Feed, Profile
  // Bookings accessible via Children hub
  PARENT: {
    primary: [
      { name: 'index', title: 'Home', icon: 'house.fill' },
      { name: 'more', title: 'Book', icon: 'magnifyingglass' },
      { name: 'children', title: 'Children', icon: 'person.2.fill' },
      { name: 'feed', title: 'Feed', icon: 'newspaper.fill' },
      { name: 'settings', title: 'Profile', icon: 'gearshape.fill' },
    ],
    hidden: [...BASE_HIDDEN_ROUTES, 'club-hub', 'schedule', 'athletes', 'bookings', 'messages'],
  },
  // ADMIN: Users, Bookings, Feed, Messages, Settings
  ADMIN: {
    primary: [
      { name: 'index', title: 'Users', icon: 'person.2.fill' },
      { name: 'bookings', title: 'Bookings', icon: 'calendar.badge.clock' },
      { name: 'feed', title: 'Feed', icon: 'newspaper.fill' },
      { name: 'messages', title: 'Messages', icon: 'bubble.left.and.bubble.right.fill', badge: true },
      { name: 'settings', title: 'Settings', icon: 'gearshape.fill' },
    ],
    hidden: [...BASE_HIDDEN_ROUTES, 'more', 'club-hub', 'schedule', 'athletes', 'children'],
  },
  // DEFAULT: Home, Bookings, Feed, Messages, Settings
  DEFAULT: {
    primary: [
      { name: 'index', title: 'Home', icon: 'house.fill' },
      { name: 'bookings', title: 'Bookings', icon: 'calendar.badge.clock' },
      { name: 'feed', title: 'Feed', icon: 'newspaper.fill' },
      { name: 'messages', title: 'Messages', icon: 'bubble.left.and.bubble.right.fill', badge: true },
      { name: 'settings', title: 'Settings', icon: 'gearshape.fill' },
    ],
    hidden: [...BASE_HIDDEN_ROUTES, 'more', 'club-hub', 'schedule', 'athletes', 'children'],
  },
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const { currentUser } = useAuth();

  const userRole = currentUser?.role ?? 'DEFAULT';
  const unreadCount = chatThreads.reduce((total, thread) => total + (thread.unreadCount || 0), 0);
  const roleConfig = ROLE_TAB_CONFIG[userRole] ?? ROLE_TAB_CONFIG.DEFAULT;
  const hiddenRoutes = roleConfig.hidden ?? [];

  // Debug logging to track role detection and tab rendering
  console.log('[TabLayout] Current user:', currentUser ? { username: currentUser.username, role: currentUser.role } : 'Not logged in');
  console.log('[TabLayout] Rendering tabs for role:', userRole, roleConfig.primary.map((tab) => tab.title));

  // Consolidate bottom navigation to 4-5 role-aware hubs (home, schedule, comms, profile)
  const tabBarOptions = {
    tabBarActiveTintColor: palette.tint,
    tabBarInactiveTintColor: palette.tabIconDefault,
    headerShown: false,
    tabBarButton: (props: any) => <HapticTab {...props} />,
    tabBarStyle: {
      backgroundColor: palette.surface, // Use surface for cleaner white
      borderTopWidth: 0, // Remove border for sleeker look
      height: 60, // Reduced from 72px for modern feel
      paddingBottom: 8, // Reduced padding
      paddingTop: 8,
      paddingHorizontal: 16, // More horizontal breathing room
      shadowColor: '#000000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: -2 },
      elevation: 8, // Subtle shadow instead of border
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '600' as const,
      letterSpacing: 0.3,
      marginTop: 2,
    },
    tabBarIconStyle: {
      marginTop: 0,
    },
  };

  return (
    <Tabs screenOptions={tabBarOptions}>
      {roleConfig.primary.map(({ name, title, icon, badge }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color }) => <IconSymbol size={24} name={icon} color={color} />,
            tabBarBadge: badge && unreadCount > 0 ? unreadCount : undefined,
          }}
        />
      ))}

      {hiddenRoutes.map((route) => (
        <Tabs.Screen
          key={route}
          name={route}
          options={{
            href: null,
          }}
        />
      ))}
    </Tabs>
  );
}
