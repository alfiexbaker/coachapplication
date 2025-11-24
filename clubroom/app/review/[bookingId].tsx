import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { ReviewForm } from '@/components/review/review-form';
import { ReviewCard } from '@/components/review/review-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useState } from 'react';

export default function ReviewScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [submitted, setSubmitted] = useState(false);
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Leave a review</ThemedText>
        <ThemedText style={{ color: palette.muted }}>Booking ID: {bookingId}</ThemedText>

        {submitted ? (
          <View style={{ gap: Spacing.md }}>
            <ReviewCard
              name="You"
              role="player"
              rating={5}
              text="Great energy and clear coaching points."
              date="Just now"
            />
            <ReviewCard
              name="Coach reply"
              role="coach"
              rating={5}
              text="Thanks for the feedback—next session we'll double down on first touch."
              date="Today"
            />
          </View>
        ) : (
          <ReviewForm
            onSubmit={() => {
              setSubmitted(true);
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
});
