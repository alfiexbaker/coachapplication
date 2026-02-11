import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { CoachProfile } from '@/constants/types';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';
import { formatDistance } from '@/utils/format';
import { Row } from '@/components/primitives';

interface MapPreviewProps {
  coaches: CoachProfile[];
  selectedCoachId?: string;
  onCoachFocus?: (coachId: string) => void;
}

export function MapPreview({ coaches, selectedCoachId, onCoachFocus }: MapPreviewProps) {
  const { colors: palette, scheme } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });

  const bounds = useMemo(() => {
    const lats = coaches.map((coach) => coach.location.lat);
    const lngs = coaches.map((coach) => coach.location.lng);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [coaches]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize({ width, height });
  };

  const latRange = Math.max(bounds.maxLat - bounds.minLat, 0.001);
  const lngRange = Math.max(bounds.maxLng - bounds.minLng, 0.001);

  const selectedCoach = coaches.find((coach) => coach.id === selectedCoachId);

  return (
    <SurfaceCard style={styles.wrapper}>
      <Row style={styles.mapHeader}>
        <ThemedText type="defaultSemiBold">Live map preview</ThemedText>
        <Clickable style={[styles.searchPill, { backgroundColor: palette.tint }]}>
          <ThemedText style={[Typography.sm, styles.searchLabel, { color: palette.onPrimary }]}>
            Search this area
          </ThemedText>
        </Clickable>
      </Row>
      <View style={styles.mapContainer}>
        <View
          style={[styles.map, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
          onLayout={handleLayout}
        >
          {coaches.map((coach) => {
            if (!size.width || !size.height) {
              return null;
            }
            const normalizedLat = 1 - (coach.location.lat - bounds.minLat) / latRange;
            const normalizedLng = (coach.location.lng - bounds.minLng) / lngRange;
            return (
              <Clickable
                key={coach.id}
                accessibilityHint="Center map on coach"
                style={[
                  styles.pin,
                  {
                    left: normalizedLng * size.width,
                    top: normalizedLat * size.height,
                    backgroundColor:
                      coach.id === selectedCoachId
                        ? palette.tint
                        : withAlpha(palette.surface, 0.95),
                  },
                ]}
                onPress={() => onCoachFocus?.(coach.id)}
              >
                <Ionicons
                  name={coach.id === selectedCoachId ? 'person' : 'location'}
                  size={coach.id === selectedCoachId ? 16 : 14}
                  color={coach.id === selectedCoachId ? palette.onPrimary : palette.tint}
                />
              </Clickable>
            );
          })}
        </View>
      </View>
      {selectedCoach ? (
        <View
          style={[
            styles.detailTray,
            {
              backgroundColor: withAlpha(palette.surface, scheme === 'dark' ? 0.85 : 0.9),
            },
          ]}
        >
          <ThemedText type="defaultSemiBold">{selectedCoach.fullName}</ThemedText>
          <ThemedText style={styles.detailMeta}>
            {selectedCoach.city}, {selectedCoach.state} ·{' '}
            {formatDistance(selectedCoach.distanceMiles)}
          </ThemedText>
        </View>
      ) : null}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    gap: Spacing.md,
  },
  mapHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapContainer: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
  },
  map: {
    height: 260,
    borderRadius: Radii.lg,
  },
  pin: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: Radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchPill: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  searchLabel: {
    fontWeight: '600',
  },
  detailTray: {
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  detailMeta: {
    opacity: 0.8,
  },
});
