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

  const isCoach = currentUser?.role === 'Coach';
  const isUser = currentUser?.role === 'User' || currentUser?.role === 'Parent';

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
      {/* User/Parent tabs: Discover coaches */}
      {isUser && (
        <Tabs.Screen
          name="index"
          options={{
            title: 'Discover',
            tabBarIcon: ({ color }) => (
              <IconSymbol size={24} name="magnifyingglass.circle.fill" color={color} />
            ),
          }}
        />
      )}

      {/* Coach tabs: Calendar/Availability is their home */}
      {isCoach && (
        <Tabs.Screen
          name="availability"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="calendar.circle.fill" color={color} />,
          }}
        />
      )}

      {/* Bookings - shown to everyone but different meaning */}
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="calendar.badge.clock" color={color} />,
        }}
      />

      {/* Messages - shown to everyone */}
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="bubble.left.fill" color={color} />,
        }}
      />

      {/* Profile - shown to everyone */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.fill" color={color} />,
        }}
      />

      {/* Hide index from coaches */}
      {isCoach && (
        <Tabs.Screen
          name="index"
          options={{
            href: null, // Hides from tab bar
          }}
        />
      )}

      {/* Hide availability from users */}
      {isUser && (
        <Tabs.Screen
          name="availability"
          options={{
            href: null, // Hides from tab bar
          }}
        />
      )}
    </Tabs>
  );
}
