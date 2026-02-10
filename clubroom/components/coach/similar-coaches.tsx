import { useCallback } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SimilarCoach {
  id: string;
  name: string;
  avatarUrl?: string;
  rating: number;
  specialties: string[];
  pricePerSession: number;
}

export interface SimilarCoachesProps {
  /** List of similar coaches (max 6 displayed). */
  coaches: SimilarCoach[];
  /** Called when a coach card is pressed. */
  onCoachPress: (coachId: string) => void;
  /** Currency symbol (defaults to GBP). */
  currencySymbol?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_COACHES = 6;
const CARD_WIDTH = 160;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SimilarCoaches({
  coaches,
  onCoachPress,
  currencySymbol = '\u00A3',
}: SimilarCoachesProps) {
  const { colors: palette } = useTheme();

  const displayCoaches = coaches.slice(0, MAX_COACHES);

  const renderCoachCard = useCallback(
    ({ item }: { item: SimilarCoach }) => (
      <SurfaceCard
        style={styles.coachCard}
        onPress={() => onCoachPress(item.id)}
        accessibilityLabel={`View ${item.name}'s profile`}
      >
        {/* Avatar */}
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: withAlpha(palette.tint, 0.1) }]}>
            <Ionicons name="person" size={Components.icon.lg} color={palette.tint} />
          </View>
        )}

        {/* Name */}
        <ThemedText
          style={[Typography.bodySemiBold, { color: palette.text }]}
          numberOfLines={1}
        >
          {item.name}
        </ThemedText>

        {/* Rating */}
        <Row style={styles.ratingRow}>
          <Ionicons name="star" size={Components.icon.sm} color={palette.rating} />
          <ThemedText style={[Typography.small, { color: palette.text }]}>
            {item.rating.toFixed(1)}
          </ThemedText>
        </Row>

        {/* Specialties */}
        {item.specialties.length > 0 ? (
          <ThemedText
            style={[Typography.small, { color: palette.muted }]}
            numberOfLines={1}
          >
            {item.specialties.join(', ')}
          </ThemedText>
        ) : null}

        {/* Price */}
        <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
          {currencySymbol}{item.pricePerSession}
          <ThemedText style={[Typography.small, { color: palette.muted }]}> /session</ThemedText>
        </ThemedText>
      </SurfaceCard>
    ),
    [onCoachPress, palette, currencySymbol]
  );

  const keyExtractor = useCallback((item: SimilarCoach) => item.id, []);

  if (displayCoaches.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <ThemedText style={[Typography.heading, { color: palette.text }]}>
          Similar Coaches
        </ThemedText>
      </View>

      <FlatList
        data={displayCoaches}
        keyExtractor={keyExtractor}
        renderItem={renderCoachCard}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={CoachCardSeparator}
      />
    </View>
  );
}

function CoachCardSeparator() {
  return <View style={styles.separator} />;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.sm,
  },
  separator: {
    width: Spacing.sm,
  },
  coachCard: {
    width: CARD_WIDTH,
    padding: Spacing.sm,
    gap: Spacing.xs / 2,
    alignItems: 'flex-start',
  },
  avatar: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Radii.md,
    alignSelf: 'center',
    marginBottom: Spacing.xs / 2,
  },
  avatarFallback: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.xs / 2,
  },
  ratingRow: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
});
