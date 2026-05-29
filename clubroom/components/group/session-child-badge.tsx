import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SessionBadgeData, SessionChildStatus } from '@/types/session-child-status';

interface SessionChildBadgeProps {
  data: SessionBadgeData;
  isSingleChild: boolean;
}

function StatusDot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

function renderPill(
  statuses: SessionChildStatus[],
  isSingleChild: boolean,
  successColor: string,
  warningColor: string,
) {
  // Group by status
  const registered = statuses.filter((s) => s.status === 'registered');
  const waitlisted = statuses.filter((s) => s.status === 'waitlisted');

  // All same status
  if (waitlisted.length === 0 && registered.length > 0) {
    const color = successColor;
    const label = isSingleChild
      ? 'Registered'
      : registered.length === 1
        ? `${registered[0].name} going`
        : `${registered.map((s) => s.name).join(' + ')} going`;
    return { color, bgColor: withAlpha(successColor, 0.08), label };
  }

  if (registered.length === 0 && waitlisted.length > 0) {
    const color = warningColor;
    const label = isSingleChild
      ? 'Waitlisted'
      : waitlisted.length === 1
        ? `${waitlisted[0].name} waitlisted`
        : `${waitlisted.map((s) => s.name).join(' + ')} waitlisted`;
    return { color, bgColor: withAlpha(warningColor, 0.08), label };
  }

  // Mixed — return null to render split pills
  return null;
}

export const SessionChildBadge = function SessionChildBadge({
  data,
  isSingleChild,
}: SessionChildBadgeProps) {
  const { colors } = useTheme();

  if (data.childStatuses.length === 0) return null;

  const successColor = colors.success;
  const warningColor = colors.warning;

  const singlePill = renderPill(data.childStatuses, isSingleChild, successColor, warningColor);

  // Build accessibility label
  const a11yParts = data.childStatuses.map((s) =>
    isSingleChild
      ? s.status === 'registered' ? 'Registered' : 'Waitlisted'
      : `${s.name} ${s.status === 'registered' ? 'going' : 'waitlisted'}`,
  );
  const accessibilityLabel = a11yParts.join(', ');

  if (singlePill) {
    return (
      <Row align="center" accessibilityLabel={accessibilityLabel}>
        <View style={[styles.pill, { backgroundColor: singlePill.bgColor }]}>
          <Row gap="xxs" align="center">
            <StatusDot color={singlePill.color} />
            <ThemedText style={[Typography.caption, { color: singlePill.color }]}>
              {singlePill.label}
            </ThemedText>
          </Row>
        </View>
      </Row>
    );
  }

  // Mixed statuses — split into separate pills
  const registered = data.childStatuses.filter((s) => s.status === 'registered');
  const waitlisted = data.childStatuses.filter((s) => s.status === 'waitlisted');

  return (
    <Row gap="xxs" align="center" accessibilityLabel={accessibilityLabel}>
      {registered.length > 0 && (
        <View style={[styles.pill, { backgroundColor: withAlpha(successColor, 0.08) }]}>
          <Row gap="xxs" align="center">
            <StatusDot color={successColor} />
            <ThemedText style={[Typography.caption, { color: successColor }]}>
              {registered.map((s) => s.name).join(' + ')} going
            </ThemedText>
          </Row>
        </View>
      )}
      {registered.length > 0 && waitlisted.length > 0 && (
        <ThemedText style={[Typography.caption, { color: colors.muted }]}>·</ThemedText>
      )}
      {waitlisted.length > 0 && (
        <View style={[styles.pill, { backgroundColor: withAlpha(warningColor, 0.08) }]}>
          <Row gap="xxs" align="center">
            <StatusDot color={warningColor} />
            <ThemedText style={[Typography.caption, { color: warningColor }]}>
              {waitlisted.map((s) => s.name).join(' + ')} waitlisted
            </ThemedText>
          </Row>
        </View>
      )}
    </Row>
  );
};

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: Radii.xs,
  },
});
