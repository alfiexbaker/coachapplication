import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { DrillAssignmentStats } from '@/constants/types';
import type { TabFilter } from '@/hooks/use-drills-screen';
import { scaleFont } from '@/utils/scale';

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'pending', label: 'To Do' },
  { key: 'completed', label: 'Done' },
  { key: 'all', label: 'All' },
];

interface DrillTabFilterProps {
  activeTab: TabFilter;
  stats: DrillAssignmentStats | null;
  colors: ThemeColors;
  onTabChange: (tab: TabFilter) => void;
  delay?: number;
}

export const DrillTabFilter = memo(function DrillTabFilter({ activeTab, stats, colors, onTabChange, delay = 150 }: DrillTabFilterProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <Row gap="xs" style={styles.row}>
        {TABS.map(({ key, label }) => {
          const count = key === 'pending' ? stats?.pending ?? 0 : key === 'completed' ? stats?.completed ?? 0 : stats?.totalAssigned ?? 0;
          const isActive = activeTab === key;

          return (
            <Clickable
              key={key}
              onPress={() => onTabChange(key)}
              style={[styles.tab, { backgroundColor: isActive ? colors.tint : 'transparent', borderColor: isActive ? colors.tint : colors.border }]}
            >
              <ThemedText style={[styles.tabText, { color: isActive ? colors.onPrimary : colors.text }]}>{label}</ThemedText>
              <View style={[styles.badge, { backgroundColor: isActive ? withAlpha(colors.onPrimary, 0.2) : colors.surfaceSecondary }]}>
                <ThemedText style={[styles.badgeText, { color: isActive ? colors.onPrimary : colors.muted }]}>{count}</ThemedText>
              </View>
            </Clickable>
          );
        })}
      </Row>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: { marginBottom: Spacing.md },
  tab: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 10, borderRadius: Radii.md, borderWidth: 1,
  },
  tabText: { ...Typography.bodySmallSemiBold, fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize) },
  badge: { minWidth: 20, height: 20, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxs },
  badgeText: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize) },
});
