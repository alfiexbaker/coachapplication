/**
 * CoachCardCompact — Small horizontal card for the "Your Coaches" discover section.
 *
 * Shows coach avatar, name, rating, and a "Book" CTA.
 */

import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CoachProfile } from '@/constants/types';

interface CoachCardCompactProps {
  coach: CoachProfile;
  onPress: (coachId: string) => void;
}

export const CoachCardCompact = memo(function CoachCardCompact({
  coach,
  onPress,
}: CoachCardCompactProps) {
  const { colors: palette } = useTheme();

  const handlePress = useCallback(() => {
    onPress(coach.id);
  }, [coach.id, onPress]);

  return (
    <SurfaceCard
      style={styles.card}
      onPress={handlePress}
      accessibilityLabel={`Book with ${coach.fullName}`}
    >
      <Column align="center" gap="xs">
        {coach.profilePhotoUrl ? (
          <Image
            source={{ uri: coach.profilePhotoUrl }}
            style={styles.avatar}
            contentFit="cover"
            accessibilityLabel={`${coach.fullName} photo`}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
            <Ionicons name="person" size={24} color={palette.tint} />
          </View>
        )}

        <ThemedText style={styles.name} numberOfLines={1}>
          {coach.fullName.split(' ')[0]}
        </ThemedText>

        <Row align="center" gap="micro">
          <Ionicons name="star" size={12} color={palette.warning} />
          <ThemedText style={[styles.rating, { color: palette.muted }]}>
            {coach.rating.average.toFixed(1)}
          </ThemedText>
        </Row>

        <View style={[styles.bookBadge, { backgroundColor: withAlpha(palette.tint, 0.1) }]}>
          <ThemedText style={[styles.bookText, { color: palette.tint }]}>Book</ThemedText>
        </View>
      </Column>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    width: 100,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  name: {
    ...Typography.bodySmall,
    fontWeight: '600',
    textAlign: 'center',
  },
  rating: {
    ...Typography.caption,
  },
  bookBadge: {
    paddingVertical: Spacing.micro,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookText: {
    ...Typography.caption,
    fontWeight: '700',
  },
});
