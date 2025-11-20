import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const { currentUser } = useAuth();

  const isCoach = currentUser?.role === 'Coach';
  const isUser = currentUser?.role === 'User' || currentUser?.role === 'Parent';

  const tabIcon = (name: React.ComponentProps<typeof Ionicons>['name']) => {
    const Icon = ({ color }: { color: string }) => <Ionicons name={name} size={24} color={color} />;
    Icon.displayName = `TabIcon(${name})`;
    if (__DEV__ && typeof console !== 'undefined') {
      console.debug('[TabLayout] create tab icon component', { name });
    }
    return Icon;
  };

  if (__DEV__ && typeof console !== 'undefined') {
    console.debug('[TabLayout] render', {
      colorScheme,
      palette,
      userRole: currentUser?.role ?? 'unknown',
      isCoach,
      isUser,
    });
  }

  const screens: React.ReactElement[] = [];

  if (isUser) {
    screens.push(
      <Tabs.Screen
        key="index"
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: tabIcon('search'),
        }}
      />,
    );
  }

  if (isCoach) {
    screens.push(
      <Tabs.Screen
        key="availability"
        name="availability"
        options={{
          title: 'Calendar',
          tabBarIcon: tabIcon('calendar'),
        }}
      />,
    );
  }

  screens.push(
    <Tabs.Screen
      key="bookings"
      name="bookings"
      options={{
        title: 'Bookings',
        tabBarIcon: tabIcon('time-outline'),
      }}
    />,
  );

  screens.push(
    <Tabs.Screen
      key="messages"
      name="messages"
      options={{
        title: 'Messages',
        tabBarIcon: tabIcon('chatbubble-ellipses'),
      }}
    />,
  );

  screens.push(
    <Tabs.Screen
      key="profile"
      name="profile"
      options={{
        title: 'Profile',
        tabBarIcon: tabIcon('person'),
      }}
    />,
  );

  if (isCoach) {
    screens.push(
      <Tabs.Screen
        key="hidden-index"
        name="index"
        options={{
          href: null, // Hides from tab bar
        }}
      />,
    );
  }

  if (isUser) {
    screens.push(
      <Tabs.Screen
        key="hidden-availability"
        name="availability"
        options={{
          href: null, // Hides from tab bar
        }}
      />,
    );
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
      }}
    >
      {screens}
    </Tabs>
  );
}
