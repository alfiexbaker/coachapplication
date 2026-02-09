import { useState } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import type { RSVPStatus, ClubEvent, EventRSVP } from '@/constants/types';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';
import { useTheme } from '@/hooks/useTheme';

interface RSVPButtonProps {
  event: ClubEvent;
  currentRSVP?: EventRSVP | null;
  onRSVP: (status: RSVPStatus) => Promise<void>;
  disabled?: boolean;
  compact?: boolean;
}

export function RSVPButton({
  event,
  currentRSVP,
  onRSVP,
  disabled = false,
  compact = false,
}: RSVPButtonProps) {
  const { colors: palette } = useTheme();

  const [loading, setLoading] = useState<RSVPStatus | null>(null);

  const isFull = eventService.isEventFull(event);
  const rsvpClosed = eventService.isRSVPClosed(event);
  const isDisabled = disabled || rsvpClosed || (isFull && currentRSVP?.status !== 'GOING');

  const handlePress = async (status: RSVPStatus) => {
    if (isDisabled || loading) return;

    setLoading(status);
    try {
      await onRSVP(status);
    } finally {
      setLoading(null);
    }
  };

  const getButtonStyle = (status: RSVPStatus) => {
    const isSelected = currentRSVP?.status === status;
    const color = eventService.getRSVPStatusColor(status);

    if (isSelected) {
      return {
        backgroundColor: color,
        borderColor: color,
      };
    }

    return {
      backgroundColor: 'transparent',
      borderColor: palette.border,
    };
  };

  const getTextColor = (status: RSVPStatus) => {
    const isSelected = currentRSVP?.status === status;
    return isSelected ? palette.onPrimary : palette.text;
  };

  const getIcon = (status: RSVPStatus): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'GOING':
        return 'checkmark';
      case 'MAYBE':
        return 'help';
      case 'NOT_GOING':
        return 'close';
    }
  };

  if (event.status === 'CANCELLED') {
    return (
      <View style={[styles.statusBanner, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
        <Ionicons name="close-circle" size={18} color={palette.error} />
        <ThemedText style={[styles.statusText, { color: palette.error }]}>
          Event cancelled
        </ThemedText>
      </View>
    );
  }

  if (rsvpClosed) {
    return (
      <View style={[styles.statusBanner, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
        <Ionicons name="time" size={18} color={palette.warning} />
        <ThemedText style={[styles.statusText, { color: palette.warning }]}>
          RSVP closed
        </ThemedText>
      </View>
    );
  }

  if (compact) {
    // Compact single button showing current status
    const status = currentRSVP?.status || 'GOING';
    const color = currentRSVP ? eventService.getRSVPStatusColor(currentRSVP.status) : palette.tint;

    return (
      <Clickable
        onPress={() => handlePress(status)}
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
              name={currentRSVP ? (getIcon(currentRSVP.status) as keyof typeof Ionicons.glyphMap) : 'add'}
              size={16}
              color={currentRSVP ? color : palette.onPrimary}
            />
            <ThemedText
              style={[
                styles.compactButtonText,
                { color: currentRSVP ? color : palette.onPrimary },
              ]}
            >
              {currentRSVP ? eventService.formatRSVPStatus(currentRSVP.status) : 'RSVP'}
            </ThemedText>
          </>
        )}
      </Clickable>
    );
  }

  return (
    <View style={styles.container}>
      {/* Full event warning */}
      {isFull && !currentRSVP && (
        <View style={[styles.statusBanner, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
          <Ionicons name="alert-circle" size={18} color={palette.error} />
          <ThemedText style={[styles.statusText, { color: palette.error }]}>
            Event is full
          </ThemedText>
        </View>
      )}

      {/* RSVP buttons */}
      <View style={styles.buttonRow}>
        <Clickable
          onPress={() => handlePress('GOING')}
          disabled={isDisabled || loading !== null}
          style={[
            styles.rsvpButton,
            getButtonStyle('GOING'),
            isDisabled ? styles.disabledButton : undefined,
          ].filter(Boolean) as import('react-native').ViewStyle[]}
        >
          {loading === 'GOING' ? (
            <ActivityIndicator size="small" color={getTextColor('GOING')} />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color={getTextColor('GOING')} />
              <ThemedText style={[styles.rsvpButtonText, { color: getTextColor('GOING') }]}>
                Going
              </ThemedText>
            </>
          )}
        </Clickable>

        <Clickable
          onPress={() => handlePress('MAYBE')}
          disabled={isDisabled || loading !== null}
          style={[
            styles.rsvpButton,
            getButtonStyle('MAYBE'),
            isDisabled ? styles.disabledButton : undefined,
          ].filter(Boolean) as import('react-native').ViewStyle[]}
        >
          {loading === 'MAYBE' ? (
            <ActivityIndicator size="small" color={getTextColor('MAYBE')} />
          ) : (
            <>
              <Ionicons name="help" size={18} color={getTextColor('MAYBE')} />
              <ThemedText style={[styles.rsvpButtonText, { color: getTextColor('MAYBE') }]}>
                Maybe
              </ThemedText>
            </>
          )}
        </Clickable>

        <Clickable
          onPress={() => handlePress('NOT_GOING')}
          disabled={disabled || loading !== null}
          style={[
            styles.rsvpButton,
            getButtonStyle('NOT_GOING'),
            disabled ? styles.disabledButton : undefined,
          ].filter(Boolean) as import('react-native').ViewStyle[]}
        >
          {loading === 'NOT_GOING' ? (
            <ActivityIndicator size="small" color={getTextColor('NOT_GOING')} />
          ) : (
            <>
              <Ionicons name="close" size={18} color={getTextColor('NOT_GOING')} />
              <ThemedText style={[styles.rsvpButtonText, { color: getTextColor('NOT_GOING') }]}>
                Can&apos;t Go
              </ThemedText>
            </>
          )}
        </Clickable>
      </View>

      {/* Current RSVP status display */}
      {currentRSVP && (
        <View style={styles.currentStatus}>
          <ThemedText style={[styles.currentStatusLabel, { color: palette.muted }]}>
            Your response:
          </ThemedText>
          <View style={styles.currentStatusBadge}>
            <Ionicons
              name={eventService.getRSVPStatusIcon(currentRSVP.status) as keyof typeof Ionicons.glyphMap}
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
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  rsvpButton: {
    flex: 1,
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.xs,
  },
  currentStatusLabel: {
    fontSize: scaleFont(13),
  },
  currentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  currentStatusText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: 8,
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  compactButtonText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
  },
});
