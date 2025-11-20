import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const { currentUser } = useAuth();

  const userRole = currentUser?.role;

  // Debug logging to track role detection and tab rendering
  console.log('[TabLayout] Current user:', currentUser ? { username: currentUser.username, role: currentUser.role } : 'Not logged in');
  console.log('[TabLayout] Detected role:', userRole);

  // Log which tabs will render
  if (userRole === 'Admin') {
    console.log('[TabLayout] ✓ Rendering ADMIN tabs (Users, Bookings, Reports, Settings)');
  } else if (userRole === 'Coach') {
    console.log('[TabLayout] ✓ Rendering COACH tabs (Calendar, Bookings, Messages, Profile)');
  } else if (userRole === 'User' || userRole === 'Parent') {
    console.log('[TabLayout] ✓ Rendering USER/PARENT tabs (Discover, Bookings, Messages, Profile)');
  } else {
    console.log('[TabLayout] ⚠️  Unknown/no role - defaulting to USER tabs');
  }

  const tabBarOptions = {
    tabBarActiveTintColor: palette.tint,
    tabBarInactiveTintColor: palette.tabIconDefault,
    headerShown: false,
    tabBarButton: (props: any) => <HapticTab {...props} />,
    tabBarStyle: {
      backgroundColor: palette.background,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      height: 72,
      paddingBottom: 20,
      paddingTop: 12,
      paddingHorizontal: 8,
    },
    tabBarLabelStyle: {
      fontSize: 10,
      fontWeight: '600' as const,
      letterSpacing: 0.2,
      marginTop: 4,
    },
    tabBarIconStyle: {
      marginTop: 4,
    },
  };

  // ADMIN TABS - Full access to all screens for moderation
  if (userRole === 'Admin') {
    return (
      <Tabs screenOptions={tabBarOptions}>
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
          name="messages"
          options={{
            title: 'Reports',
            tabBarIcon: ({ color }) => <IconSymbol size={22} name="exclamationmark.triangle.fill" color={color} />,
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
          name="availability"
          options={{
            href: null, // Admins don't need calendar view
          }}
        />
      </Tabs>
    );
  }

  // COACH TABS - Manage availability and bookings
  if (userRole === 'Coach') {
    return (
      <Tabs screenOptions={tabBarOptions}>
        <Tabs.Screen
          name="availability"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="calendar" color={color} />,
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
          name="messages"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color }) => (
              <IconSymbol size={22} name="bubble.left.and.bubble.right.fill" color={color} />
            ),
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
          name="index"
          options={{
            href: null, // Coaches don't need discover page
          }}
        />
      </Tabs>
    );
  }

  // USER/PARENT TABS (Default fallback) - Discover coaches and book sessions
  return (
    <Tabs screenOptions={tabBarOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="map.fill" color={color} />,
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
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={22} name="bubble.left.and.bubble.right.fill" color={color} />
          ),
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
        name="availability"
        options={{
          href: null, // Users don't have availability calendar
        }}
      />
    </Tabs>
  );
}
