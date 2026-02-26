import { memo } from 'react';
import { StyleSheet, TextInput, Modal, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import type { RSVPStatus, EventAttendee } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';
import { Row } from '@/components/primitives';

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── CurrentRSVPStatus ──────────────────────────────────────────────────────

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
          {currentRSVP.guestCount > 0 && ` (+${currentRSVP.guestCount} guests)`}
        </ThemedText>
      </Row>
    </Row>
  );
});

// ─── Status Banners ─────────────────────────────────────────────────────────

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

// ─── GuestCountModal ────────────────────────────────────────────────────────

type GuestCountModalProps = {
  visible: boolean;
  guestCount: string;
  onGuestCountChange: (count: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  palette: ThemeColors;
};

export const GuestCountModal = memo(function GuestCountModal({
  visible,
  guestCount,
  onGuestCountChange,
  onSubmit,
  onClose,
  palette,
}: GuestCountModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Clickable
        style={[styles.modalOverlay, { backgroundColor: withAlpha(palette.text, 0.5) }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close guest count modal"
      >
        <View
          style={[styles.modalContent, { backgroundColor: palette.surface }]}
          onStartShouldSetResponder={() => true}
        >
          <ThemedText type="subtitle" style={styles.modalTitle}>
            How many guests?
          </ThemedText>
          <ThemedText style={[styles.modalSubtitle, { color: palette.muted }]}>
            Including yourself, how many people are coming?
          </ThemedText>

          <Row style={styles.guestCounter}>
            <Clickable
              accessibilityLabel="Decrease guest count"
              onPress={() =>
                onGuestCountChange(Math.max(0, parseInt(guestCount, 10) - 1).toString())
              }
              style={[styles.counterButton, { borderColor: palette.border }]}
            >
              <Ionicons name="remove" size={24} color={palette.text} />
            </Clickable>

            <TextInput
              style={[styles.guestInput, { color: palette.text, borderColor: palette.border }]}
              value={guestCount}
              onChangeText={onGuestCountChange}
              keyboardType="number-pad"
              textAlign="center"

            maxLength={10}
          />

            <Clickable
              accessibilityLabel="Increase guest count"
              onPress={() => onGuestCountChange((parseInt(guestCount, 10) + 1).toString())}
              style={[styles.counterButton, { borderColor: palette.border }]}
            >
              <Ionicons name="add" size={24} color={palette.text} />
            </Clickable>
          </Row>

          <ThemedText style={[styles.guestHint, { color: palette.muted }]}>
            Additional guests (not including yourself)
          </ThemedText>

          <Row style={styles.modalButtons}>
            <Button variant="outline" onPress={onClose} style={styles.modalButton}>
              Cancel
            </Button>
            <Button onPress={onSubmit} style={styles.modalButton}>
              Confirm
            </Button>
          </Row>
        </View>
      </Clickable>
    </Modal>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

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
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  modalTitle: { textAlign: 'center' },
  modalSubtitle: { textAlign: 'center', fontSize: scaleFont(14) },
  guestCounter: { alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
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
  guestHint: { textAlign: 'center', fontSize: scaleFont(12) },
  modalButtons: { gap: Spacing.sm, marginTop: Spacing.sm },
  modalButton: { flex: 1 },
});
