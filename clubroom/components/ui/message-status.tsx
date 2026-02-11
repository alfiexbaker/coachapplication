/**
 * MessageStatus — WhatsApp-style message delivery/read status indicator.
 *
 * Shows a clock for pending, single check for sent, double check (muted)
 * for delivered, and double check (blue/tint) for seen.
 */

import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';
import { useTheme } from '@/hooks/useTheme';

interface MessageStatusProps {
  status: 'sent' | 'delivered' | 'seen' | 'pending';
}

const ICON_SIZE = 14;

export function MessageStatus({ status }: MessageStatusProps) {
  const { colors: palette } = useTheme();

  if (status === 'pending') {
    return (
      <View style={styles.container}>
        <Ionicons name="time-outline" size={ICON_SIZE} color={palette.muted} />
      </View>
    );
  }

  if (status === 'sent') {
    return (
      <View style={styles.container}>
        <Ionicons name="checkmark" size={ICON_SIZE} color={palette.muted} />
      </View>
    );
  }

  // delivered = double check (muted), seen = double check (tint/blue)
  const checkColor = status === 'seen' ? palette.info : palette.muted;

  return (
    <Row align="center" style={styles.doubleCheckContainer}>
      <Ionicons name="checkmark" size={ICON_SIZE} color={checkColor} style={styles.checkFirst} />
      <Ionicons name="checkmark" size={ICON_SIZE} color={checkColor} style={styles.checkSecond} />
    </Row>
  );
}

const styles = StyleSheet.create({
  container: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doubleCheckContainer: {
    width: ICON_SIZE + 6,
    height: ICON_SIZE,
  },
  checkFirst: {
    position: 'absolute',
    left: 0,
  },
  checkSecond: {
    position: 'absolute',
    left: 6,
  },
});
