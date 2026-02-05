import { useState } from 'react';
import { StyleSheet, View, TextInput, Modal, Pressable, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { RSVPStatus, EventAttendee, ClubEvent } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';

interface RSVPButtonsProps {
  event: ClubEvent;
  currentRSVP?: EventAttendee;
  onRSVP: (status: RSVPStatus, guestCount: number) => Promise<void>;
  disabled?: boolean;
}

export function RSVPButtons({ event, currentRSVP, onRSVP, disabled = false }: RSVPButtonsProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [loading, setLoading] = useState<RSVPStatus | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<RSVPStatus | null>(null);
  const [guestCount, setGuestCount] = useState('0');

  const isFull = eventService.isEventFull(event);
  const rsvpClosed = eventService.isRSVPClosed(event);
  const isDisabled = disabled || rsvpClosed || (isFull && currentRSVP?.status !== 'GOING');

  const handleRSVP = async (status: RSVPStatus) => {
    if (status === 'GOING' && !currentRSVP) {
      // Show guest modal for new GOING responses
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

  const getButtonStyle = (status: RSVPStatus) => {
    const isSelected = currentRSVP?.status === status;

    if (isSelected) {
      switch (status) {
        case 'GOING':
          return {
            backgroundColor: palette.success,
            borderColor: palette.success,
          };
        case 'MAYBE':
          return {
            backgroundColor: palette.warning,
            borderColor: palette.warning,
          };
        case 'NOT_GOING':
          return {
            backgroundColor: palette.error,
            borderColor: palette.error,
          };
      }
    }

    return {
      backgroundColor: 'transparent',
      borderColor: palette.border,
    };
  };

  const getTextColor = (status: RSVPStatus) => {
    const isSelected = currentRSVP?.status === status;
    return isSelected ? '#FFFFFF' : palette.text;
  };

  const getIcon = (status: RSVPStatus) => {
    switch (status) {
      case 'GOING':
        return 'checkmark-circle';
      case 'MAYBE':
        return 'help-circle';
      case 'NOT_GOING':
        return 'close-circle';
    }
  };

  if (event.status === 'CANCELLED') {
    return (
      <View style={[styles.cancelledBanner, { backgroundColor: `${palette.error}15` }]}>
        <Ionicons name="close-circle" size={20} color={palette.error} />
        <ThemedText style={[styles.cancelledText, { color: palette.error }]}>
          This event has been cancelled
        </ThemedText>
      </View>
    );
  }

  if (rsvpClosed) {
    return (
      <View style={[styles.closedBanner, { backgroundColor: `${palette.warning}15` }]}>
        <Ionicons name="time" size={20} color={palette.warning} />
        <ThemedText style={[styles.closedText, { color: palette.warning }]}>
          RSVP deadline has passed
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Current RSVP status */}
      {currentRSVP && (
        <View style={styles.currentStatus}>
          <ThemedText style={[styles.currentStatusLabel, { color: palette.muted }]}>
            Your response:
          </ThemedText>
          <View style={styles.currentStatusBadge}>
            <Ionicons
              name={getIcon(currentRSVP.status)}
              size={16}
              color={
                currentRSVP.status === 'GOING'
                  ? palette.success
                  : currentRSVP.status === 'MAYBE'
                    ? palette.warning
                    : palette.error
              }
            />
            <ThemedText
              style={[
                styles.currentStatusText,
                {
                  color:
                    currentRSVP.status === 'GOING'
                      ? palette.success
                      : currentRSVP.status === 'MAYBE'
                        ? palette.warning
                        : palette.error,
                },
              ]}
            >
              {currentRSVP.status === 'GOING'
                ? 'Going'
                : currentRSVP.status === 'MAYBE'
                  ? 'Maybe'
                  : 'Not Going'}
              {currentRSVP.guestCount > 0 && ` (+${currentRSVP.guestCount} guests)`}
            </ThemedText>
          </View>
        </View>
      )}

      {/* Full event warning */}
      {isFull && !currentRSVP && (
        <View style={[styles.fullBanner, { backgroundColor: `${palette.error}15` }]}>
          <Ionicons name="alert-circle" size={20} color={palette.error} />
          <ThemedText style={[styles.fullText, { color: palette.error }]}>
            This event is at full capacity
          </ThemedText>
        </View>
      )}

      {/* RSVP buttons */}
      <View style={styles.buttonRow}>
        <Clickable
          onPress={() => handleRSVP('GOING')}
          disabled={isDisabled || loading !== null}
          style={[
            styles.rsvpButton,
            getButtonStyle('GOING'),
            isDisabled ? styles.disabledButton : undefined,
          ].filter(Boolean) as ViewStyle[]}
        >
          <Ionicons name="checkmark" size={18} color={getTextColor('GOING')} />
          <ThemedText style={[styles.rsvpButtonText, { color: getTextColor('GOING') }]}>
            {loading === 'GOING' ? 'Saving...' : 'Going'}
          </ThemedText>
        </Clickable>

        <Clickable
          onPress={() => handleRSVP('MAYBE')}
          disabled={isDisabled || loading !== null}
          style={[
            styles.rsvpButton,
            getButtonStyle('MAYBE'),
            isDisabled ? styles.disabledButton : undefined,
          ].filter(Boolean) as ViewStyle[]}
        >
          <Ionicons name="help" size={18} color={getTextColor('MAYBE')} />
          <ThemedText style={[styles.rsvpButtonText, { color: getTextColor('MAYBE') }]}>
            {loading === 'MAYBE' ? 'Saving...' : 'Maybe'}
          </ThemedText>
        </Clickable>

        <Clickable
          onPress={() => handleRSVP('NOT_GOING')}
          disabled={disabled || loading !== null}
          style={[
            styles.rsvpButton,
            getButtonStyle('NOT_GOING'),
            disabled ? styles.disabledButton : undefined,
          ].filter(Boolean) as ViewStyle[]}
        >
          <Ionicons name="close" size={18} color={getTextColor('NOT_GOING')} />
          <ThemedText style={[styles.rsvpButtonText, { color: getTextColor('NOT_GOING') }]}>
            {loading === 'NOT_GOING' ? 'Saving...' : "Can't Go"}
          </ThemedText>
        </Clickable>
      </View>

      {/* Guest count modal */}
      <Modal
        visible={showGuestModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGuestModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowGuestModal(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: palette.surface }]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              How many guests?
            </ThemedText>
            <ThemedText style={[styles.modalSubtitle, { color: palette.muted }]}>
              Including yourself, how many people are coming?
            </ThemedText>

            <View style={styles.guestCounter}>
              <Clickable
                onPress={() =>
                  setGuestCount((prev) => Math.max(0, parseInt(prev, 10) - 1).toString())
                }
                style={[styles.counterButton, { borderColor: palette.border }]}
              >
                <Ionicons name="remove" size={24} color={palette.text} />
              </Clickable>

              <TextInput
                style={[styles.guestInput, { color: palette.text, borderColor: palette.border }]}
                value={guestCount}
                onChangeText={setGuestCount}
                keyboardType="number-pad"
                textAlign="center"
              />

              <Clickable
                onPress={() => setGuestCount((prev) => (parseInt(prev, 10) + 1).toString())}
                style={[styles.counterButton, { borderColor: palette.border }]}
              >
                <Ionicons name="add" size={24} color={palette.text} />
              </Clickable>
            </View>

            <ThemedText style={[styles.guestHint, { color: palette.muted }]}>
              Additional guests (not including yourself)
            </ThemedText>

            <View style={styles.modalButtons}>
              <Button
                variant="outline"
                onPress={() => setShowGuestModal(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button onPress={handleGuestSubmit} style={styles.modalButton}>
                Confirm
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  currentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  currentStatusLabel: {
    fontSize: scaleFont(13),
  },
  currentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentStatusText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
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
    gap: 6,
    paddingVertical: 12,
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
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  cancelledText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  closedText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  fullBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  fullText: {
    fontSize: scaleFont(14),
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalTitle: {
    textAlign: 'center',
  },
  modalSubtitle: {
    textAlign: 'center',
    fontSize: scaleFont(14),
  },
  guestCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  counterButton: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestInput: {
    width: 80,
    height: 48,
    borderRadius: Radii.md,
    borderWidth: 1,
    fontSize: scaleFont(24),
    fontWeight: '700',
  },
  guestHint: {
    textAlign: 'center',
    fontSize: scaleFont(12),
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
