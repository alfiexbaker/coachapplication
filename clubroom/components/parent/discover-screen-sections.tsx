import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { type ChildProfile } from '@/services/child-service';
import { type CoachProfile } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

import { styles } from './discover-screen-styles';

export type ChildOption = { id: string; name: string };

export type CoachOption = {
  id: string;
  name: string;
  avatar?: string;
  distance: number;
  profile: {
    rating?: number;
    sessionRate?: number;
    specialties?: string[];
  };
};

export const formatChildName = (child: ChildProfile) =>
  child.nickname || `${child.firstName} ${child.lastName}`.trim();

export const mapCoachOption = (coach: CoachProfile): CoachOption => ({
  id: coach.id,
  name: coach.fullName,
  avatar: coach.profilePhotoUrl,
  distance: coach.distanceMiles,
  profile: {
    rating: coach.rating.average,
    sessionRate: coach.sessionRate ?? coach.priceRange.min,
    specialties: coach.footballFocuses,
  },
});

interface DiscoverEmptyStateProps {
  childrenCount: number;
  postcode: string;
  selectedChildName?: string;
  nearbyCoachCount: number;
  palette: ThemeColors;
}

export function DiscoverEmptyState({
  childrenCount,
  postcode,
  selectedChildName,
  nearbyCoachCount,
  palette,
}: DiscoverEmptyStateProps) {
  if (childrenCount === 0) {
    return (
      <View style={styles.emptyState}>
        <ThemedText type="subtitle" style={styles.emptyTitle}>
          No children added
        </ThemedText>
        <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
          Add your children to start discovering coaches
        </ThemedText>
      </View>
    );
  }
  if (!postcode || postcode.length < 3) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="search" size={48} color={palette.icon} style={{ opacity: 0.3 }} />
        <ThemedText type="subtitle" style={styles.emptyTitle}>
          Find expert coaches
        </ThemedText>
        <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
          Enter postcode to discover coaches for {selectedChildName}
        </ThemedText>
      </View>
    );
  }
  if (nearbyCoachCount === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="location-outline" size={48} color={palette.icon} style={{ opacity: 0.3 }} />
        <ThemedText type="subtitle" style={styles.emptyTitle}>
          No coaches nearby
        </ThemedText>
        <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
          Try a different postcode
        </ThemedText>
      </View>
    );
  }
  return null;
}
