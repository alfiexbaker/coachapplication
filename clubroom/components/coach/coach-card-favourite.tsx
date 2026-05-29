import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Spacing, Typography } from '@/constants/theme';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { CoachAvatar } from './coach-card-header';
import { CompactRating } from './coach-card-reviews';
import { LocationDisplay } from './coach-card-availability';
import { InlinePrice } from './coach-card-services';
import { formatPrice } from './coach-card-services-helpers';
import { InlineFavouriteIcon, BookButton } from './coach-card-cta';
import type { FavouriteVariantProps } from './coach-card-shared';
import { Row } from '@/components/primitives';

function FavouriteCardInner({
  coach,
  onPress,
  onBook,
  onToggleFavourite,
  toggleLoading = false,
  isFavourite = true,
  index = 0,
}: FavouriteVariantProps) {
  const handleBook = () => {
    onBook?.(coach.id);
  };
  const priceStr = formatPrice(coach.pricePerHour, coach.priceMin, coach.priceMax);

  return (
    <Animated.View
      entering={FadeInDown.duration(300)
        .delay(index * 50)
        .springify()}
    >
      <SurfaceCard
        accessibilityHint="View coach profile"
        accessibilityLabel={`${coach.fullName}, favourited coach`}
        onPress={onPress}
        style={styles.card}
      >
        <Row style={styles.content}>
          <CoachAvatar profilePhotoUrl={coach.profilePhotoUrl} size="lg" />
          <View style={styles.info}>
            <Row style={styles.nameRow}>
              <ThemedText type="subtitle" style={styles.name} numberOfLines={1}>
                {coach.fullName}
              </ThemedText>
              <InlineFavouriteIcon
                isFavourite={isFavourite}
                onPress={() => onToggleFavourite?.()}
                loading={toggleLoading}
              />
            </Row>
            <Row style={styles.metaRow}>
              {coach.rating !== undefined && <CompactRating rating={coach.rating} />}
              {coach.city && (
                <>
                  {coach.rating !== undefined && (
                    <Divider vertical style={{ height: 12, opacity: 0.5 }} />
                  )}
                  <LocationDisplay city={coach.city} />
                </>
              )}
            </Row>
            <Row style={styles.actionRow}>
              {priceStr && (
                <InlinePrice
                  pricePerHour={coach.pricePerHour}
                  priceMin={coach.priceMin}
                  priceMax={coach.priceMax}
                />
              )}
              <BookButton coachName={coach.fullName} onPress={handleBook} variant="primary" />
            </Row>
          </View>
        </Row>
      </SurfaceCard>
    </Animated.View>
  );
}

export const FavouriteCard = FavouriteCardInner;

const styles = StyleSheet.create({
  card: { padding: Spacing.sm, marginBottom: Spacing.sm },
  content: { gap: Spacing.sm },
  info: { flex: 1, gap: Spacing.xs },
  nameRow: { alignItems: 'center', justifyContent: 'space-between', gap: Spacing.xs },
  name: { ...Typography.heading, letterSpacing: -0.2, flex: 1 },
  metaRow: { alignItems: 'center', gap: Spacing.sm },
  actionRow: { alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xs },
});
