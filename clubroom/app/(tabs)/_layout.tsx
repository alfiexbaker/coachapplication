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
  if (userRole === 'ADMIN') {
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
          name="admin/invite-codes"
          options={{
            href: null, // Hide from tab bar - access via settings
          }}
        />
      </Tabs>
    );
  }

  // COACH TABS - Messages, Bookings, Development, Analytics, Profile
  if (userRole === 'COACH') {
    return (
      <Tabs screenOptions={tabBarOptions}>
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
          name="bookings"
          options={{
            title: 'Bookings',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="calendar.badge.clock" color={color} />,
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: 'Development',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.line.uptrend.xyaxis" color={color} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'Analytics',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.bar.fill" color={color} />,
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
          name="admin/invite-codes"
          options={{
            href: null, // Hide from tab bar
          }}
        />
      </Tabs>
    );
  }

  // USER TABS - Home/Feed, Find Coach, Progress, Messages, Profile
  if (userRole === 'USER') {
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
          name="more"
          options={{
            title: 'Find Coach',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="magnifyingglass" color={color} />,
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            title: 'Progress',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="chart.line.uptrend.xyaxis" color={color} />,
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
          name="admin/invite-codes"
          options={{
            href: null, // Hide from tab bar
          }}
        />
      </Tabs>
    );
  }

  // PARENT TABS - Kids, Bookings, Messages, Profile
  if (userRole === 'PARENT') {
    return (
      <Tabs screenOptions={tabBarOptions}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Kids',
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
          name="more"
          options={{
            href: null, // Hide from tab bar
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
        name="admin/invite-codes"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
