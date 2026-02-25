import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

export type TabType = 'list' | 'create';

export interface CoachTabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function CoachTabNavigation({ activeTab, onTabChange }: CoachTabNavigationProps) {
  const { colors: palette } = useTheme();

  return (
    <Row style={styles.tabContainer}>
      <Clickable
        onPress={() => onTabChange('list')}
        style={[
          styles.tab,
          activeTab === 'list'
            ? { ...styles.activeTab, borderBottomColor: palette.tint }
            : undefined,
        ]}
      >
        <Ionicons
          name="list-outline"
          size={20}
          color={activeTab === 'list' ? palette.tint : palette.icon}
        />
        <ThemedText
          style={[
            styles.tabText,
            activeTab === 'list' ? { color: palette.tint, fontWeight: '700' } : undefined,
          ]}
        >
          Bookings List
        </ThemedText>
      </Clickable>

      <Clickable
        onPress={() => onTabChange('create')}
        style={[
          styles.tab,
          activeTab === 'create'
            ? { ...styles.activeTab, borderBottomColor: palette.tint }
            : undefined,
        ]}
      >
        <Ionicons
          name="add-circle-outline"
          size={20}
          color={activeTab === 'create' ? palette.tint : palette.icon}
        />
        <ThemedText
          style={[
            styles.tabText,
            activeTab === 'create' ? { color: palette.tint, fontWeight: '700' } : undefined,
          ]}
        >
          Create Booking
        </ThemedText>
      </Clickable>
    </Row>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs + Spacing.xxs,
    gap: Spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xs + Spacing.xxs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: scaleFont(14),
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
