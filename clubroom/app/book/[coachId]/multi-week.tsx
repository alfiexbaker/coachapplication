/**
 * Multi-Week Booking Screen
 *
 * Select multiple weeks of sessions and book as a series.
 * All state/logic in useMultiWeek hook.
 */

import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { MultiWeekPicker } from '@/components/bookings/multi-week-picker';
import { MultiWeekConfirmation } from '@/components/bookings/multi-week-confirmation';
import { EmptyState, ErrorState, SectionSkeleton } from '@/components/ui/screen-states';
import { Spacing, Typography, Radii, withAlpha } from '@/constants/theme';
import { useMultiWeek } from '@/hooks/use-multi-week';

export default function MultiWeekScreen() {
  const c = useMultiWeek();
  const palette = c.colors;
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );
  const showWeekSkeleton = c.loading;

  return renderShell(
    <>
      <Row style={[styles.header, { borderBottomColor: palette.border }]}>
        <Clickable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerText}>
          <ThemedText type="defaultSemiBold">Book Multiple Weeks</ThemedText>
          <ThemedText style={[Typography.small, { color: palette.muted }]}>
            {c.coachName} - {c.sessionType}
          </ThemedText>
        </View>
      </Row>

      {c.status === 'error' && c.weeks.length === 0 ? (
        <ErrorState
          message={c.error?.message ?? 'Failed to load multi-week availability.'}
          onRetry={c.retry}
        />
      ) : c.status === 'empty' ? (
        <EmptyState
          icon="calendar-outline"
          title="No multi-week slots found"
          message="This coach has no suitable weekly slots right now. Pull to refresh or choose a single session booking."
          actionLabel="Retry"
          onPressAction={c.retry}
        />
      ) : c.showConfirmation ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={c.refreshing}
              onRefresh={c.onRefresh}
              tintColor={palette.tint}
            />
          }
        >
          <MultiWeekConfirmation
            selectedWeeks={c.selectedWeekRows}
            coachName={c.coachName}
            sessionType={c.sessionType}
            location={c.primaryLocation}
            loading={c.submitting}
            onConfirm={c.handleConfirm}
            onCancel={c.handleCancelConfirmation}
          />
        </ScrollView>
      ) : (
        <>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={c.refreshing}
                onRefresh={c.onRefresh}
                tintColor={palette.tint}
              />
            }
          >
            <Row style={[styles.infoBanner, { backgroundColor: withAlpha(palette.info, 0.06) }]}>
              <Ionicons name="information-circle-outline" size={18} color={palette.info} />
              <ThemedText style={[Typography.small, { color: palette.info, flex: 1 }]}>
                Select the weeks you want to book. Each session is at the same time and location.
              </ThemedText>
            </Row>
            {showWeekSkeleton ? (
              <SectionSkeleton variant="schedule" titleWidth="36%" />
            ) : (
              <MultiWeekPicker
                weeks={c.weeks}
                selectedWeeks={c.selectedWeeks}
                onToggleWeek={c.handleToggleWeek}
              />
            )}
          </ScrollView>
          {!showWeekSkeleton ? (
            <View
              style={[
                styles.footer,
                { borderTopColor: palette.border, backgroundColor: palette.surface },
              ]}
            >
              <Button
                variant="primary"
                onPress={c.handleShowConfirmation}
                disabled={c.selectedWeeks.size === 0}
                style={styles.footerButton}
              >
                {`Review ${c.selectedWeeks.size} Week${c.selectedWeeks.size !== 1 ? 's' : ''}`}
              </Button>
            </View>
          ) : null}
        </>
      )}
    </>,
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: Spacing.micro },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.md, gap: Spacing.md },
  infoBanner: {
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerButton: { width: '100%' },
});
