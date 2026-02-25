import { memo } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import type { RSVPStatus, EventRSVP } from '@/constants/types';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
export function getButtonStyle(
  status: RSVPStatus,
  currentRSVP: EventRSVP | null | undefined,
  palette: ThemeColors,
) {
  const isSelected = currentRSVP?.status === status;
  const color = eventService.getRSVPStatusColor(status);
  if (isSelected) {
    return { backgroundColor: color, borderColor: color };
  }
  return { backgroundColor: 'transparent', borderColor: palette.border };
}
export function getTextColor(
  status: RSVPStatus,
  currentRSVP: EventRSVP | null | undefined,
  palette: ThemeColors,
): string {
  const isSelected = currentRSVP?.status === status;
  return isSelected ? palette.onPrimary : palette.text;
}
export function getIcon(status: RSVPStatus): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case 'GOING':
      return 'checkmark';
    case 'MAYBE':
      return 'help';
    case 'NOT_GOING':
      return 'close';
  }
}
interface RSVPStatusBannerProps {
  variant: 'cancelled' | 'closed' | 'full';
  palette: ThemeColors;
}
export const RSVPStatusBanner = memo(function RSVPStatusBanner({
  variant,
  palette,
}: RSVPStatusBannerProps) {
  const config = {
    cancelled: { icon: 'close-circle' as const, color: palette.error, label: 'Event cancelled' },
    closed: { icon: 'time' as const, color: palette.warning, label: 'RSVP closed' },
    full: { icon: 'alert-circle' as const, color: palette.error, label: 'Event is full' },
  }[variant];
  return (
    <Row style={[styles.statusBanner, { backgroundColor: withAlpha(config.color, 0.09) }]}>
      <Ionicons name={config.icon} size={18} color={config.color} />
      <ThemedText style={[styles.statusText, { color: config.color }]}>{config.label}</ThemedText>
    </Row>
  );
});
interface CompactRSVPButtonProps {
  currentRSVP: EventRSVP | null | undefined;
  loading: RSVPStatus | null;
  isDisabled: boolean;
  onPress: (status: RSVPStatus) => void;
  palette: ThemeColors;
}
export const CompactRSVPButton = memo(function CompactRSVPButton({
  currentRSVP,
  loading,
  isDisabled,
  onPress,
  palette,
}: CompactRSVPButtonProps) {
  const status = currentRSVP?.status || 'GOING';
  const color = currentRSVP ? eventService.getRSVPStatusColor(currentRSVP.status) : palette.tint;
  return (
    <Clickable
      onPress={() => onPress(status)}
      disabled={isDisabled || loading !== null}
      style={[
        styles.compactButton,
        {
          backgroundColor: currentRSVP ? withAlpha(color, 0.09) : palette.tint,
          borderColor: currentRSVP ? color : palette.tint,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={currentRSVP ? color : palette.onPrimary} />
      ) : (
        <>
          <Ionicons
            name={currentRSVP ? getIcon(currentRSVP.status) : 'add'}
            size={16}
            color={currentRSVP ? color : palette.onPrimary}
          />
          <ThemedText
            style={[styles.compactButtonText, { color: currentRSVP ? color : palette.onPrimary }]}
          >
            {currentRSVP ? eventService.formatRSVPStatus(currentRSVP.status) : 'RSVP'}
          </ThemedText>
        </>
      )}
    </Clickable>
  );
});
interface FullRSVPButtonRowProps {
  currentRSVP: EventRSVP | null | undefined;
  loading: RSVPStatus | null;
  isDisabled: boolean;
  disabled: boolean;
  onPress: (status: RSVPStatus) => void;
  palette: ThemeColors;
}
export const FullRSVPButtonRow = memo(function FullRSVPButtonRow({
  currentRSVP,
  loading,
  isDisabled,
  disabled,
  onPress,
  palette,
}: FullRSVPButtonRowProps) {
  const statuses: { status: RSVPStatus; label: string; useRawDisabled?: boolean }[] = [
    { status: 'GOING', label: 'Going' },
    { status: 'MAYBE', label: 'Maybe' },
    { status: 'NOT_GOING', label: "Can't Go", useRawDisabled: true },
  ];
  return (
    <Row style={styles.buttonRow}>
      {statuses.map((s) => {
        const btnDisabled = s.useRawDisabled ? disabled : isDisabled;
        const textColor = getTextColor(s.status, currentRSVP, palette);
        return (
          <Clickable
            key={s.status}
            onPress={() => onPress(s.status)}
            disabled={btnDisabled || loading !== null}
            style={
              [
                styles.rsvpButton,
                getButtonStyle(s.status, currentRSVP, palette),
                btnDisabled ? styles.disabledButton : undefined,
              ].filter(Boolean) as import('react-native').ViewStyle[]
            }
          >
            {loading === s.status ? (
              <ActivityIndicator size="small" color={textColor} />
            ) : (
              <>
                <Ionicons name={getIcon(s.status)} size={18} color={textColor} />
                <ThemedText style={[styles.rsvpButtonText, { color: textColor }]}>
                  {s.label}
                </ThemedText>
              </>
            )}
          </Clickable>
        );
      })}
    </Row>
  );
});
interface CurrentRSVPStatusProps {
  currentRSVP: EventRSVP;
  palette: ThemeColors;
}
export const CurrentRSVPStatus = memo(function CurrentRSVPStatus({
  currentRSVP,
  palette,
}: CurrentRSVPStatusProps) {
  return (
    <Row style={styles.currentStatus}>
      <ThemedText style={[styles.currentStatusLabel, { color: palette.muted }]}>
        Your response:
      </ThemedText>
      <Row style={styles.currentStatusBadge}>
        <Ionicons
          name={
            eventService.getRSVPStatusIcon(currentRSVP.status) as keyof typeof Ionicons.glyphMap
          }
          size={14}
          color={eventService.getRSVPStatusColor(currentRSVP.status)}
        />
        <ThemedText
          style={[
            styles.currentStatusText,
            { color: eventService.getRSVPStatusColor(currentRSVP.status) },
          ]}
        >
          {eventService.formatRSVPStatus(currentRSVP.status)}
          {currentRSVP.guestCount > 0 && ` (+${currentRSVP.guestCount} guests)`}
        </ThemedText>
      </Row>
    </Row>
  );
});
export const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  buttonRow: {
    gap: Spacing.xs,
  },
  rsvpButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xs + Spacing.xxs,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  rsvpButtonText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  statusBanner: {
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  statusText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  currentStatus: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
  },
  currentStatusLabel: {
    fontSize: scaleFont(13),
  },
  currentStatusBadge: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  currentStatusText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
  },
  compactButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  compactButtonText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
  },
});
