import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { scaleFont } from '@/utils/scale';

// Web-compatible clickable wrapper using Pressable
type ClickableProps = {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
};

function Clickable({ onPress, style, children }: ClickableProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [style, pressed && { opacity: 0.7 }]}>
      {children}
    </Pressable>
  );
}

export type TabType = 'list' | 'create';

export interface CoachTabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function CoachTabNavigation({ activeTab, onTabChange }: CoachTabNavigationProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.tabContainer}>
      <Clickable
        onPress={() => onTabChange('list')}
        style={[
          styles.tab,
          activeTab === 'list' ? { ...styles.activeTab, borderBottomColor: palette.tint } : undefined,
        ]}>
        <Ionicons
          name="list-outline"
          size={20}
          color={activeTab === 'list' ? palette.tint : palette.icon}
        />
        <ThemedText
          style={[
            styles.tabText,
            activeTab === 'list' ? { color: palette.tint, fontWeight: '700' } : undefined,
          ]}>
          Bookings List
        </ThemedText>
      </Clickable>

      <Clickable
        onPress={() => onTabChange('create')}
        style={[
          styles.tab,
          activeTab === 'create' ? { ...styles.activeTab, borderBottomColor: palette.tint } : undefined,
        ]}>
        <Ionicons
          name="add-circle-outline"
          size={20}
          color={activeTab === 'create' ? palette.tint : palette.icon}
        />
        <ThemedText
          style={[
            styles.tabText,
            activeTab === 'create' ? { color: palette.tint, fontWeight: '700' } : undefined,
          ]}>
          Create Booking
        </ThemedText>
      </Clickable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
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
