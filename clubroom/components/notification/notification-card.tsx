import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createLogger } from '@/utils/logger';
import { NotificationItem } from '@/constants/types';
import { Clickable } from '@/components/primitives/clickable';
import { ExtendedNotificationItem } from '@/services/notification-service';

const logger = createLogger('NotificationCard');

const ICONS: Record<NotificationItem['type'], string> = {
  booking: 'calendar',
  message: 'chatbubbles',
  review: 'star',
  payment: 'card',
  reminder: 'alarm',
  badge: 'ribbon',
};

// Color coding for different notification types
const TYPE_COLORS: Record<NotificationItem['type'], { bg: string; icon: string }> = {
  booking: { bg: '#E3F2FD', icon: '#1976D2' },
  message: { bg: '#E8F5E9', icon: '#388E3C' },
  review: { bg: '#FFF3E0', icon: '#F57C00' },
  payment: { bg: '#F3E5F5', icon: '#7B1FA2' },
  reminder: { bg: '#FBE9E7', icon: '#D84315' },
  badge: { bg: '#FFF8E1', icon: '#FFA000' },
};

export function NotificationCard({
  item,
  onPress,
  onShare,
  showTypeIndicator = true,
}: {
  item: ExtendedNotificationItem;
  onPress?: () => void;
  onShare?: () => void;
  showTypeIndicator?: boolean;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const router = useRouter();
  const icon = ICONS[item.type] || 'notifications';
  const typeColor = TYPE_COLORS[item.type] || TYPE_COLORS.booking;

  const handlePress = () => {
    if (onPress) {
      onPress();
    }

    // Navigate to deep link if available
    if (item.deepLink) {
      try {
        router.push(item.deepLink as any);
      } catch (error) {
        logger.error('Failed to navigate', { deepLink: item.deepLink, error });
      }
    }
  };

  return (
    <Clickable onPress={handlePress}>
      <View
        style={[
          styles.card,
          {
            borderColor: item.read ? palette.border : palette.tint,
            backgroundColor: item.read ? palette.surface : `${palette.tint}08`,
            borderLeftWidth: item.read ? 1.5 : 3,
            borderLeftColor: item.read ? palette.border : palette.tint,
          },
        ]}
      >
        {/* Icon container with type-specific background */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: scheme === 'dark' ? `${typeColor.icon}20` : typeColor.bg,
            },
          ]}
        >
          <Ionicons
            name={icon as any}
            size={20}
            color={scheme === 'dark' ? palette.tint : typeColor.icon}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <ThemedText type="defaultSemiBold" style={styles.title}>
              {item.title}
            </ThemedText>
            {!item.read && <View style={[styles.unreadDot, { backgroundColor: palette.tint }]} />}
          </View>

          <ThemedText style={[styles.body, { color: palette.muted }]} numberOfLines={2}>
            {item.body}
          </ThemedText>

          {/* Badge-specific content */}
          {item.type === 'badge' && item.badgeTitle ? (
            <View style={styles.badgeInfo}>
              <Ionicons name="ribbon" size={14} color={palette.tint} />
              <ThemedText style={{ color: palette.tint, fontWeight: '600', fontSize: 13, marginLeft: 4 }}>
                {item.badgeTitle}
                {item.athleteName ? ` - ${item.athleteName}` : ''}
              </ThemedText>
            </View>
          ) : null}

          {/* Action button for badge sharing */}
          {item.actionLabel && item.type === 'badge' && !item.handled ? (
            <Clickable
              onPress={() => {
                onShare?.();
              }}
            >
              <View style={[styles.actionChip, { borderColor: palette.tint }]}>
                <Ionicons name="share-outline" size={14} color={palette.tint} />
                <ThemedText style={[styles.actionText, { color: palette.tint }]}>
                  {item.actionLabel}
                </ThemedText>
              </View>
            </Clickable>
          ) : null}

          {/* Time label */}
          <View style={styles.footer}>
            <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
              {item.timeLabel || 'Just now'}
            </ThemedText>

            {/* Type indicator */}
            {showTypeIndicator && (
              <View style={[styles.typeTag, { backgroundColor: `${palette.muted}15` }]}>
                <ThemedText style={{ color: palette.muted, fontSize: 10, textTransform: 'capitalize' }}>
                  {item.type}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Chevron for navigation hint */}
        {item.deepLink && (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={palette.muted}
            style={styles.chevron}
          />
        )}
      </View>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: {
    fontSize: 15,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  badgeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  typeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chevron: {
    marginTop: 12,
  },
});
