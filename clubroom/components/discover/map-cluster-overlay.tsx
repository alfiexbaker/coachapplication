import { memo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { CoachCard, type CoachCardData } from '@/components/coach';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CoachProfile } from '@/constants/types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Cluster {
  coaches: CoachProfile[];
  lat: number;
  lng: number;
}

interface MapClusterOverlayProps {
  cluster: Cluster;
  onClose: () => void;
  onCoachPress: (coach: CoachProfile) => void;
  toCoachCardData: (coach: CoachProfile) => CoachCardData;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const MapClusterOverlay = memo(function MapClusterOverlay({
  cluster,
  onClose,
  onCoachPress,
  toCoachCardData,
}: MapClusterOverlayProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={[styles.clusterOverlay, { backgroundColor: withAlpha(palette.text, 0.5) }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <SurfaceCard style={styles.clusterCard}>
        <View style={styles.clusterHeader}>
          <ThemedText type="defaultSemiBold">
            {cluster.coaches.length} Coaches
          </ThemedText>
          <Clickable accessibilityLabel="Close" onPress={onClose}>
            <Ionicons name="close" size={24} color={palette.text} />
          </Clickable>
        </View>
        <ScrollView style={styles.clusterList}>
          {cluster.coaches.map((coach) => (
            <CoachCard
              key={coach.id}
              coach={toCoachCardData(coach)}
              variant="compact"
              onPress={() => {
                onClose();
                onCoachPress(coach);
              }}
            />
          ))}
        </ScrollView>
      </SurfaceCard>
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  clusterOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  clusterCard: {
    width: '100%',
    maxHeight: '70%',
  },
  clusterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  clusterList: {
    flex: 1,
  },
});
