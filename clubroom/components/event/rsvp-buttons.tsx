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
  getButtonStyle,
  getTextColor,
  CurrentRSVPStatus,
  CancelledBanner,
  ClosedBanner,
  FullBanner,
  GuestCountModal,
} from './rsvp-button-sections';

// ─── Types ──────────────────────────────────────────────────────────────────

interface RSVPButtonsProps {
  event: ClubEvent;
  currentRSVP?: EventAttendee;
  onRSVP: (status: RSVPStatus, guestCount: number) => Promise<void>;
  disabled?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function RSVPButtons({ event, currentRSVP, onRSVP, disabled = false }: RSVPButtonsProps) {
  const { colors: palette } = useTheme();

  const [loading, setLoading] = useState<RSVPStatus | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<RSVPStatus | null>(null);
  const [guestCount, setGuestCount] = useState('0');

  const isFull = eventService.isEventFull(event);
  const rsvpClosed = eventService.isRSVPClosed(event);
  const isDisabled = disabled || rsvpClosed || (isFull && currentRSVP?.status !== 'GOING');

  const handleRSVP = async (status: RSVPStatus) => {
    if (status === 'GOING' && !currentRSVP) {
      setSelectedStatus(status);
      setShowGuestModal(true);
      return;
    }

    setLoading(status);
    try {
      await onRSVP(status, currentRSVP?.guestCount || 0);
    } finally {
      setLoading(null);
    }
  };

  const handleGuestSubmit = async () => {
    if (!selectedStatus) return;

    setShowGuestModal(false);
    setLoading(selectedStatus);
    try {
      await onRSVP(selectedStatus, parseInt(guestCount, 10) || 0);
    } finally {
      setLoading(null);
      setGuestCount('0');
      setSelectedStatus(null);
    }
  };

  if (event.status === 'CANCELLED') return <CancelledBanner palette={palette} />;
  if (rsvpClosed) return <ClosedBanner palette={palette} />;

  const currentStatus = currentRSVP?.status;
  const buttons: { status: RSVPStatus; icon: keyof typeof Ionicons.glyphMap; label: string; loadingLabel: string; canAlwaysChange: boolean }[] = [
    { status: 'GOING', icon: 'checkmark', label: 'Going', loadingLabel: 'Saving...', canAlwaysChange: false },
    { status: 'MAYBE', icon: 'help', label: 'Maybe', loadingLabel: 'Saving...', canAlwaysChange: false },
    { status: 'NOT_GOING', icon: 'close', label: "Can't Go", loadingLabel: 'Saving...', canAlwaysChange: true },
  ];

  return (
    <View style={styles.container}>
      {currentRSVP && <CurrentRSVPStatus currentRSVP={currentRSVP} palette={palette} />}
      {isFull && !currentRSVP && <FullBanner palette={palette} />}

      {/* RSVP buttons */}
      <View style={styles.buttonRow}>
        {buttons.map(({ status, icon, label, loadingLabel, canAlwaysChange }) => {
          const btnDisabled = canAlwaysChange ? (disabled || loading !== null) : (isDisabled || loading !== null);
          return (
            <Clickable
              key={status}
              onPress={() => handleRSVP(status)}
              disabled={btnDisabled}
              style={[styles.rsvpButton, getButtonStyle(status, currentStatus, palette), btnDisabled ? styles.disabledButton : undefined].filter(Boolean) as ViewStyle[]}
            >
              <Ionicons name={icon} size={18} color={getTextColor(status, currentStatus, palette)} />
              <ThemedText style={[styles.rsvpButtonText, { color: getTextColor(status, currentStatus, palette) }]}>
                {loading === status ? loadingLabel : label}
              </ThemedText>
            </Clickable>
          );
        })}
      </View>

      <GuestCountModal
        visible={showGuestModal}
        guestCount={guestCount}
        onGuestCountChange={setGuestCount}
        onSubmit={handleGuestSubmit}
        onClose={() => setShowGuestModal(false)}
        palette={palette}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  buttonRow: { flexDirection: 'row', gap: Spacing.xs },
  rsvpButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs, paddingVertical: Spacing.xs + Spacing.xxs, borderRadius: Radii.md, borderWidth: 1.5 },
  rsvpButtonText: { fontSize: scaleFont(14), fontWeight: '600' },
  disabledButton: { opacity: 0.5 },
});
