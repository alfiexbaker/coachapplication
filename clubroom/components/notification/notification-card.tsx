import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { NotificationItem } from '@/constants/types';

const ICONS: Record<NotificationItem['type'], string> = {
  booking: 'calendar',
  message: 'chatbubbles',
  review: 'star',
  payment: 'card',
  reminder: 'alarm',
};

export function NotificationCard({ item, onPress }: { item: NotificationItem; onPress?: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const icon = ICONS[item.type] || 'notifications';
  return (
    <View
      style={[
        styles.card,
        {
          borderColor: palette.border,
          backgroundColor: item.read ? palette.surface : `${palette.tint}08`,
        },
      ]}
    >
      <Ionicons name={icon as any} size={24} color={palette.tint} />
      <View style={{ flex: 1, gap: 4 }}>
        <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
        <ThemedText style={{ color: palette.muted }}>{item.body}</ThemedText>
      </View>
      <ThemedText style={{ color: palette.muted, fontSize: 12 }}>{item.timeLabel || 'Just now'}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
  },
});
