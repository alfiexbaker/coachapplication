/**
 * ProfileTabBar — Tab switcher for coach profile.
 */
import React from 'react';
import { StyleSheet, ViewStyle, TextStyle } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

export type TabType = 'posts' | 'about' | 'photos' | 'sessions' | 'reviews';

export interface ProfileTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const TABS: { key: TabType; label: string }[] = [
  { key: 'posts', label: 'Posts' },
  { key: 'about', label: 'About' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'photos', label: 'Photos' },
  { key: 'reviews', label: 'Reviews' },
];

function ProfileTabBarInner({ activeTab, onTabChange }: ProfileTabsProps) {
  const { colors: palette } = useTheme();
  return (
    <Row style={[styles.tabsContainer, { borderBottomColor: palette.border }]}>
      {TABS.map((tab) => (
        <Clickable
          key={tab.key}
          onPress={() => onTabChange(tab.key)}
          style={
            [
              styles.tabButton,
              activeTab === tab.key && { borderBottomColor: palette.tint, borderBottomWidth: 2 },
            ].filter(Boolean) as ViewStyle[]
          }
        >
          <ThemedText
            style={
              [
                styles.tabText,
                { color: palette.muted },
                activeTab === tab.key && { ...Typography.bodySmallSemiBold, color: palette.tint },
              ].filter(Boolean) as TextStyle[]
            }
          >
            {tab.label}
          </ThemedText>
        </Clickable>
      ))}
    </Row>
  );
}

export const ProfileTabBar = React.memo(ProfileTabBarInner);
export default ProfileTabBar;

const styles = StyleSheet.create({
  tabsContainer: { borderBottomWidth: 1, paddingHorizontal: Spacing.lg },
  tabButton: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center' },
  tabText: { ...Typography.bodySmall, fontWeight: Typography.subheading.fontWeight },
});
