import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface DeadlineBadgeProps {
  /** ISO date string of the RSVP deadline. */
  deadline: string;
  /** Compact mode — smaller text, no icon. */
  compact?: boolean;
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return 'Closed';

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 0) return `${days}d ${remainingHours}h left`;
  if (hours > 0) return `${hours}h left`;

  const minutes = Math.floor(ms / (1000 * 60));
  return `${minutes}m left`;
}

function DeadlineBadgeComponent({ deadline, compact = false }: DeadlineBadgeProps) {
  const { colors } = useTheme();

  const { timeLeft, urgencyColor, isClosed } = (() => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const ms = deadlineDate.getTime() - now.getTime();
    const hours = ms / (1000 * 60 * 60);

    let color: string;
    if (ms <= 0) {
      color = colors.muted;
    } else if (hours > 48) {
      color = colors.success;
    } else if (hours > 24) {
      color = colors.warning;
    } else {
      color = colors.error;
    }

    return {
      timeLeft: formatTimeLeft(ms),
      urgencyColor: color,
      isClosed: ms <= 0,
    };
  })();

  return (
    <Row
      align="center"
      gap="xxs"
      accessibilityLabel={`Deadline: ${timeLeft}`}
      style={[
        compact ? styles.badgeCompact : styles.badge,
        { backgroundColor: withAlpha(urgencyColor, 0.09) },
      ]}
    >
      {!compact && (
        <Ionicons
          name={isClosed ? 'lock-closed' : 'time-outline'}
          size={12}
          color={urgencyColor}
        />
      )}
      <ThemedText
        style={[compact ? Typography.micro : Typography.caption, { color: urgencyColor }]}
        numberOfLines={1}
      >
        {timeLeft}
      </ThemedText>
    </Row>
  );
}

export const DeadlineBadge = DeadlineBadgeComponent;

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  badgeCompact: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.xs,
  },
});
