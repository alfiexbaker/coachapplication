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

type HiddenRoute =
  | string
  | {
      name: string;
      options?: React.ComponentProps<typeof Tabs.Screen>['options'];
    };

type RoleTabConfig = {
  primary: TabDefinition[];
  hidden?: HiddenRoute[];
};

const BASE_HIDDEN_ROUTES: HiddenRoute[] = [
  'feed',
  'notifications',
  'availability',
  'coach-profile',
  'edit-profile',
  'edit-user-profile',
  'profile',
  'admin/invite-codes',
  'earnings',
  'badges',
];

const ROLE_TAB_CONFIG: Record<UserRole | 'DEFAULT', RoleTabConfig> = {
  COACH: {
    primary: [
      { name: 'index', title: 'Calendar', icon: 'calendar' },
      { name: 'bookings', title: 'Bookings', icon: 'calendar.badge.clock' },
      { name: 'school', title: 'School', icon: 'building.columns.fill' },
      { name: 'messages', title: 'Messages', icon: 'bubble.left.and.bubble.right.fill', badge: true },
      { name: 'settings', title: 'Profile', icon: 'gearshape.fill' },
    ],
    hidden: [...BASE_HIDDEN_ROUTES, 'more', 'club-hub'],
  },
  USER: {
    primary: [
      { name: 'index', title: 'Home', icon: 'house.fill' },
      { name: 'bookings', title: 'Bookings', icon: 'calendar.badge.clock' },
      { name: 'messages', title: 'Messages', icon: 'bubble.left.and.bubble.right.fill', badge: true },
      { name: 'club-hub', title: 'Club', icon: 'person.3.sequence.fill' },
      { name: 'settings', title: 'Profile', icon: 'gearshape.fill' },
    ],
    hidden: [
      ...BASE_HIDDEN_ROUTES,
      {
        name: 'more',
        options: {
          tabBarButton: () => null,
          href: undefined,
        },
      },
    ],
  },
  PARENT: {
    primary: [
      { name: 'index', title: 'Home', icon: 'house.fill' },
      { name: 'bookings', title: 'Bookings', icon: 'calendar.badge.clock' },
      { name: 'messages', title: 'Messages', icon: 'bubble.left.and.bubble.right.fill', badge: true },
      { name: 'club-hub', title: 'Club', icon: 'person.3.sequence.fill' },
      { name: 'settings', title: 'Profile', icon: 'gearshape.fill' },
    ],
    hidden: [...BASE_HIDDEN_ROUTES, 'more'],
  },
  ADMIN: {
    primary: [
      { name: 'index', title: 'Users', icon: 'person.2.fill' },
      { name: 'bookings', title: 'Bookings', icon: 'calendar.badge.clock' },
      { name: 'messages', title: 'Messages', icon: 'bubble.left.and.bubble.right.fill', badge: true },
      { name: 'settings', title: 'Settings', icon: 'gearshape.fill' },
    ],
    hidden: [...BASE_HIDDEN_ROUTES, 'more', 'club-hub'],
  },
  DEFAULT: {
    primary: [
      { name: 'index', title: 'Home', icon: 'house.fill' },
      { name: 'bookings', title: 'Bookings', icon: 'calendar.badge.clock' },
      { name: 'messages', title: 'Messages', icon: 'bubble.left.and.bubble.right.fill', badge: true },
      { name: 'settings', title: 'Settings', icon: 'gearshape.fill' },
    ],
    hidden: [...BASE_HIDDEN_ROUTES, 'more'],
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

      {hiddenRoutes.map((route) => {
        const hiddenRoute = typeof route === 'string' ? { name: route } : route;
        const routeOptions = hiddenRoute.options ?? {};
        const { tabBarButton, href: _href, ...restOptions } = routeOptions;

        // Avoid combining href with tabBarButton, which Expo Router disallows.
        // Default hidden tabs rely solely on a null-returning tabBarButton to stay off the bar.
        const options =
          tabBarButton !== undefined
            ? { tabBarButton, ...restOptions }
            : { tabBarButton: () => null, ...restOptions };

        return <Tabs.Screen key={hiddenRoute.name} name={hiddenRoute.name} options={options} />;
      })}
    </Tabs>
  );
}
