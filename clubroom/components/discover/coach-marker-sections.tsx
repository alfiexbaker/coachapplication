import { StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ─── ClusterMarker ──────────────────────────────────────────────

export interface ClusterMarkerProps {
  count: number;
  onPress?: () => void;
}

export function ClusterMarker({ count, onPress }: ClusterMarkerProps) {
  const { colors: palette } = useTheme();

  return (
    <Clickable
      accessibilityLabel={`${count} coaches in this area`}
      onPress={onPress}
      style={[
        styles.cluster,
        {
          backgroundColor: palette.tint,
        },
      ]}
    >
      <ThemedText style={[styles.clusterText, { color: palette.onPrimary }]}>
        {count}
      </ThemedText>
    </Clickable>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cluster: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  clusterText: { ...Typography.bodySemiBold },
});
