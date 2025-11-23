import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { chatThreads } from '@/constants/mock-data';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const { currentUser } = useAuth();

  const userRole = currentUser?.role;
  const unreadCount = chatThreads.reduce((total, thread) => total + (thread.unreadCount || 0), 0);

  // Debug logging to track role detection and tab rendering
  console.log('[TabLayout] Current user:', currentUser ? { username: currentUser.username, role: currentUser.role } : 'Not logged in');
  console.log('[TabLayout] Detected role:', userRole);

  // Log which tabs will render
  if (userRole === 'ADMIN') {
    console.log('[TabLayout] ✓ Rendering ADMIN tabs (Users, Bookings, Reports, Settings)');
  } else if (userRole === 'COACH') {
    console.log('[TabLayout] ✓ Rendering COACH tabs (Messages, Bookings, Development, Analytics, Profile)');
  } else if (userRole === 'USER') {
    console.log('[TabLayout] ✓ Rendering USER tabs (Home, Find Coach, Progress, Messages, Profile)');
  } else if (userRole === 'PARENT') {
    console.log('[TabLayout] ✓ Rendering PARENT tabs (Kids, Bookings, Messages, Profile)');
  } else {
    console.log('[TabLayout] ⚠️  Unknown/no role - defaulting to USER tabs');
  }

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

  // ADMIN TABS - Full access to all screens for moderation
  if (userRole === 'ADMIN') {
    return (
      <Tabs screenOptions={tabBarOptions}>
        <Tabs.Screen
          name="feed"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="square.stack.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: 'Users',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.2.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            title: 'Bookings',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="calendar.badge.clock" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="gearshape.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            href: null, // Hide reports from tab bar
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="availability"
          options={{
            href: null, // Admins don't need calendar view
          }}
        />
        <Tabs.Screen
          name="coach-profile"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="edit-profile"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="edit-user-profile"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null, // Hide from tab bar - access via Profile
          }}
        />
        <Tabs.Screen
          name="admin/invite-codes"
          options={{
            href: null, // Hide from tab bar - access via settings
          }}
        />
      </Tabs>
    );
  }

  // COACH TABS - 5 tabs: Home, Calendar, Feed, Messages, Profile
  if (userRole === 'COACH') {
    return (
      <Tabs screenOptions={tabBarOptions}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="calendar.badge.clock" color={color} />,
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="square.stack.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="bubble.left.and.bubble.right.fill" color={color} />
            ),
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.circle.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            href: null, // Hide - Analytics/Development moved to Profile
          }}
        />
        <Tabs.Screen
          name="availability"
          options={{
            href: null, // Hide - integrated into Calendar tab
          }}
        />
        <Tabs.Screen
          name="coach-profile"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="edit-profile"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="edit-user-profile"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null, // Hide from tab bar - access via Profile
          }}
        />
        <Tabs.Screen
          name="admin/invite-codes"
          options={{
            href: null, // Hide from tab bar
          }}
        />
      </Tabs>
    );
  }

  // USER TABS - 5 tabs: Home, Find Coach, Bookings, Messages, Profile
  if (userRole === 'USER') {
    return (
      <Tabs screenOptions={tabBarOptions}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'Find Coach',
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="magnifyingglass" color={color} />,
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            title: 'Bookings',
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="calendar.badge.clock" color={color} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="bubble.left.and.bubble.right.fill" color={color} />
            ),
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.circle.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            href: null, // Hidden - feed integrated into Home
          }}
        />
        <Tabs.Screen
          name="availability"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="coach-profile"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="edit-profile"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="edit-user-profile"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null, // Hide from tab bar - access via Profile
          }}
        />
        <Tabs.Screen
          name="admin/invite-codes"
          options={{
            href: null, // Hide from tab bar
          }}
        />
      </Tabs>
    );
  }

  // PARENT TABS - 4 tabs: Home, Discover, Calendar, Profile
  if (userRole === 'PARENT') {
    return (
      <Tabs screenOptions={tabBarOptions}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'Discover',
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="magnifyingglass" color={color} />,
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="calendar.badge.clock" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.circle.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            href: null, // Hide - Feed integrated into Home
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            href: null, // Hide - Messages accessible from Home
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          }}
        />
        <Tabs.Screen
          name="availability"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="coach-profile"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="edit-profile"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="edit-user-profile"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null, // Hide from tab bar - access via Profile
          }}
        />
        <Tabs.Screen
          name="admin/invite-codes"
          options={{
            href: null, // Hide from tab bar
          }}
        />
      </Tabs>
    );
  }

  // DEFAULT FALLBACK - Basic tabs for unauthenticated/unknown role
  return (
    <Tabs screenOptions={tabBarOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
          name="messages"
          options={{
            href: null,
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          }}
        />
      <Tabs.Screen
        name="more"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="availability"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="coach-profile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="edit-profile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="edit-user-profile"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="admin/invite-codes"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
