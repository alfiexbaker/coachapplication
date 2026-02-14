import { Tabs } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ErrorBoundary } from '@/components/error-boundary';
import { Typography, Spacing, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth, type UserRole } from '@/hooks/use-auth';
import { useNotificationCount } from '@/hooks/use-notifications';
import { messagingService } from '@/services/messaging-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';

type UserWithSimplifiedFields = {
  role?: UserRole | 'ADMIN';
  type?: 'USER' | 'COACH';
  children?: { childId: string; childName: string }[];
  skillLevel?: string;
  isOrganization?: boolean;
  isLive?: boolean;
  isSystemAdmin?: boolean;
};

export const hasChildren = (user: UserWithSimplifiedFields | null): boolean => {
  return Boolean(user?.children && user.children.length > 0);
};

export const isAthlete = (user: UserWithSimplifiedFields | null): boolean => {
  return Boolean(user?.skillLevel);
};

export const isCoach = (user: UserWithSimplifiedFields | null): boolean => {
  return user?.type === 'COACH' || user?.role === 'COACH';
};

export const isOrganization = (user: UserWithSimplifiedFields | null): boolean => {
  return isCoach(user) && Boolean(user?.isOrganization);
};

export const isAdmin = (user: UserWithSimplifiedFields | null): boolean => {
  return Boolean(user?.isSystemAdmin) || user?.role === 'ADMIN';
};

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

const BASE_HIDDEN_ROUTES = [
  'notifications',
  'availability',
  'coach-profile',
  'edit-profile',
  'profile',
  'admin/invite-codes',
  'earnings',
  'badges',
  'roster',
  'wallet',
];

const ROLE_TAB_CONFIG: Record<UserRole | 'DEFAULT', RoleTabConfig> = {
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
  USER: {
    primary: [
      { name: 'index', title: 'Home', icon: 'house.fill', badge: 'notifications' },
      { name: 'feed', title: 'Feed', icon: 'newspaper.fill' },
      { name: 'bookings', title: 'Sessions', icon: 'calendar.badge.clock' },
      {
        name: 'messages',
        title: 'Messages',
        icon: 'bubble.left.and.bubble.right.fill',
        badge: 'messages',
      },
      { name: 'settings', title: 'Profile', icon: 'gearshape.fill' },
    ],
    hidden: [...BASE_HIDDEN_ROUTES, 'club-hub', 'more', 'schedule', 'athletes', 'children'],
  },
  PARENT: {
    primary: [
      { name: 'index', title: 'Home', icon: 'house.fill', badge: 'notifications' },
      { name: 'feed', title: 'Feed', icon: 'newspaper.fill' },
      { name: 'bookings', title: 'Sessions', icon: 'calendar.badge.clock' },
      {
        name: 'messages',
        title: 'Messages',
        icon: 'bubble.left.and.bubble.right.fill',
        badge: 'messages',
      },
      { name: 'settings', title: 'Profile', icon: 'gearshape.fill' },
    ],
    hidden: [...BASE_HIDDEN_ROUTES, 'club-hub', 'more', 'schedule', 'athletes', 'children'],
  },
  ADMIN: {
    primary: [
      { name: 'index', title: 'Users', icon: 'person.2.fill', badge: 'notifications' },
      { name: 'bookings', title: 'Bookings', icon: 'calendar.badge.clock' },
      { name: 'feed', title: 'Feed', icon: 'newspaper.fill' },
      {
        name: 'messages',
        title: 'Messages',
        icon: 'bubble.left.and.bubble.right.fill',
        badge: 'messages',
      },
      { name: 'settings', title: 'Settings', icon: 'gearshape.fill' },
    ],
    hidden: [...BASE_HIDDEN_ROUTES, 'more', 'club-hub', 'schedule', 'athletes', 'children'],
  },
  DEFAULT: {
    primary: [
      { name: 'index', title: 'Home', icon: 'house.fill', badge: 'notifications' },
      { name: 'bookings', title: 'Bookings', icon: 'calendar.badge.clock' },
      { name: 'feed', title: 'Feed', icon: 'newspaper.fill' },
      {
        name: 'messages',
        title: 'Messages',
        icon: 'bubble.left.and.bubble.right.fill',
        badge: 'messages',
      },
      { name: 'settings', title: 'Settings', icon: 'gearshape.fill' },
    ],
    hidden: [...BASE_HIDDEN_ROUTES, 'more', 'club-hub', 'schedule', 'athletes', 'children'],
  },
};

