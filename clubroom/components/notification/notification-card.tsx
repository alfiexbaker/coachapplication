import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { NotificationItem } from '@/constants/types';
import { Clickable } from '@/components/primitives/clickable';

const ICONS: Record<NotificationItem['type'], string> = {
  booking: 'calendar',
  message: 'chatbubbles',
  review: 'star',
  payment: 'card',
  reminder: 'alarm',
  badge: 'ribbon',
};

export function NotificationCard({
  item,
  onPress,
  onShare,
}: {
  item: NotificationItem;
  onPress?: () => void;
  onShare?: () => void;
}) {
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
        {item.type === 'badge' && item.badgeTitle ? (
          <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
            {item.badgeTitle}
            {item.athleteName ? ` · ${item.athleteName}` : ''}
          </ThemedText>
        ) : null}
        {item.actionLabel && item.type === 'badge' ? (
          <Clickable onPress={onShare}>
            <View style={[styles.actionChip, { borderColor: palette.tint }]}>          
              <Ionicons name="share-outline" size={14} color={palette.tint} />
              <ThemedText style={[styles.actionText, { color: palette.tint }]}>
                {item.actionLabel}
              </ThemedText>
            </View>
          </Clickable>
        ) : null}
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
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.rounded,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
