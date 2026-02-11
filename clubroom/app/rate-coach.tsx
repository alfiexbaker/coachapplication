/**
 * Rate Coach Screen
 *
 * Two-step flow: select coach → rate with stars + feedback chips.
 * All state/logic in useRateCoach hook. Views extracted to components.
 */

import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
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
        <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
          <Row align="center" justify="space-between" style={styles.header}>
            <Clickable accessibilityLabel="Go back" onPress={c.goBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={palette.foreground} />
            </Clickable>
            <ThemedText type="title">Rate a Coach</ThemedText>
            <View style={{ width: 24 }} />
          </Row>
          <LoadingState variant="list" />
        </SafeAreaView>
      );
    }

    if (c.status === 'error') {
      return (
        <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
          <Row align="center" justify="space-between" style={styles.header}>
            <Clickable accessibilityLabel="Go back" onPress={c.goBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={palette.foreground} />
            </Clickable>
            <ThemedText type="title">Rate a Coach</ThemedText>
            <View style={{ width: 24 }} />
          </Row>
          <ErrorState
            message={c.error?.message || 'Failed to load coaches to rate.'}
            onRetry={c.retry}
          />
        </SafeAreaView>
      );
    }

    if (c.status === 'empty') {
      return (
        <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
          <Row align="center" justify="space-between" style={styles.header}>
            <Clickable accessibilityLabel="Go back" onPress={c.goBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={palette.foreground} />
            </Clickable>
            <ThemedText type="title">Rate a Coach</ThemedText>
            <View style={{ width: 24 }} />
          </Row>
          <EmptyState
            icon="star-outline"
            title="No coaches to rate yet"
            message="Complete at least one session to leave your first coach review."
            actionLabel="Refresh"
            onPressAction={c.onRefresh}
          />
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <Row align="center" justify="space-between" style={styles.header}>
          <Clickable accessibilityLabel="Go back" onPress={c.goBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={palette.foreground} />
          </Clickable>
          <ThemedText type="title">Rate a Coach</ThemedText>
          <View style={{ width: 24 }} />
        </Row>
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
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ThemedView style={styles.header}>
        <Clickable accessibilityLabel="Go back" onPress={c.goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={palette.foreground} />
        </Clickable>
        <ThemedText type="title">Rate {c.selectedCoach.name}</ThemedText>
        <View style={{ width: 24 }} />
      </ThemedView>
      <RatingForm coach={c.selectedCoach} rating={c.rating} reviewText={c.reviewText}
        submitting={c.submitting} onRate={c.setRating} onToggleChip={c.toggleChip} onSubmit={c.handleSubmitReview} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  backButton: { padding: Spacing.xs },
  subtitle: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, ...Typography.bodySmall },
});