export default function TabLayout() {
  const { colors: palette, scheme } = useTheme();
  const { currentUser } = useAuth();
  const notificationCount = useNotificationCount();
  const [messageCount, setMessageCount] = useState(0);

  const loadMessageCount = useCallback(async () => {
    const threadResult = await messagingService.listThreads();
    if (!threadResult.success) {
      setMessageCount(0);
      return;
    }

    const count = threadResult.data.reduce((total, thread) => total + (thread.unreadCount ?? 0), 0);
    setMessageCount(count);
  }, []);

  useEffect(() => {
    void loadMessageCount();

    const unsubscribeMessageSent = onTyped(ServiceEvents.MESSAGE_SENT, () => {
      void loadMessageCount();
    });
    const unsubscribeMessageEdited = onTyped(ServiceEvents.MESSAGE_EDITED, () => {
      void loadMessageCount();
    });
    const unsubscribeMessageDeleted = onTyped(ServiceEvents.MESSAGE_DELETED, () => {
      void loadMessageCount();
    });

    return () => {
      unsubscribeMessageSent();
      unsubscribeMessageEdited();
      unsubscribeMessageDeleted();
    };
  }, [loadMessageCount]);

  const userRole = currentUser?.role ?? 'DEFAULT';
  const roleConfig = ROLE_TAB_CONFIG[userRole] ?? ROLE_TAB_CONFIG.DEFAULT;
  const hiddenRoutes = roleConfig.hidden ?? [];

  const getBadgeCount = (badgeType?: BadgeType): number | string | undefined => {
    if (!badgeType) return undefined;
    const count = badgeType === 'messages' ? messageCount : notificationCount;
    if (count <= 0) return undefined;
    return count > 99 ? '99+' : count;
  };

  const tabBarOptions = {
    tabBarActiveTintColor: palette.tint,
    tabBarInactiveTintColor: palette.tabIconDefault,
    headerShown: false,
    // @ts-expect-error — Expo Router BottomTabBarButtonProps ref type mismatch with forwardRef
    tabBarButton: (props: BottomTabBarButtonProps) => <HapticTab {...props} />,
    tabBarStyle: {
      backgroundColor: palette.surface, // Use surface for cleaner white
      borderTopWidth: 0, // Remove border for sleeker look
      height: 60, // Reduced from 72px for modern feel
      paddingBottom: 8, // Reduced padding
      paddingTop: 8,
      paddingHorizontal: 16, // More horizontal breathing room
      ...Shadows[scheme].card,
    },
    tabBarLabelStyle: {
      ...Typography.micro,
      textTransform: 'none' as const,
      fontWeight: '600' as const,
      lineHeight: 12,
      letterSpacing: 0.3,
      marginTop: Spacing.micro,
    },
    tabBarIconStyle: {
      marginTop: 0,
    },
    tabBarBadgeStyle: {
      backgroundColor: palette.error,
      color: palette.onError,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      fontSize: 10,
      fontWeight: '700' as const,
      lineHeight: 12,
      borderWidth: 1,
      borderColor: palette.surface,
      top: -2,
    },
  };

  return (
    <ErrorBoundary>
      <Tabs screenOptions={tabBarOptions}>
        {roleConfig.primary.map(({ name, title, icon, badge }) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title,
              tabBarIcon: ({ color }) => <IconSymbol size={22} name={icon} color={color} />,
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
    </ErrorBoundary>
  );
}
