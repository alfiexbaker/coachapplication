/**
 * CoachColumn Component
 *
 * Displays a single coach's data in a column format for side-by-side comparison.
 * Highlights the best values based on the active comparison criteria.
 */

import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Components } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { CoachComparison, ComparisonCriteria } from '@/constants/types';

interface CoachColumnProps {
  coach: CoachComparison;
  bestValues: Record<ComparisonCriteria, string | null>;
  onRemove: (coachId: string) => void;
  onBook: (coachId: string) => void;
}

interface ValueCellProps {
  label: string;
  value: string | number;
  isBest?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  suffix?: string;
}

function ValueCell({ label, value, isBest, icon, suffix }: ValueCellProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={[styles.cell, isBest && { backgroundColor: `${palette.success}10` }]}>
      <View style={styles.cellHeader}>
        {icon && <Ionicons name={icon} size={14} color={palette.muted} />}
        <ThemedText style={[styles.cellLabel, { color: palette.muted }]}>{label}</ThemedText>
        {isBest && (
          <View style={[styles.bestBadge, { backgroundColor: palette.success }]}>
            <ThemedText style={styles.bestText}>Best</ThemedText>
          </View>
        )}
      </View>
      <ThemedText style={styles.cellValue}>
        {value}
        {suffix && <ThemedText style={[styles.cellSuffix, { color: palette.muted }]}> {suffix}</ThemedText>}
      </ThemedText>
    </View>
  );
}

export function CoachColumn({ coach, bestValues, onRemove, onBook }: CoachColumnProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const formatPrice = (min: number, max: number): string => {
    if (min === max) return `$${min}`;
    return `$${min}-$${max}`;
  };

  const formatAvailability = (nextSlot: string | null): string => {
    if (!nextSlot) return 'Not available';
    const date = new Date(nextSlot);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleViewProfile = () => {
    router.push(`/book/${coach.coachId}/session-type`);
  };

  return (
    <View style={[styles.column, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      {/* Header with remove button */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove from comparison"
          onPress={() => onRemove(coach.coachId)}
          style={[styles.removeButton, { backgroundColor: palette.surfaceSecondary }]}
        >
          <Ionicons name="close" size={16} color={palette.muted} />
        </Pressable>
      </View>

      {/* Coach avatar and name */}
      <Pressable onPress={handleViewProfile} style={styles.profileSection}>
        <Image
          source={{ uri: coach.avatar }}
          style={styles.avatar}
          contentFit="cover"
        />
        <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.name}>
          {coach.name}
        </ThemedText>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={palette.muted} />
          <ThemedText style={[styles.location, { color: palette.muted }]}>
            {coach.distanceMiles.toFixed(1)} mi
          </ThemedText>
        </View>
      </Pressable>

      {/* Comparison values */}
      <View style={styles.values}>
        <ValueCell
          label="Rating"
          value={coach.rating.toFixed(1)}
          suffix={`(${coach.reviewCount})`}
          icon="star"
          isBest={bestValues.RATING === coach.coachId}
        />

        <ValueCell
          label="Price"
          value={formatPrice(coach.price.min, coach.price.max)}
          icon="cash-outline"
          isBest={bestValues.PRICE === coach.coachId}
        />

        <ValueCell
          label="Experience"
          value={coach.totalSessions}
          suffix="sessions"
          icon="fitness-outline"
          isBest={bestValues.EXPERIENCE === coach.coachId}
        />

        <ValueCell
          label="Next Available"
          value={formatAvailability(coach.availability.nextSlot)}
          icon="calendar-outline"
          isBest={bestValues.AVAILABILITY === coach.coachId}
        />

        {/* Specialties */}
        <View style={styles.cell}>
          <View style={styles.cellHeader}>
            <Ionicons name="football-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.cellLabel, { color: palette.muted }]}>
              Specialties
            </ThemedText>
          </View>
          <View style={styles.tags}>
            {coach.specialties.slice(0, 3).map((specialty) => (
              <View
                key={specialty}
                style={[styles.tag, { backgroundColor: palette.surfaceSecondary }]}
              >
                <ThemedText style={[styles.tagText, { color: palette.text }]}>
                  {specialty}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Session types */}
        <View style={styles.cell}>
          <View style={styles.cellHeader}>
            <Ionicons name="people-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.cellLabel, { color: palette.muted }]}>
              Formats
            </ThemedText>
          </View>
          <View style={styles.tags}>
            {coach.sessionTypes.map((type) => (
              <View
                key={type}
                style={[styles.tag, { backgroundColor: palette.surfaceSecondary }]}
              >
                <ThemedText style={[styles.tagText, { color: palette.text }]}>
                  {type}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Languages */}
        <View style={styles.cell}>
          <View style={styles.cellHeader}>
            <Ionicons name="language-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.cellLabel, { color: palette.muted }]}>
              Languages
            </ThemedText>
          </View>
          <ThemedText style={styles.languagesText}>
            {coach.languages.join(', ')}
          </ThemedText>
        </View>
      </View>

      {/* Book button */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Book session with ${coach.name}`}
        onPress={() => onBook(coach.coachId)}
        style={({ pressed }) => [
          styles.bookButton,
          {
            backgroundColor: pressed ? palette.tintPressed : palette.tint,
          },
        ]}
      >
        <Ionicons name="calendar" size={18} color="#fff" />
        <ThemedText style={styles.bookButtonText}>Book Session</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    minWidth: 160,
    maxWidth: 200,
    borderRadius: Radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: Spacing.xs,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  avatar: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Components.avatar.lg / 2,
    marginBottom: Spacing.xs,
  },
  name: {
    fontSize: 15,
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  location: {
    fontSize: 12,
  },
  values: {
    flex: 1,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  cell: {
    padding: Spacing.xs,
    borderRadius: Radii.sm,
  },
  cellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  cellValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  cellSuffix: {
    fontSize: 12,
    fontWeight: '400',
  },
  bestBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  bestText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  languagesText: {
    fontSize: 13,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    margin: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.button,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
