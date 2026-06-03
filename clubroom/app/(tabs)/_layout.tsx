import { Tabs, router, useNavigation, useSegments } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState, startTransition } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ErrorBoundary } from '@/components/error-boundary';
import { RouteAccessGate } from '@/components/auth/route-access-gate';
import { Typography, Spacing, Shadows, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth, type UserRole } from '@/hooks/use-auth';
import { useNotificationBadgeState } from '@/hooks/use-notifications';
import { messagingService } from '@/services/messaging-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { useToast } from '@/components/ui/toast';
import { Routes } from '@/navigation/routes';
import { useFocusEffect, type EventArg } from '@react-navigation/native';
import { createLogger } from '@/utils/logger';
import { getRestrictedTabRoutes } from '@/constants/route-access';
import {
  isAcceptingBookings,
  isAdmin,
  isAthlete,
  isCoach,
  isOrganization,
  isParentLikeUser,
} from '@/utils/user-helpers';

const logger = createLogger('TabLayout');

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
  'roster',
];

const ROLE_TAB_CONFIG: Record<UserRole | 'DEFAULT', RoleTabConfig> = {
  COACH: {
    primary: [
      { name: 'index', title: 'Home', icon: 'house.fill', badge: 'notifications' },
      { name: 'schedule', title: 'Schedule', icon: 'calendar.badge.clock' },
      { name: 'athletes', title: 'Athletes', icon: 'person.2.fill' },
      {
        name: 'messages',
        title: 'Messages',
        icon: 'bubble.left.and.bubble.right.fill',
        badge: 'messages',
      },
      { name: 'settings', title: 'Profile', icon: 'gearshape.fill' },
    ],
    hidden: [...BASE_HIDDEN_ROUTES, 'more', 'feed', 'children', 'bookings', 'club-hub'],
  },
  USER: {
    primary: [
      { name: 'index', title: 'Home', icon: 'house.fill', badge: 'notifications' },
      { name: 'feed', title: 'Updates', icon: 'newspaper.fill' },
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
      { name: 'feed', title: 'Updates', icon: 'newspaper.fill' },
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
      {
        name: 'messages',
        title: 'Messages',
        icon: 'bubble.left.and.bubble.right.fill',
        badge: 'messages',
      },
      { name: 'settings', title: 'Settings', icon: 'gearshape.fill' },
    ],
    hidden: [...BASE_HIDDEN_ROUTES, 'more', 'club-hub', 'schedule', 'athletes', 'children', 'feed'],
  },
  DEFAULT: {
    primary: [
      { name: 'index', title: 'Home', icon: 'house.fill', badge: 'notifications' },
      { name: 'bookings', title: 'Bookings', icon: 'calendar.badge.clock' },
      {
        name: 'messages',
        title: 'Messages',
        icon: 'bubble.left.and.bubble.right.fill',
        badge: 'messages',
      },
      { name: 'settings', title: 'Settings', icon: 'gearshape.fill' },
    ],
    hidden: [...BASE_HIDDEN_ROUTES, 'more', 'club-hub', 'schedule', 'athletes', 'children', 'feed'],
  },
};

function resolveRoleTabConfig(
  userRole: UserRole | 'DEFAULT',
  parentLikeUser: boolean,
): RoleTabConfig {
  const baseRoleConfig = ROLE_TAB_CONFIG[userRole] ?? ROLE_TAB_CONFIG.DEFAULT;
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
}

