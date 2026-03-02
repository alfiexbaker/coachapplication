import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import type { RSVPStatus, EventAttendee } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';
import { Row } from '@/components/primitives';

export function getButtonStyle(
  status: RSVPStatus,
  currentStatus: RSVPStatus | undefined,
  palette: ThemeColors,
) {
  if (currentStatus === status) {
    switch (status) {
      case 'GOING':
        return { backgroundColor: palette.success, borderColor: palette.success };
      case 'MAYBE':
        return { backgroundColor: palette.warning, borderColor: palette.warning };
      case 'NOT_GOING':
        return { backgroundColor: palette.error, borderColor: palette.error };
    }
  }
  return { backgroundColor: 'transparent' as const, borderColor: palette.border };
}

export function getTextColor(
  status: RSVPStatus,
  currentStatus: RSVPStatus | undefined,
  palette: ThemeColors,
): string {
  return currentStatus === status ? palette.onPrimary : palette.text;
}

export function getIcon(status: RSVPStatus): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case 'GOING':
      return 'checkmark-circle';
    case 'MAYBE':
      return 'help-circle';
    case 'NOT_GOING':
      return 'close-circle';
  }
}

type CurrentRSVPStatusProps = {
  currentRSVP: EventAttendee;
  palette: ThemeColors;
};

export const CurrentRSVPStatus = memo(function CurrentRSVPStatus({
  currentRSVP,
  palette,
}: CurrentRSVPStatusProps) {
  const statusColor =
    currentRSVP.status === 'GOING'
      ? palette.success
      : currentRSVP.status === 'MAYBE'
        ? palette.warning
        : palette.error;
  const statusLabel =
    currentRSVP.status === 'GOING'
      ? 'Going'
      : currentRSVP.status === 'MAYBE'
        ? 'Maybe'
        : 'Not Going';

  return (
    <Row style={[styles.currentStatus, { borderBottomColor: palette.border }]}>
      <ThemedText style={[styles.currentStatusLabel, { color: palette.muted }]}>
        Your response:
      </ThemedText>
      <Row style={styles.currentStatusBadge}>
        <Ionicons name={getIcon(currentRSVP.status)} size={16} color={statusColor} />
        <ThemedText style={[styles.currentStatusText, { color: statusColor }]}>
          {statusLabel}
        </ThemedText>
      </Row>
    </Row>
  );
});

export const CancelledBanner = memo(function CancelledBanner({
  palette,
}: {
  palette: ThemeColors;
}) {
  return (
    <Row style={[styles.banner, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
      <Ionicons name="close-circle" size={20} color={palette.error} />
      <ThemedText style={[styles.bannerText, { color: palette.error }]}>
        This event has been cancelled
      </ThemedText>
    </Row>
  );
});

export const ClosedBanner = memo(function ClosedBanner({ palette }: { palette: ThemeColors }) {
  return (
    <Row style={[styles.banner, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
      <Ionicons name="time" size={20} color={palette.warning} />
      <ThemedText style={[styles.bannerText, { color: palette.warning }]}>
        RSVP deadline has passed
      </ThemedText>
    </Row>
  );
});

export const FullBanner = memo(function FullBanner({ palette }: { palette: ThemeColors }) {
  return (
    <Row style={[styles.banner, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
      <Ionicons name="alert-circle" size={20} color={palette.error} />
      <ThemedText style={[styles.fullText, { color: palette.error }]}>
        This event is at full capacity
      </ThemedText>
    </Row>
  );
});

const styles = StyleSheet.create({
  currentStatus: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  currentStatusLabel: { fontSize: scaleFont(13) },
  currentStatusBadge: { alignItems: 'center', gap: Spacing.xxs },
  currentStatusText: { fontSize: scaleFont(14), fontWeight: '600' },
  banner: { alignItems: 'center', gap: Spacing.xs, padding: Spacing.sm, borderRadius: Radii.md },
  bannerText: { fontSize: scaleFont(14), fontWeight: '600' },
  fullText: { fontSize: scaleFont(14), fontWeight: '500' },
});
