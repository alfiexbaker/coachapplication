import { View, StyleSheet } from 'react-native';
import Animated, {
  Extrapolate,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { createLogger } from '@/utils/logger';
import { NotificationItem } from '@/constants/types';
import { Clickable } from '@/components/primitives/clickable';
import { ExtendedNotificationItem } from '@/services/notification-service';
import { navigateToDeepLink } from '@/utils/deep-link';
import { NotificationDesign } from './notification-design';

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
  onMarkRead,
  onMute,
  onDelete,
  onShare: _onShare,
  onAddToFeed: _onAddToFeed,
  showTypeIndicator = true,
}: {
  item: ExtendedNotificationItem;
  onPress?: () => void;
  onMarkRead?: () => void;
  onMute?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onAddToFeed?: () => void;
  showTypeIndicator?: boolean;
}) {
  const { colors: palette } = useTheme();
  const router = useRouter();
  const icon = ICONS[item.type] || 'notifications';
  const TYPE_COLORS = getTypeColors(palette);
  const typeColor = TYPE_COLORS[item.type] || TYPE_COLORS.booking;
  const typeLabel = `${item.type.slice(0, 1).toUpperCase()}${item.type.slice(1)}`;
  const swipeEnabled = Boolean(onMarkRead || onMute || onDelete);
  void _onShare;
  void _onAddToFeed;

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

  const content = (
    <Clickable onPress={handlePress}>
      <Row
        align="start"
        gap="sm"
        style={[
          styles.card,
          {
            borderColor: withAlpha(palette.border, 0.8),
            backgroundColor: item.read ? palette.surface : withAlpha(palette.tint, 0.035),
          },
        ]}
      >
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
            size={NotificationDesign.card.iconSize}
            color={typeColor.icon}
          />
        </View>

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

          {item.type === 'badge' && item.badgeTitle ? (
            <Row align="center" style={styles.badgeInfo}>
              <Ionicons name="ribbon" size={14} color={palette.tint} />
              <ThemedText
                style={{
                  ...Typography.smallSemiBold,
                  color: palette.tint,
                  marginLeft: Spacing.xxs,
                }}
                numberOfLines={1}
              >
                {item.badgeTitle}
                {item.athleteName ? ` - ${item.athleteName}` : ''}
              </ThemedText>
            </Row>
          ) : null}

          <Row align="center" justify="between" style={styles.footer}>
            <ThemedText style={{ ...Typography.caption, color: palette.muted }} numberOfLines={1}>
              {item.timeLabel || 'Just now'}
              {showTypeIndicator ? ` · ${typeLabel}` : ''}
            </ThemedText>
          </Row>
        </View>

        {item.deepLink && (
          <Ionicons name="chevron-forward" size={16} color={palette.muted} style={styles.chevron} />
        )}
      </Row>
    </Clickable>
  );

  if (!swipeEnabled) {
    return content;
  }

  return (
    <ReanimatedSwipeable
      renderRightActions={(progress, translation, swipeableMethods) => (
        <SwipeActions
          progress={progress}
          translation={translation}
          palette={palette}
          onMarkRead={
            onMarkRead
              ? () => {
                  swipeableMethods.close();
                  onMarkRead();
                }
              : undefined
          }
          onMute={
            onMute
              ? () => {
                  swipeableMethods.close();
                  onMute();
                }
              : undefined
          }
          onDelete={
            onDelete
              ? () => {
                  swipeableMethods.close();
                  onDelete();
                }
              : undefined
          }
        />
      )}
      rightThreshold={NotificationDesign.swipe.rightThreshold}
      friction={2}
      overshootRight={false}
    >
      {content}
    </ReanimatedSwipeable>
  );
}

function SwipeActions({
  progress: _progress,
  translation,
  palette,
  onMarkRead,
  onMute,
  onDelete,
}: {
  progress: SharedValue<number>;
  translation: SharedValue<number>;
  palette: ReturnType<typeof useTheme>['colors'];
  onMarkRead?: () => void;
  onMute?: () => void;
  onDelete?: () => void;
}) {
  void _progress;
  const actionsCount = [onMarkRead, onMute, onDelete].filter(Boolean).length;
  const totalWidth = actionsCount * NotificationDesign.swipe.actionWidth;

  const actionAnim = useAnimatedStyle(() => ({
    opacity: interpolate(
      translation.value,
      [-Math.max(totalWidth, 1), -Math.max(totalWidth, 1) * 0.5, 0],
      [1, 0.8, 0],
      Extrapolate.CLAMP,
    ),
    transform: [
      {
        translateX: interpolate(
          translation.value,
          [-Math.max(totalWidth, 1), 0],
          [0, totalWidth * 0.35],
          Extrapolate.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Animated.View style={[styles.swipeActionsRow, actionAnim]}>
      {onMarkRead ? (
        <Clickable
          onPress={onMarkRead}
          accessibilityRole="button"
          accessibilityLabel="Mark notification as read"
          style={[styles.swipeAction, { backgroundColor: withAlpha(palette.tint, 0.95) }]}
        >
          <Ionicons name="checkmark" size={16} color={palette.onPrimary} />
          <ThemedText style={[styles.swipeLabel, { color: palette.onPrimary }]}>Read</ThemedText>
        </Clickable>
      ) : null}
      {onMute ? (
        <Clickable
          onPress={onMute}
          accessibilityRole="button"
          accessibilityLabel="Mute this notification type"
          style={[styles.swipeAction, { backgroundColor: withAlpha(palette.warning, 0.95) }]}
        >
          <Ionicons name="volume-mute" size={16} color={palette.onPrimary} />
          <ThemedText style={[styles.swipeLabel, { color: palette.onPrimary }]}>Mute</ThemedText>
        </Clickable>
      ) : null}
      {onDelete ? (
        <Clickable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete notification"
          style={[styles.swipeAction, { backgroundColor: withAlpha(palette.error, 0.95) }]}
        >
          <Ionicons name="trash-outline" size={16} color={palette.onPrimary} />
          <ThemedText style={[styles.swipeLabel, { color: palette.onPrimary }]}>Delete</ThemedText>
        </Clickable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: NotificationDesign.card.paddingX,
    paddingVertical: NotificationDesign.card.paddingY,
    borderRadius: NotificationDesign.card.radius,
    borderWidth: 1,
  },
  iconContainer: {
    width: NotificationDesign.card.iconBox,
    height: NotificationDesign.card.iconBox,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: Spacing.xxs,
  },
  title: { ...Typography.bodySmallSemiBold },
  unreadDot: {
    width: NotificationDesign.card.unreadDot,
    height: NotificationDesign.card.unreadDot,
    borderRadius: Radii.xs,
  },
  body: { ...Typography.bodySmall, lineHeight: 18 },
  badgeInfo: {
    marginTop: Spacing.xxs,
  },
  footer: {
    marginTop: Spacing.xxs,
  },
  chevron: {
    marginTop: Spacing.sm,
  },
  swipeActionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    paddingLeft: Spacing.xs,
  },
  swipeAction: {
    width: NotificationDesign.swipe.actionWidth,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radii.button,
    gap: Spacing.micro,
  },
  swipeLabel: {
    ...Typography.micro,
  },
});
