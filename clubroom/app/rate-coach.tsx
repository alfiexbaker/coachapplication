/**
 * Rate Coach Screen
 *
 * Two-step flow: select coach → rate with stars + feedback chips.
 * All state/logic in useRateCoach hook. Views extracted to components.
 */

import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

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
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );
  const renderSelectCoachShell = (content: ReactNode) =>
    renderShell(
      <>
        <PageHeader title="Rate a Coach" showBack onBackPress={c.goBack} backIcon="arrow-back" centerTitle />
        {content}
      </>,
    );

  if (!c.selectedCoach) {
    if (c.status === 'loading') {
      return renderSelectCoachShell(<LoadingState variant="list" />);
    }

    if (c.status === 'error') {
      return renderSelectCoachShell(
        <ErrorState
          message={c.error?.message || 'Failed to load coaches to rate.'}
          onRetry={c.retry}
        />,
      );
    }

    if (c.status === 'empty') {
      return renderSelectCoachShell(
        <View style={styles.centerState}>
          <EmptyState
            icon="star-outline"
            title="No coaches to rate yet"
            message="Complete at least one session to leave your first coach review."
          />
        </View>,
      );
    }

    return renderSelectCoachShell(
      <>
        <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
          Select a coach you&apos;ve worked with
        </ThemedText>
        <CoachSelectList
          coaches={c.coaches}
          onSelect={c.setSelectedCoach}
          refreshing={c.refreshing}
          onRefresh={c.onRefresh}
        />
      </>,
    );
  }

  return renderShell(
    <>
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
    </>,
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
