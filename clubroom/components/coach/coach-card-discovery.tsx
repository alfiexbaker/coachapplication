/**
 * DiscoveryCard — Full-featured coach card for discovery (Airbnb-quality).
 */
import { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Spacing } from '@/constants/theme';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { useTheme } from '@/hooks/useTheme';
import { CoachAvatar, CoachNameRow } from './coach-card-header';
import { RatingDisplay, ReviewQuote } from './coach-card-reviews';
import { MetaRow } from './coach-card-availability';
import { SpecialtyTags } from './coach-card-services';
import { FavouriteButton, ActionRow } from './coach-card-cta';
import type { DiscoveryVariantProps } from './coach-card-shared';
import { Row } from '@/components/primitives';

function DiscoveryCardInner({ coach, onPress, onBookNow, onToggleFavourite, isFavourited = false, index = 0 }: DiscoveryVariantProps) {
  const [favourited, setFavourited] = useState(isFavourited);
  const specialties = coach.specialties || coach.footballFocuses || [];

  const handleFavourite = () => {
    setFavourited((prev) => !prev);
    onToggleFavourite?.(coach.id);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(350).springify()}>
      <SurfaceCard onPress={onPress} style={styles.card}>
        <Row style={styles.topRow}>
          <CoachAvatar profilePhotoUrl={coach.profilePhotoUrl} trialAvailable={coach.trialAvailable} size="lg" />
          <View style={styles.infoColumn}>
            <CoachNameRow fullName={coach.fullName} verified={coach.verified} />
            {coach.rating !== undefined && <RatingDisplay rating={coach.rating} reviewCount={coach.reviewCount} />}
            <MetaRow distanceMiles={coach.distanceMiles} pricePerHour={coach.pricePerHour} />
          </View>
          <FavouriteButton isFavourite={favourited} onPress={handleFavourite} size="lg" />
        </Row>
        {specialties.length > 0 && <SpecialtyTags specialties={specialties} />}
        {coach.reviewQuote && <ReviewQuote quote={coach.reviewQuote} author={coach.reviewAuthor} />}
        <ActionRow nextAvailable={coach.nextAvailable} coachName={coach.fullName} onBookNow={onBookNow} />
      </SurfaceCard>
    </Animated.View>
  );
}

export const DiscoveryCard = memo(DiscoveryCardInner);

const styles = StyleSheet.create({
  card: { padding: Spacing.sm, gap: Spacing.sm, marginBottom: Spacing.sm },
  topRow: { gap: Spacing.sm, alignItems: 'flex-start' },
  infoColumn: { flex: 1, gap: Spacing.xs / 2 },
});
