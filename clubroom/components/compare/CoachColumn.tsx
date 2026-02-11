/**
 * CoachColumn Component
 *
 * Displays a single coach's data in a column format for side-by-side comparison.
 * Highlights the best values based on the active comparison criteria.
 */

import { useCallback } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { Clickable } from '@/components/primitives/clickable';
import { useTheme } from '@/hooks/useTheme';
import type { CoachComparison, ComparisonCriteria } from '@/constants/types';

import {
  formatPrice,
  formatAvailability,
  ValueCell,
  CoachProfileSection,
  TagsCell,
  BookButton,
  styles,
} from './CoachColumn-sections';

interface CoachColumnProps {
  coach: CoachComparison;
  bestValues: Record<ComparisonCriteria, string | null>;
  onRemove: (coachId: string) => void;
  onBook: (coachId: string) => void;
}

export function CoachColumn({ coach, bestValues, onRemove, onBook }: CoachColumnProps) {
  const { colors: palette } = useTheme();

  const handleViewProfile = useCallback(() => {
    router.push(Routes.bookSessionType(coach.coachId));
  }, [coach.coachId]);

  const handleRemove = useCallback(() => {
    onRemove(coach.coachId);
  }, [onRemove, coach.coachId]);

  const handleBook = useCallback(() => {
    onBook(coach.coachId);
  }, [onBook, coach.coachId]);

  return (
    <View style={[styles.column, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.header}>
        <Clickable
          accessibilityRole="button"
          accessibilityLabel="Remove from comparison"
          onPress={handleRemove}
          style={[styles.removeButton, { backgroundColor: palette.surfaceSecondary }]}
        >
          <Ionicons name="close" size={16} color={palette.muted} />
        </Clickable>
      </View>

      <CoachProfileSection
        name={coach.name}
        avatar={coach.avatar}
        distanceMiles={coach.distanceMiles}
        onPress={handleViewProfile}
        palette={palette}
      />

      <View style={styles.values}>
        <ValueCell
          label="Rating"
          value={coach.rating.toFixed(1)}
          suffix={`(${coach.reviewCount})`}
          icon="star"
          isBest={bestValues.RATING === coach.coachId}
          palette={palette}
        />
        <ValueCell
          label="Price"
          value={formatPrice(coach.price.min, coach.price.max)}
          icon="cash-outline"
          isBest={bestValues.PRICE === coach.coachId}
          palette={palette}
        />
        <ValueCell
          label="Experience"
          value={coach.totalSessions}
          suffix="sessions"
          icon="fitness-outline"
          isBest={bestValues.EXPERIENCE === coach.coachId}
          palette={palette}
        />
        <ValueCell
          label="Next Available"
          value={formatAvailability(coach.availability.nextSlot)}
          icon="calendar-outline"
          isBest={bestValues.AVAILABILITY === coach.coachId}
          palette={palette}
        />

        <TagsCell
          label="Specialties"
          icon="football-outline"
          tags={coach.specialties}
          maxTags={3}
          palette={palette}
        />
        <TagsCell
          label="Formats"
          icon="people-outline"
          tags={coach.sessionTypes}
          palette={palette}
        />

        <ValueCell
          label="Languages"
          value={coach.languages.join(', ')}
          icon="language-outline"
          palette={palette}
        />
      </View>

      <BookButton name={coach.name} onPress={handleBook} palette={palette} />
    </View>
  );
}
