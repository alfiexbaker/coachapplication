import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
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
  community: 'people',
};

// Color coding maps notification types to semantic theme tokens.
// Each entry returns a function of palette → { bg, icon } so dark mode adapts automatically.
type PaletteColors = ReturnType<typeof useTheme>['colors'];
const getTypeColors = (p: PaletteColors): Record<NotificationItem['type'], { bg: string; icon: string }> => ({
  booking:   { bg: withAlpha(p.info, 0.09),    icon: p.info },
  message:   { bg: withAlpha(p.success, 0.09), icon: p.success },
  review:    { bg: withAlpha(p.warning, 0.09), icon: p.warning },
  payment:   { bg: withAlpha(p.accent, 0.09),  icon: p.accent },
  reminder:  { bg: withAlpha(p.error, 0.09),   icon: p.error },
  badge:     { bg: withAlpha(p.warning, 0.09), icon: p.warning },
  community: { bg: withAlpha(p.info, 0.09),    icon: p.info },
});

export function NotificationCard({
  item,
  onPress,
  onShare,
  onAddToFeed,
  showTypeIndicator = true,
}: {
  item: ExtendedNotificationItem;
  onPress?: () => void;
  onShare?: () => void;
  onAddToFeed?: () => void;
  showTypeIndicator?: boolean;
}) {
  const { colors: palette, scheme } = useTheme();
  const router = useRouter();
  const icon = ICONS[item.type] || 'notifications';
  const TYPE_COLORS = getTypeColors(palette);
  const typeColor = TYPE_COLORS[item.type] || TYPE_COLORS.booking;

  const handlePress = () => {
    if (onPress) {
      onPress();
    }

    // Navigate to deep link if available
    if (item.deepLink) {
      try {
        router.push(item.deepLink as Href);
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
            backgroundColor: item.read ? palette.surface : withAlpha(palette.tint, 0.03),
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
              backgroundColor: typeColor.bg,
            },
          ]}
        >
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap}
            size={20}
            color={typeColor.icon}
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
              <ThemedText style={{ ...Typography.smallSemiBold, color: palette.tint, marginLeft: Spacing.xxs }}>
                {item.badgeTitle}
                {item.athleteName ? ` - ${item.athleteName}` : ''}
              </ThemedText>
            </View>
          ) : null}

          {/* Action buttons for badge */}
          {item.type === 'badge' && !item.handled ? (
            <View style={styles.actionRow}>
              {onAddToFeed && (
                <Clickable onPress={onAddToFeed}>
                  <View style={[styles.actionChip, { backgroundColor: palette.tint, borderColor: palette.tint }]}>
                    <Ionicons name="add-circle-outline" size={14} color={palette.onPrimary} />
                    <ThemedText style={[styles.actionText, { color: palette.onPrimary }]}>
                      Add to Feed
                    </ThemedText>
                  </View>
                </Clickable>
              )}
              {onShare && (
                <Clickable onPress={onShare}>
                  <View style={[styles.actionChip, { borderColor: palette.border }]}>
                    <Ionicons name="eye-outline" size={14} color={palette.text} />
                    <ThemedText style={[styles.actionText, { color: palette.text }]}>
                      View
                    </ThemedText>
                  </View>
                </Clickable>
              )}
            </View>
          ) : null}

          {/* Time label */}
          <View style={styles.footer}>
            <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
              {item.timeLabel || 'Just now'}
            </ThemedText>

            {/* Type indicator */}
            {showTypeIndicator && (
              <View style={[styles.typeTag, { backgroundColor: withAlpha(palette.muted, 0.09) }]}>
                <ThemedText style={{ ...Typography.micro, color: palette.muted, textTransform: 'capitalize' }}>
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
    gap: Spacing.xxs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: { ...Typography.body },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  body: { ...Typography.bodySmall, lineHeight: 20 },
  badgeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xxs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  actionText: { ...Typography.caption },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xxs,
  },
  typeTag: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.xs,
  },
  chevron: {
    marginTop: Spacing.xs + Spacing.xxs,
  },
});
