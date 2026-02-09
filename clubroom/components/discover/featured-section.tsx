/**
 * FeaturedSection Component (Sprint 8A)
 *
 * Horizontal scroll of coach discovery cards.
 * Supports "Featured Near You" and "Recommended for [Child]" variants.
 */

import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing, Typography, Components } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { useTheme } from '@/hooks/useTheme';
import { CoachCard, type CoachCardData } from '@/components/coach';
import { MOCK_DISCOVERY_COACHES } from '@/constants/mock-data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SectionVariant = 'featured' | 'recommended';

interface FeaturedSectionProps {
  variant?: SectionVariant;
  childName?: string;
  coaches?: CoachCardData[];
  onCoachPress?: (id: string) => void;
  onBookNow?: (id: string) => void;
  onToggleFavourite?: (id: string) => void;
  onSeeAll?: () => void;
  favouriteIds?: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSectionTitle(variant: SectionVariant, childName?: string): string {
  if (variant === 'recommended' && childName) {
    return `Recommended for ${childName}`;
  }
  if (variant === 'recommended') {
    return 'Recommended for You';
  }
  return 'Featured Near You';
}

function getSectionIcon(variant: SectionVariant): keyof typeof Ionicons.glyphMap {
  return variant === 'recommended' ? 'sparkles' : 'location';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeaturedSection({
  variant = 'featured',
  childName,
  coaches,
  onCoachPress,
  onBookNow,
  onToggleFavourite,
  onSeeAll,
  favouriteIds = [],
}: FeaturedSectionProps) {
  const { colors: palette } = useTheme();

  const data: CoachCardData[] = coaches ?? MOCK_DISCOVERY_COACHES;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons
            name={getSectionIcon(variant)}
            size={Components.icon.lg}
            color={variant === 'recommended' ? palette.warning : palette.tint}
          />
          <ThemedText style={[styles.headerTitle, { color: palette.text }]}>
            {getSectionTitle(variant, childName)}
          </ThemedText>
        </View>

        {onSeeAll && (
          <Clickable onPress={onSeeAll} accessibilityLabel="See all coaches">
            <View style={styles.seeAllButton}>
              <ThemedText style={[styles.seeAllText, { color: palette.tint }]}>
                See all
              </ThemedText>
              <Ionicons name="chevron-forward" size={Components.icon.sm} color={palette.tint} />
            </View>
          </Clickable>
        )}
      </View>

      {/* Horizontal scroll of cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + Spacing.sm}
        snapToAlignment="start"
      >
        {data.map((coach, index) => (
          <View key={coach.id} style={styles.cardWrapper}>
            <CoachCard
              coach={coach}
              variant="discovery"
              index={index}
              onPress={() => onCoachPress?.(coach.id)}
              onBookNow={() => onBookNow?.(coach.id)}
              onToggleFavourite={onToggleFavourite}
              isFavourited={favouriteIds.includes(coach.id)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const CARD_WIDTH = 300;

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  headerTitle: {
    ...Typography.title,
    flexShrink: 1,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  seeAllText: {
    ...Typography.bodySemiBold,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  cardWrapper: {
    width: CARD_WIDTH,
  },
});
