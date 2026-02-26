import React, { memo, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface NavLink {
  title: string;
  subtitle?: string;
  icon: string;
  route: string;
}

const NAV_LINKS: Record<string, NavLink[]> = {
  COACH: [
    {
      title: 'My Athletes',
      subtitle: 'Roster, progress & special needs',
      icon: 'people',
      route: '/(tabs)/athletes',
    },
    {
      title: 'Calendar & Availability',
      subtitle: 'Manage slots and bookings',
      icon: 'calendar-outline',
      route: '/(tabs)/bookings',
    },
    {
      title: 'Coach Profile',
      subtitle: 'Services, rates, identity',
      icon: 'person-circle-outline',
      route: '/(tabs)/coach-profile',
    },
    {
      title: 'Messages',
      subtitle: 'Chat with athletes & parents',
      icon: 'chatbubbles-outline',
      route: '/(tabs)/messages',
    },
    {
      title: 'Earnings Reconciler',
      subtitle: 'Session payment reconciliation',
      icon: 'wallet-outline',
      route: '/(tabs)/earnings',
    },
  ],
  USER: [
    {
      title: 'My Bookings',
      subtitle: 'Upcoming & past sessions',
      icon: 'calendar-outline',
      route: '/(tabs)/bookings',
    },
    {
      title: 'Messages',
      subtitle: 'Chat with coaches',
      icon: 'chatbubbles-outline',
      route: '/(tabs)/messages',
    },
    {
      title: 'Feed & Community',
      subtitle: 'Posts, drills, highlights',
      icon: 'newspaper-outline',
      route: '/(tabs)/feed',
    },
    {
      title: 'Badges & Achievements',
      subtitle: 'All badges and progress tracking',
      icon: 'ribbon-outline',
      route: '/badges',
    },
  ],
  PARENT: [
    {
      title: 'My Children',
      subtitle: 'Profiles, progress & special needs',
      icon: 'people',
      route: '/(tabs)/children',
    },
    {
      title: 'Bookings',
      subtitle: 'Upcoming & past sessions',
      icon: 'calendar-outline',
      route: '/(tabs)/bookings',
    },
    {
      title: 'Family Sharing',
      subtitle: 'Invite co-parents and guardians',
      icon: 'people-circle-outline',
      route: '/family/sharing',
    },
    {
      title: 'Messages',
      subtitle: 'Coaches and updates',
      icon: 'chatbubbles-outline',
      route: '/(tabs)/messages',
    },
    {
      title: 'Discover Coaches',
      subtitle: 'Find local sessions',
      icon: 'search-outline',
      route: '/(tabs)/more',
    },
    {
      title: 'Activity Feed',
      subtitle: 'Goals and highlights',
      icon: 'newspaper-outline',
      route: '/(tabs)/feed',
    },
    {
      title: 'Badges & Achievements',
      subtitle: 'View earned badges and milestones',
      icon: 'ribbon-outline',
      route: '/badges',
    },
  ],
  ADMIN: [
    {
      title: 'User Directory',
      subtitle: 'Moderate accounts',
      icon: 'person-circle-outline',
      route: '/(tabs)/index',
    },
    {
      title: 'Bookings',
      subtitle: 'Platform overview',
      icon: 'calendar-outline',
      route: '/(tabs)/bookings',
    },
    {
      title: 'Messages',
      subtitle: 'Threads & safety',
      icon: 'chatbubbles-outline',
      route: '/(tabs)/messages',
    },
    {
      title: 'Invite Codes',
      subtitle: 'Schools & org onboarding',
      icon: 'key-outline',
      route: '/(tabs)/admin/invite-codes',
    },
  ],
};

const NavCard = memo(function NavCard({ link }: { link: NavLink }) {
  const { colors: palette } = useTheme();

  const handlePress = useCallback(() => {
    router.push(link.route as Href);
  }, [link.route]);

  return (
    <SurfaceCard
      onPress={handlePress}
      accessibilityLabel={`Navigate to ${link.title}`}
      accessibilityRole="button"
    >
      <Row align="center" gap="sm">
        <Row
          align="center"
          justify="center"
          style={[styles.navIcon, { backgroundColor: withAlpha(palette.accent, 0.07) }]}
        >
          <Ionicons
            name={link.icon as keyof typeof Ionicons.glyphMap}
            size={22}
            color={palette.accent}
          />
        </Row>
        <Column gap="micro" flex>
          <ThemedText type="defaultSemiBold">{link.title}</ThemedText>
          {link.subtitle && (
            <ThemedText style={{ color: palette.muted, ...Typography.small }}>
              {link.subtitle}
            </ThemedText>
          )}
        </Column>
        <Ionicons name="chevron-forward" size={18} color={palette.muted} />
      </Row>
    </SurfaceCard>
  );
});

interface SettingsNavHubProps {
  role: string | undefined;
}

export const SettingsNavHub = memo(function SettingsNavHub({ role }: SettingsNavHubProps) {
  const navLinks = NAV_LINKS[role ?? 'USER'] ?? NAV_LINKS.USER;

  if (role === 'USER') return null;

  return (
    <Column gap="sm">
      <SectionHeader title="Navigation hub" subtitle="Jump to the places you need" />
      <Column gap="sm">
        {navLinks.map((link) => (
          <NavCard key={link.title} link={link} />
        ))}
      </Column>
    </Column>
  );
});

const styles = StyleSheet.create({
  navCard: {
    // layout moved to inner Row
  },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
