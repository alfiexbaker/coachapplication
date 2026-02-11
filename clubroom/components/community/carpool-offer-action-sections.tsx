import React, { memo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

import { styles } from './carpool-offer-styles';

interface CarpoolActionsProps {
  isOwnOffer: boolean;
  isFull: boolean;
  isActive: boolean;
  userRequestAccepted: boolean;
  hasUserRequested: boolean;
  onManageRequests?: () => void;
  onRequestSeat?: () => void;
  palette: ThemeColors;
}

export const CarpoolActions = memo(function CarpoolActions({
  isOwnOffer,
  isFull,
  isActive,
  userRequestAccepted,
  hasUserRequested,
  onManageRequests,
  onRequestSeat,
  palette,
}: CarpoolActionsProps) {
  if (isOwnOffer) {
    return (
      <View style={styles.actions}>
        <Button
          onPress={onManageRequests ?? (() => {})}
          variant="secondary"
          style={styles.actionButton}
        >
          <Row style={styles.buttonContent}>
            <Ionicons name="settings-outline" size={18} color={palette.text} />
            <ThemedText style={styles.buttonText}>Manage Requests</ThemedText>
          </Row>
        </Button>
      </View>
    );
  }

  if (userRequestAccepted) {
    return (
      <View style={styles.actions}>
        <Row
          style={[styles.confirmedBanner, { backgroundColor: withAlpha(palette.success, 0.09) }]}
        >
          <Ionicons name="checkmark-circle" size={20} color={palette.success} />
          <ThemedText style={[styles.confirmedText, { color: palette.success }]}>
            Your seat is confirmed!
          </ThemedText>
        </Row>
      </View>
    );
  }

  if (hasUserRequested) {
    return (
      <View style={styles.actions}>
        <Row style={[styles.pendingBanner, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
          <Ionicons name="hourglass-outline" size={20} color={palette.warning} />
          <ThemedText style={[styles.pendingBannerText, { color: palette.warning }]}>
            Request pending
          </ThemedText>
        </Row>
      </View>
    );
  }

  if (!isFull && isActive) {
    return (
      <View style={styles.actions}>
        <Button onPress={onRequestSeat ?? (() => {})} style={styles.actionButton}>
          Request Seat
        </Button>
      </View>
    );
  }

  return null;
});
