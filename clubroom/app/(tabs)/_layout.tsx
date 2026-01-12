import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth, type UserRole } from '@/hooks/use-auth';
import { chatThreads } from '@/constants/mock-data';
import { useNotificationCount } from '@/hooks/use-notifications';

// ============================================================================
// HELPER FUNCTIONS FOR SIMPLIFIED USER TYPE SYSTEM
// ============================================================================
// These helpers allow checking capabilities based on user.children, user.skillLevel,
// user.isOrganization, etc. instead of relying solely on role

type UserWithSimplifiedFields = {
  role?: UserRole | 'ADMIN';
  type?: 'USER' | 'COACH';
  children?: Array<{ childId: string; childName: string }>;
  skillLevel?: string;
  isOrganization?: boolean;
  isLive?: boolean;
  isSystemAdmin?: boolean;
};

// Check if user has children (is a parent)
export const hasChildren = (user: UserWithSimplifiedFields | null): boolean => {
  return Boolean(user?.children && user.children.length > 0);
};

// Check if user is an athlete (has skillLevel)
export const isAthlete = (user: UserWithSimplifiedFields | null): boolean => {
  return Boolean(user?.skillLevel);
};

// Check if user is a coach
export const isCoach = (user: UserWithSimplifiedFields | null): boolean => {
  return user?.type === 'COACH' || user?.role === 'COACH';
};

// Check if user is an organization coach
export const isOrganization = (user: UserWithSimplifiedFields | null): boolean => {
  return isCoach(user) && Boolean(user?.isOrganization);
};

// Check if user is a system admin
export const isAdmin = (user: UserWithSimplifiedFields | null): boolean => {
  return Boolean(user?.isSystemAdmin) || user?.role === 'ADMIN';
};

// Check if coach is currently accepting bookings
export const isAcceptingBookings = (user: UserWithSimplifiedFields | null): boolean => {
  return isCoach(user) && user?.isLive !== false;
};

type BadgeType = 'messages' | 'notifications';

type TabDefinition = {
  name: string;
  title: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  badge?: BadgeType;
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
  'wallet',
];

// Uber-style grouped navigation - max 5 tabs with cascading hub screens
// Feed shows aggregated posts from all clubs, club-hub is for managing clubs (accessible from Feed/Profile)
// NOTE: This role-based config is maintained for backwards compatibility.
// Screens should transition to using the helper functions (hasChildren, isAthlete, isCoach, etc.)
// to determine UI based on user capabilities rather than role.
const ROLE_TAB_CONFIG: Record<UserRole | 'DEFAULT', RoleTabConfig> = {
  // COACH: Home, Schedule hub, Athletes hub, Feed, Profile
  // Club management accessible from Feed screen or Profile -> My Clubs
  COACH: {
    primary: [
      { name: 'index', title: 'Home', icon: 'house.fill', badge: 'notifications' },
      { name: 'schedule', title: 'Schedule', icon: 'calendar.badge.clock' },
      { name: 'athletes', title: 'Athletes', icon: 'person.2.fill' },
      { name: 'feed', title: 'Feed', icon: 'newspaper.fill' },
      { name: 'settings', title: 'Profile', icon: 'gearshape.fill' },
    ],
    hidden: [...BASE_HIDDEN_ROUTES, 'more', 'messages', 'children', 'bookings', 'club-hub'],
  },
  // USER (Athlete): Home, Feed, Bookings, Messages, Profile
  // Note: Find Coach accessible from Feed screen (DiscoverCoachesCard) and via /more route
  USER: {
    primary: [
      { name: 'index', title: 'Home', icon: 'house.fill', badge: 'notifications' },
      { name: 'feed', title: 'Feed', icon: 'newspaper.fill' },
      { name: 'bookings', title: 'Bookings', icon: 'calendar.badge.clock' },
      { name: 'messages', title: 'Messages', icon: 'bubble.left.and.bubble.right.fill', badge: 'messages' },
      { name: 'settings', title: 'Profile', icon: 'gearshape.fill' },
    ],
    hidden: [...BASE_HIDDEN_ROUTES, 'club-hub', 'more', 'schedule', 'athletes', 'children'],
  },
  // PARENT: Home, Book, Children hub, Feed, Profile
  // Bookings accessible via Children hub
  PARENT: {
    primary: [
      { name: 'index', title: 'Home', icon: 'house.fill', badge: 'notifications' },
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
      { name: 'index', title: 'Users', icon: 'person.2.fill', badge: 'notifications' },
      { name: 'bookings', title: 'Bookings', icon: 'calendar.badge.clock' },
      { name: 'feed', title: 'Feed', icon: 'newspaper.fill' },
      { name: 'messages', title: 'Messages', icon: 'bubble.left.and.bubble.right.fill', badge: 'messages' },
      { name: 'settings', title: 'Settings', icon: 'gearshape.fill' },
    ],
    hidden: [...BASE_HIDDEN_ROUTES, 'more', 'club-hub', 'schedule', 'athletes', 'children'],
  },
  // DEFAULT: Home, Bookings, Feed, Messages, Settings
  DEFAULT: {
    primary: [
      { name: 'index', title: 'Home', icon: 'house.fill', badge: 'notifications' },
      { name: 'bookings', title: 'Bookings', icon: 'calendar.badge.clock' },
      { name: 'feed', title: 'Feed', icon: 'newspaper.fill' },
      { name: 'messages', title: 'Messages', icon: 'bubble.left.and.bubble.right.fill', badge: 'messages' },
      { name: 'settings', title: 'Settings', icon: 'gearshape.fill' },
    ],
    hidden: [...BASE_HIDDEN_ROUTES, 'more', 'club-hub', 'schedule', 'athletes', 'children'],
  },
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const { currentUser } = useAuth();
  const notificationCount = useNotificationCount();

  const userRole = currentUser?.role ?? 'DEFAULT';
  const messageCount = chatThreads.reduce((total, thread) => total + (thread.unreadCount || 0), 0);
  const roleConfig = ROLE_TAB_CONFIG[userRole] ?? ROLE_TAB_CONFIG.DEFAULT;
  const hiddenRoutes = roleConfig.hidden ?? [];

  // Helper to get badge count based on badge type
  const getBadgeCount = (badgeType?: BadgeType): number | undefined => {
    if (!badgeType) return undefined;
    if (badgeType === 'messages') return messageCount > 0 ? messageCount : undefined;
    if (badgeType === 'notifications') return notificationCount > 0 ? notificationCount : undefined;
    return undefined;
  };

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
            tabBarBadge: getBadgeCount(badge),
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
