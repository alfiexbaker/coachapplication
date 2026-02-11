import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { createLogger } from '@/utils/logger';
import { NotificationItem } from '@/constants/types';
import { Clickable } from '@/components/primitives/clickable';
import { ExtendedNotificationItem } from '@/services/notification-service';
import { navigateToDeepLink } from '@/utils/deep-link';

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
const getTypeColors = (
  p: PaletteColors,
): Record<NotificationItem['type'], { bg: string; icon: string }> => ({
  booking: { bg: withAlpha(p.info, 0.09), icon: p.info },
  message: { bg: withAlpha(p.success, 0.09), icon: p.success },
  review: { bg: withAlpha(p.warning, 0.09), icon: p.warning },
  payment: { bg: withAlpha(p.accent, 0.09), icon: p.accent },
  reminder: { bg: withAlpha(p.error, 0.09), icon: p.error },
  badge: { bg: withAlpha(p.warning, 0.09), icon: p.warning },
  community: { bg: withAlpha(p.info, 0.09), icon: p.info },
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
  const { colors: palette } = useTheme();
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
        const navigated = navigateToDeepLink(router, item.deepLink);
        if (!navigated) {
          logger.warn('Invalid notification deep link', { deepLink: item.deepLink });
        }
      } catch (error) {
        logger.error('Failed to navigate', { deepLink: item.deepLink, error });
      }
    }
  };

  return (
    <Clickable onPress={handlePress}>
      <Row
        align="start"
        gap="sm"
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
          <Row align="center" gap="xs">
            <ThemedText type="defaultSemiBold" style={styles.title}>
              {item.title}
            </ThemedText>
            {!item.read && <View style={[styles.unreadDot, { backgroundColor: palette.tint }]} />}
          </Row>

          <ThemedText style={[styles.body, { color: palette.muted }]} numberOfLines={2}>
            {item.body}
          </ThemedText>

          {/* Badge-specific content */}
          {item.type === 'badge' && item.badgeTitle ? (
            <Row align="center" style={styles.badgeInfo}>
              <Ionicons name="ribbon" size={14} color={palette.tint} />
              <ThemedText
                style={{
                  ...Typography.smallSemiBold,
                  color: palette.tint,
                  marginLeft: Spacing.xxs,
                }}
              >
                {item.badgeTitle}
                {item.athleteName ? ` - ${item.athleteName}` : ''}
              </ThemedText>
            </Row>
          ) : null}

          {/* Action buttons for badge */}
          {item.type === 'badge' && !item.handled ? (
            <Row gap="xs" style={styles.actionRow}>
              {onAddToFeed && (
                <Clickable onPress={onAddToFeed}>
                  <Row
                    align="center"
                    gap="xs"
                    style={[
                      styles.actionChip,
                      { backgroundColor: palette.tint, borderColor: palette.tint },
                    ]}
                  >
                    <Ionicons name="add-circle-outline" size={14} color={palette.onPrimary} />
                    <ThemedText style={[styles.actionText, { color: palette.onPrimary }]}>
                      Add to Feed
                    </ThemedText>
                  </Row>
                </Clickable>
              )}
              {onShare && (
                <Clickable onPress={onShare}>
                  <Row
                    align="center"
                    gap="xs"
                    style={[styles.actionChip, { borderColor: palette.border }]}
                  >
                    <Ionicons name="eye-outline" size={14} color={palette.text} />
                    <ThemedText style={[styles.actionText, { color: palette.text }]}>
                      View
                    </ThemedText>
                  </Row>
                </Clickable>
              )}
            </Row>
          ) : null}

          {/* Time label */}
          <Row align="center" justify="between" style={styles.footer}>
            <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
              {item.timeLabel || 'Just now'}
            </ThemedText>

            {/* Type indicator */}
            {showTypeIndicator && (
              <View style={[styles.typeTag, { backgroundColor: withAlpha(palette.muted, 0.09) }]}>
                <ThemedText
                  style={{ ...Typography.micro, color: palette.muted, textTransform: 'capitalize' }}
                >
                  {item.type}
                </ThemedText>
              </View>
            )}
          </Row>
        </View>

        {/* Chevron for navigation hint */}
        {item.deepLink && (
          <Ionicons name="chevron-forward" size={16} color={palette.muted} style={styles.chevron} />
        )}
      </Row>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  card: {
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
  title: { ...Typography.body },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  body: { ...Typography.bodySmall, lineHeight: 20 },
  badgeInfo: {
    marginTop: Spacing.xxs,
  },
  actionRow: {
    marginTop: Spacing.xs,
  },
  actionChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  actionText: { ...Typography.caption },
  footer: {
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
