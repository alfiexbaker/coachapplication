import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { TabId } from '@/hooks/use-athlete-detail';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'person-outline' },
  { id: 'sessions', label: 'Sessions', icon: 'calendar-outline' },
  { id: 'progress', label: 'Progress', icon: 'trending-up-outline' },
  { id: 'notes', label: 'Notes', icon: 'document-text-outline' },
];

interface AthleteTabBarProps {
  activeTab: TabId;
  onTabPress: (tab: TabId) => void;
}

export const AthleteTabBar = memo(function AthleteTabBar({
  activeTab,
  onTabPress,
}: AthleteTabBarProps) {
  const { colors } = useTheme();

  return (
    <Row gap="xs" style={styles.tabBar}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Clickable
            key={tab.id}
            onPress={() => onTabPress(tab.id)}
            style={[
              styles.tab,
              {
                borderBottomColor: isActive ? colors.tint : 'transparent',
              },
            ]}
            accessibilityLabel={`${tab.label} tab`}
            accessibilityRole="tab"
          >
            <Row align="center" justify="center" gap="xxs">
              <Ionicons
                name={tab.icon as 'person-outline'}
                size={18}
                color={isActive ? colors.tint : colors.muted}
              />
              <ThemedText
                style={[styles.tabLabel, { color: isActive ? colors.tint : colors.muted }]}
              >
                {tab.label}
              </ThemedText>
            </Row>
          </Clickable>
        );
      })}
    </Row>
  );
});

const styles = StyleSheet.create({
  tabBar: {
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    minHeight: 44,
  },
  tabLabel: {
    ...Typography.smallSemiBold,
  },
});
