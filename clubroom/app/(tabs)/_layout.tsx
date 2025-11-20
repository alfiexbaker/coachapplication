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

  // DEBUG: Log current user and role
  console.log('[TabLayout] Current user:', currentUser?.username, 'Role:', currentUser?.role);

  const isCoach = currentUser?.role === 'Coach';
  const isUser = currentUser?.role === 'User' || currentUser?.role === 'Parent';
  const isAdmin = currentUser?.role === 'Admin';

  console.log('[TabLayout] Role flags:', { isCoach, isUser, isAdmin });

  // DEBUG: Log which tab group is rendering
  if (isAdmin) {
    console.log('[TabLayout] Rendering ADMIN tabs');
  } else if (isUser) {
    console.log('[TabLayout] Rendering USER/PARENT tabs');
  } else if (isCoach) {
    console.log('[TabLayout] Rendering COACH tabs');
  } else {
    console.log('[TabLayout] WARNING: No role matched! Tabs may not render correctly');
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.tint,
        tabBarInactiveTintColor: palette.tabIconDefault,
        headerShown: false,
        tabBarButton: (props) => <HapticTab {...props} />,
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
          fontWeight: '600',
          letterSpacing: 0.2,
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}>
      {/* ADMIN TABS - Full access to all screens for moderation */}
      {isAdmin && (
        <>
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
        </>
      )}

      {/* USER/PARENT TABS - Discover coaches and book sessions */}
      {isUser && (
        <>
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
        </>
      )}

      {/* COACH TABS - Manage availability and bookings */}
      {isCoach && (
        <>
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
        </>
      )}
    </Tabs>
  );
}
