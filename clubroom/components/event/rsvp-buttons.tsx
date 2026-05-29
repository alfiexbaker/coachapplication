import { useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii } from '@/constants/theme';
import type { RSVPStatus, EventAttendee, ClubEvent } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';
import {
  CurrentRSVPStatus,
  CancelledBanner,
  ClosedBanner,
  FullBanner,
} from './rsvp-button-sections';
import { getButtonStyle, getTextColor } from './rsvp-button-helpers';
import { Row } from '@/components/primitives';

import { runAsyncFinally } from '@/utils/async-control';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RSVPButtonsProps {
  event: ClubEvent;
  currentRSVP?: EventAttendee;
  onRSVP: (status: RSVPStatus) => Promise<void>;
  disabled?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RSVPButtons({ event, currentRSVP, onRSVP, disabled = false }: RSVPButtonsProps) {
  const { colors: palette } = useTheme();

  const [loading, setLoading] = useState<RSVPStatus | null>(null);

  const isFull = eventService.isEventFull(event);
  const rsvpClosed = eventService.isRSVPClosed(event);
  const isDisabled = disabled || rsvpClosed || (isFull && currentRSVP?.status !== 'GOING');

  const handleRSVP = async (status: RSVPStatus) => {
    setLoading(status);

    await runAsyncFinally(async () => {
      await onRSVP(status);
    }, () => {
      setLoading(null);
    });
  };

  if (event.status === 'CANCELLED') return <CancelledBanner palette={palette} />;
  if (rsvpClosed) return <ClosedBanner palette={palette} />;

  const currentStatus = currentRSVP?.status;
  const buttons: {
    status: RSVPStatus;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    loadingLabel: string;
    canAlwaysChange: boolean;
  }[] = [
    {
      status: 'GOING',
      icon: 'checkmark',
      label: 'Going',
      loadingLabel: 'Saving...',
      canAlwaysChange: false,
    },
    {
      status: 'MAYBE',
      icon: 'help',
      label: 'Maybe',
      loadingLabel: 'Saving...',
      canAlwaysChange: false,
    },
    {
      status: 'NOT_GOING',
      icon: 'close',
      label: "Can't Go",
      loadingLabel: 'Saving...',
      canAlwaysChange: true,
    },
  ];

  return (
    <View style={styles.container}>
      {currentRSVP && <CurrentRSVPStatus currentRSVP={currentRSVP} palette={palette} />}
      {isFull && !currentRSVP && <FullBanner palette={palette} />}

      {/* RSVP buttons */}
      <Row style={styles.buttonRow}>
        {buttons.map(({ status, icon, label, loadingLabel, canAlwaysChange }) => {
          const btnDisabled = canAlwaysChange
            ? disabled || loading !== null
            : isDisabled || loading !== null;
          return (
            <Clickable
              key={status}
              onPress={() => handleRSVP(status)}
              disabled={btnDisabled}
              style={
                [
                  styles.rsvpButton,
                  getButtonStyle(status, currentStatus, palette),
                  btnDisabled ? styles.disabledButton : undefined,
                ].filter(Boolean) as ViewStyle[]
              }
            >
              <Ionicons
                name={icon}
                size={18}
                color={getTextColor(status, currentStatus, palette)}
              />
              <ThemedText
                style={[
                  styles.rsvpButtonText,
                  { color: getTextColor(status, currentStatus, palette) },
                ]}
              >
                {loading === status ? loadingLabel : label}
              </ThemedText>
            </Clickable>
          );
        })}
      </Row>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  buttonRow: { gap: Spacing.xs },
  rsvpButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xs + Spacing.xxs,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  rsvpButtonText: { fontSize: scaleFont(14), fontWeight: '600' },
  disabledButton: { opacity: 0.5 },
});
