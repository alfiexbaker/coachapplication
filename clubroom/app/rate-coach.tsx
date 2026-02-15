/**
 * Rate Coach Screen
 *
 * Two-step flow: select coach → rate with stars + feedback chips.
 * All state/logic in useRateCoach hook. Views extracted to components.
 */

import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { CoachSelectList } from '@/components/review/coach-select-list';
import { RatingForm } from '@/components/review/rating-form';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useRateCoach } from '@/hooks/use-rate-coach';

export default function RateCoachScreen() {
  const { colors: palette } = useTheme();
  const c = useRateCoach();

  if (!c.selectedCoach) {
    if (c.status === 'loading') {
      return (
        <SafeAreaView
          style={[styles.container, { backgroundColor: palette.background }]}
          edges={['top', 'bottom']}
        >
          <PageHeader title="Rate a Coach" showBack onBackPress={c.goBack} backIcon="arrow-back" centerTitle />
          <LoadingState variant="list" />
        </SafeAreaView>
      );
    }

    if (c.status === 'error') {
      return (
        <SafeAreaView
          style={[styles.container, { backgroundColor: palette.background }]}
          edges={['top', 'bottom']}
        >
          <PageHeader title="Rate a Coach" showBack onBackPress={c.goBack} backIcon="arrow-back" centerTitle />
          <ErrorState
            message={c.error?.message || 'Failed to load coaches to rate.'}
            onRetry={c.retry}
          />
        </SafeAreaView>
      );
    }

    if (c.status === 'empty') {
      return (
        <SafeAreaView
          style={[styles.container, { backgroundColor: palette.background }]}
          edges={['top', 'bottom']}
        >
          <PageHeader title="Rate a Coach" showBack onBackPress={c.goBack} backIcon="arrow-back" centerTitle />
          <View style={styles.centerState}>
            <EmptyState
              icon="star-outline"
              title="No coaches to rate yet"
              message="Complete at least one session to leave your first coach review."
            />
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader title="Rate a Coach" showBack onBackPress={c.goBack} backIcon="arrow-back" centerTitle />
        <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
          Select a coach you&apos;ve worked with
        </ThemedText>
        <CoachSelectList
          coaches={c.coaches}
          onSelect={c.setSelectedCoach}
          refreshing={c.refreshing}
          onRefresh={c.onRefresh}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader
        title={`Rate ${c.selectedCoach.name}`}
        showBack
        onBackPress={c.goBack}
        backIcon="arrow-back"
        centerTitle
      />
      <RatingForm
        coach={c.selectedCoach}
        rating={c.rating}
        reviewText={c.reviewText}
        submitting={c.submitting}
        onRate={c.setRating}
        onToggleChip={c.toggleChip}
        onSubmit={c.handleSubmitReview}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  subtitle: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, ...Typography.bodySmall },
});