export default function TabLayout() {
  const { colors: palette, scheme } = useTheme();
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const segments = useSegments();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const notificationBadge = useNotificationBadgeState();
  const [messageCount, setMessageCount] = useState(0);
  const lastRestrictedRouteRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    let messageCountRefreshTimer: ReturnType<typeof setTimeout> | null = null;

    const loadMessageCount = async () => {
      const unreadResult = await messagingService.getUnreadCount();
      if (!active) return;
      if (!unreadResult.success) {
        setMessageCount(0);
        return;
      }
      setMessageCount(unreadResult.data);
    };

    const scheduleMessageCountRefresh = () => {
      if (messageCountRefreshTimer) {
        clearTimeout(messageCountRefreshTimer);
      }
      messageCountRefreshTimer = setTimeout(() => {
        void loadMessageCount();
        messageCountRefreshTimer = null;
      }, 150);
    };

    startTransition(() => {
      void loadMessageCount();
    });

    const unsubscribeMessageSent = onTyped(ServiceEvents.MESSAGE_SENT, scheduleMessageCountRefresh);
    const unsubscribeMessageEdited = onTyped(
      ServiceEvents.MESSAGE_EDITED,
      scheduleMessageCountRefresh,
    );
    const unsubscribeMessageDeleted = onTyped(
      ServiceEvents.MESSAGE_DELETED,
      scheduleMessageCountRefresh,
    );
    const unsubscribeMessagesMarkedRead = onTyped(
      ServiceEvents.MESSAGES_MARKED_READ,
      scheduleMessageCountRefresh,
    );
    const unsubscribeThreadOpened = onTyped(
      ServiceEvents.THREAD_OPENED,
      scheduleMessageCountRefresh,
    );

    return () => {
      active = false;
      if (messageCountRefreshTimer) {
        clearTimeout(messageCountRefreshTimer);
        messageCountRefreshTimer = null;
      }
      unsubscribeMessageSent();
      unsubscribeMessageEdited();
      unsubscribeMessageDeleted();
      unsubscribeMessagesMarkedRead();
      unsubscribeThreadOpened();
    };
  }, []);

  const userRole = currentUser?.role ?? 'DEFAULT';
  const parentLikeUser = isParentLikeUser(currentUser);
  const roleConfig = resolveRoleTabConfig(userRole, parentLikeUser);
  const hiddenRoutes = roleConfig.hidden ?? [];
  const hiddenRouteSet = new Set(hiddenRoutes);
  const restrictedRouteSet = getRestrictedTabRoutes(userRole, { isParentLike: parentLikeUser });
  const inTabsRouteScope = segments[0] === '(tabs)';
  const secondarySegment = segments.at(1);
  const currentTabSegment =
    inTabsRouteScope && typeof secondarySegment === 'string' ? secondarySegment : '';
  const blockedTabSegment =
    currentTabSegment && restrictedRouteSet.has(currentTabSegment) ? currentTabSegment : null;

  useEffect(() => {
    const currentHiddenRoutes = resolveRoleTabConfig(userRole, parentLikeUser).hidden ?? [];
    const currentRestrictedRouteSet = getRestrictedTabRoutes(userRole, {
      isParentLike: parentLikeUser,
    });

    logger.debug('Segment guard check', {
      segments,
      inTabsRouteScope,
      tabSegment: currentTabSegment,
      isHidden: currentTabSegment ? currentHiddenRoutes.includes(currentTabSegment) : false,
      isRestricted: currentTabSegment ? currentRestrictedRouteSet.has(currentTabSegment) : false,
    });
    if (!currentTabSegment) return;
    if (!currentRestrictedRouteSet.has(currentTabSegment)) {
      lastRestrictedRouteRef.current = null;
      return;
    }

    if (lastRestrictedRouteRef.current === currentTabSegment) {
      logger.debug('Skipping duplicate restricted route toast', { routeName: currentTabSegment });
      return;
    }

    lastRestrictedRouteRef.current = currentTabSegment;
    logger.warn('Restricted tab route blocked', {
      routeName: currentTabSegment,
      role: currentUser?.role,
      type: currentUser?.type,
      hasChildrenFlag: currentUser?.hasChildren,
      childCount: currentUser?.children?.length ?? 0,
      hiddenRoutes: currentHiddenRoutes,
      restrictedRoutes: Array.from(currentRestrictedRouteSet),
    });
    router.replace(Routes.HOME_INDEX);
    showToast('Access restricted', 'error');
  }, [
    currentUser?.children?.length,
    currentUser?.hasChildren,
    currentUser?.role,
    currentUser?.type,
    currentTabSegment,
    inTabsRouteScope,
    parentLikeUser,
    segments,
    showToast,
    userRole,
  ]);

  useFocusEffect(
    useCallback(() => {
      const currentHiddenRoutes = resolveRoleTabConfig(userRole, parentLikeUser).hidden ?? [];
      const currentRestrictedRouteSet = getRestrictedTabRoutes(userRole, {
        isParentLike: parentLikeUser,
      });
      const state = navigation.getState();
      const currentRoute = state?.routes?.[state.index ?? 0]?.name;
      logger.debug('Focus guard check', {
        currentRoute,
        isHidden:
          typeof currentRoute === 'string' ? currentHiddenRoutes.includes(currentRoute) : false,
        isRestricted:
          typeof currentRoute === 'string' ? currentRestrictedRouteSet.has(currentRoute) : false,
      });
      if (typeof currentRoute !== 'string') return;
      if (!currentRestrictedRouteSet.has(currentRoute)) {
        lastRestrictedRouteRef.current = null;
        return;
      }

      if (lastRestrictedRouteRef.current === currentRoute) {
        logger.debug('Skipping duplicate restricted route toast', { routeName: currentRoute });
        return;
      }

      lastRestrictedRouteRef.current = currentRoute;
      logger.warn('Restricted tab route blocked', {
        routeName: currentRoute,
        role: currentUser?.role,
        type: currentUser?.type,
        hasChildrenFlag: currentUser?.hasChildren,
        childCount: currentUser?.children?.length ?? 0,
        hiddenRoutes: currentHiddenRoutes,
        restrictedRoutes: Array.from(currentRestrictedRouteSet),
      });
      router.replace(Routes.HOME_INDEX);
      showToast('Access restricted', 'error');
    }, [
      currentUser?.children?.length,
      currentUser?.hasChildren,
      currentUser?.role,
      currentUser?.type,
      navigation,
      parentLikeUser,
      showToast,
      userRole,
    ]),
  );

  const getBadgeCount = (badgeType?: BadgeType): number | string | undefined => {
    if (!badgeType) return undefined;
    if (badgeType === 'messages') {
      if (messageCount <= 0) return undefined;
      return messageCount > 99 ? '99+' : messageCount;
    }

    if (notificationBadge.variant !== 'count') {
      return undefined;
    }

    return notificationBadge.label;
  };

  const handleTabReselectPress = (routeName: string) => (e: EventArg<'tabPress', true>) => {
    const state = navigation.getState();
    const focusedRoute = state?.routes?.[state.index ?? 0];
    const isReselect = focusedRoute?.name === routeName;
    if (!isReselect) return;

    // Avoid React Navigation's default POP_TO_TOP on tab reselect when the tab
    // doesn't host a nested stack (dev warning: "POP_TO_TOP was not handled").
    // Screen hooks still receive tabPress and handle scroll-to-top UX.
    e.preventDefault();
  };

  const handlePrimaryTabPress = (routeName: string) => (e: EventArg<'tabPress', true>) => {
    if (routeName === 'settings') {
      // Keep the current tab as the underlying page, and stack Settings on top.
      // This makes one back press return to where the user came from.
      e.preventDefault();
      router.push(Routes.SETTINGS_INDEX);
      return;
    }
    handleTabReselectPress(routeName)(e);
  };

  const tabBarHeight = 62 + Math.max(insets.bottom, Spacing.sm);
  const tabBarOptions = {
    tabBarActiveTintColor: palette.tint,
    tabBarInactiveTintColor: palette.tabIconDefault,
    headerShown: false,
    tabBarButton: (props: any) => <HapticTab {...props} />,
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

  return (
    <ErrorBoundary>
      <RouteAccessGate allowed={!blockedTabSegment} redirectHref={Routes.HOME_INDEX}>
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
