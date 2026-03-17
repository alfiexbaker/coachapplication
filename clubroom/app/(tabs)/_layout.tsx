import { Tabs, router, useNavigation, useSegments } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ErrorBoundary } from '@/components/error-boundary';
import { RouteAccessGate } from '@/components/auth/route-access-gate';
import { Typography, Spacing, Shadows, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth, type UserRole } from '@/hooks/use-auth';
import { useNotificationCount } from '@/hooks/use-notifications';
import { messagingService } from '@/services/messaging-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { useToast } from '@/components/ui/toast';
import { Routes } from '@/navigation/routes';
import { useFocusEffect, type EventArg } from '@react-navigation/native';
import { createLogger } from '@/utils/logger';
import { getRestrictedTabRoutes } from '@/constants/route-access';
import { isParentLikeUser } from '@/utils/user-helpers';

const logger = createLogger('TabLayout');

type UserWithSimplifiedFields = {
  role?: UserRole | 'ADMIN';
  type?: 'USER' | 'COACH';
  children?: { childId: string; childName: string }[];
  hasChildren?: boolean;
  skillLevel?: string;
  isOrganization?: boolean;
  isLive?: boolean;
  isSystemAdmin?: boolean;
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
  const { showToast } = useToast();
  const segments = useSegments();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const notificationCount = useNotificationCount();
  const [messageCount, setMessageCount] = useState(0);
  const lastRestrictedRouteRef = useRef<string | null>(null);
  const messageCountRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadMessageCount = useCallback(async () => {
    const unreadResult = await messagingService.getUnreadCount();
    if (!unreadResult.success) {
      setMessageCount(0);
      return;
    }
    setMessageCount(unreadResult.data);
  }, []);

  const scheduleMessageCountRefresh = useCallback(() => {
    if (messageCountRefreshTimerRef.current) {
      clearTimeout(messageCountRefreshTimerRef.current);
    }
    messageCountRefreshTimerRef.current = setTimeout(() => {
      void loadMessageCount();
      messageCountRefreshTimerRef.current = null;
    }, 150);
  }, [loadMessageCount]);

  useEffect(() => {
    void loadMessageCount();

    const unsubscribeMessageSent = onTyped(ServiceEvents.MESSAGE_SENT, scheduleMessageCountRefresh);
    const unsubscribeMessageEdited = onTyped(ServiceEvents.MESSAGE_EDITED, scheduleMessageCountRefresh);
    const unsubscribeMessageDeleted = onTyped(
      ServiceEvents.MESSAGE_DELETED,
      scheduleMessageCountRefresh,
    );
    const unsubscribeMessagesMarkedRead = onTyped(
      ServiceEvents.MESSAGES_MARKED_READ,
      scheduleMessageCountRefresh,
    );
    const unsubscribeThreadOpened = onTyped(ServiceEvents.THREAD_OPENED, scheduleMessageCountRefresh);

    return () => {
      if (messageCountRefreshTimerRef.current) {
        clearTimeout(messageCountRefreshTimerRef.current);
      }
      unsubscribeMessageSent();
      unsubscribeMessageEdited();
      unsubscribeMessageDeleted();
      unsubscribeMessagesMarkedRead();
      unsubscribeThreadOpened();
    };
  }, [loadMessageCount, scheduleMessageCountRefresh]);

  const userRole = currentUser?.role ?? 'DEFAULT';
  const parentLikeUser = isParentLikeUser(currentUser);
  const baseRoleConfig = ROLE_TAB_CONFIG[userRole] ?? ROLE_TAB_CONFIG.DEFAULT;
  const roleConfig = useMemo(() => {
    if (!parentLikeUser || (userRole !== 'USER' && userRole !== 'PARENT')) {
      return baseRoleConfig;
    }

    return {
      ...baseRoleConfig,
      primary: baseRoleConfig.primary.map((tab) =>
        tab.name === 'index'
          ? {
              ...tab,
              title: 'Family',
              icon: 'person.2.fill' as React.ComponentProps<typeof IconSymbol>['name'],
            }
          : tab,
      ),
    };
  }, [baseRoleConfig, parentLikeUser, userRole]);
  const hiddenRoutes = useMemo(() => roleConfig.hidden ?? [], [roleConfig.hidden]);
  const hiddenRouteSet = useMemo(() => new Set(hiddenRoutes), [hiddenRoutes]);
  const restrictedRouteSet = useMemo(
    () => getRestrictedTabRoutes(userRole, { isParentLike: parentLikeUser }),
    [parentLikeUser, userRole],
  );
  const inTabsRouteScope = segments[0] === '(tabs)';
  const secondarySegment = segments.at(1);
  const currentTabSegment =
    inTabsRouteScope && typeof secondarySegment === 'string' ? secondarySegment : '';
  const blockedTabSegment =
    currentTabSegment && restrictedRouteSet.has(currentTabSegment) ? currentTabSegment : null;

  useEffect(() => {
    logger.debug('Tab guard config', {
      role: currentUser?.role,
      type: currentUser?.type,
      hasChildrenFlag: currentUser?.hasChildren,
      childCount: currentUser?.children?.length ?? 0,
      isParentLike: parentLikeUser,
      hiddenRoutes,
      restrictedRoutes: Array.from(restrictedRouteSet),
    });
  }, [currentUser, hiddenRoutes, parentLikeUser, restrictedRouteSet]);

  const handleRestrictedRoute = useCallback(
    (routeName: string) => {
      if (lastRestrictedRouteRef.current === routeName) {
        logger.debug('Skipping duplicate restricted route toast', { routeName });
        return;
      }

      lastRestrictedRouteRef.current = routeName;
      logger.warn('Restricted tab route blocked', {
        routeName,
        role: currentUser?.role,
        type: currentUser?.type,
        hasChildrenFlag: currentUser?.hasChildren,
        childCount: currentUser?.children?.length ?? 0,
        hiddenRoutes,
        restrictedRoutes: Array.from(restrictedRouteSet),
      });
      router.replace(Routes.HOME_INDEX);
      showToast('Access restricted', 'error');
    },
    [currentUser, hiddenRoutes, restrictedRouteSet, showToast],
  );

  useEffect(() => {
    logger.debug('Segment guard check', {
      segments,
      inTabsRouteScope,
      tabSegment: currentTabSegment,
      isHidden: currentTabSegment ? hiddenRouteSet.has(currentTabSegment) : false,
      isRestricted: currentTabSegment ? restrictedRouteSet.has(currentTabSegment) : false,
    });
    if (!currentTabSegment) return;
    if (!restrictedRouteSet.has(currentTabSegment)) {
      lastRestrictedRouteRef.current = null;
      return;
    }

    handleRestrictedRoute(currentTabSegment);
  }, [
    currentTabSegment,
    handleRestrictedRoute,
    hiddenRouteSet,
    inTabsRouteScope,
    restrictedRouteSet,
    segments,
  ]);

  useFocusEffect(
    useCallback(() => {
      const state = navigation.getState();
      const currentRoute = state?.routes?.[state.index ?? 0]?.name;
      logger.debug('Focus guard check', {
        currentRoute,
        isHidden: typeof currentRoute === 'string' ? hiddenRouteSet.has(currentRoute) : false,
        isRestricted:
          typeof currentRoute === 'string' ? restrictedRouteSet.has(currentRoute) : false,
      });
      if (typeof currentRoute !== 'string') return;
      if (!restrictedRouteSet.has(currentRoute)) {
        lastRestrictedRouteRef.current = null;
        return;
      }

      handleRestrictedRoute(currentRoute);
    }, [handleRestrictedRoute, hiddenRouteSet, navigation, restrictedRouteSet]),
  );

  const getBadgeCount = (badgeType?: BadgeType): number | string | undefined => {
    if (!badgeType) return undefined;
    const count = badgeType === 'messages' ? messageCount : notificationCount;
    if (count <= 0) return undefined;
    return count > 99 ? '99+' : count;
  };

  const handleTabReselectPress = useCallback(
    (routeName: string) => (e: EventArg<'tabPress', true>) => {
      const state = navigation.getState();
      const focusedRoute = state?.routes?.[state.index ?? 0];
      const isReselect = focusedRoute?.name === routeName;
      if (!isReselect) return;

      // Avoid React Navigation's default POP_TO_TOP on tab reselect when the tab
      // doesn't host a nested stack (dev warning: "POP_TO_TOP was not handled").
      // Screen hooks still receive tabPress and handle scroll-to-top UX.
      e.preventDefault();
    },
    [navigation],
  );

  const handlePrimaryTabPress = useCallback(
    (routeName: string) => (e: EventArg<'tabPress', true>) => {
      if (routeName === 'settings') {
        // Keep the current tab as the underlying page, and stack Settings on top.
        // This makes one back press return to where the user came from.
        e.preventDefault();
        router.push(Routes.SETTINGS_INDEX);
        return;
      }
      handleTabReselectPress(routeName)(e);
    },
    [handleTabReselectPress],
  );

  const tabBarHeight = 62 + Math.max(insets.bottom, Spacing.sm);
  const tabBarOptions = {
    tabBarActiveTintColor: palette.tint,
    tabBarInactiveTintColor: palette.tabIconDefault,
    headerShown: false,
    // @ts-expect-error — Expo Router BottomTabBarButtonProps ref type mismatch with forwardRef
    tabBarButton: (props: BottomTabBarButtonProps) => <HapticTab {...props} />,
    tabBarStyle: {
      backgroundColor: palette.surface, // Use surface for cleaner white
      borderTopWidth: 0, // Remove border for sleeker look
      height: tabBarHeight,
      paddingBottom: Math.max(insets.bottom, Spacing.xs),
      paddingTop: Spacing.xs,
      paddingHorizontal: Spacing.sm, // More horizontal breathing room
      ...Shadows[scheme].card,
    },
    tabBarLabelStyle: {
      ...Typography.caption,
      textTransform: 'none' as const,
      fontWeight: '600' as const,
      lineHeight: 16,
      letterSpacing: 0.15,
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
      borderRadius: Radii.sm,
      fontSize: Typography.micro.fontSize,
      fontWeight: '700' as const,
      lineHeight: 12,
      borderWidth: 1,
      borderColor: palette.surface,
      top: -2,
    },
  };

  const handleBlockedTabSegment = useCallback(() => {
    if (!blockedTabSegment) return;
    handleRestrictedRoute(blockedTabSegment);
  }, [blockedTabSegment, handleRestrictedRoute]);

  return (
    <ErrorBoundary>
      <RouteAccessGate
        allowed={!blockedTabSegment}
        redirectHref={Routes.HOME_INDEX}
        onBlocked={blockedTabSegment ? handleBlockedTabSegment : undefined}
      >
        <Tabs screenOptions={tabBarOptions}>
          {roleConfig.primary.map(({ name, title, icon, badge }) => (
            <Tabs.Screen
              key={name}
              name={name}
              listeners={{
                tabPress: handlePrimaryTabPress(name),
              }}
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
      </RouteAccessGate>
    </ErrorBoundary>
  );
}
