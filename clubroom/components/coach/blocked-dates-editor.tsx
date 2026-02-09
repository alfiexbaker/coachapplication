/**
 * Blocked Dates Editor — Composition root.
 * Allows coaches to block date ranges when unavailable.
 */
import { ScrollView, View, ActivityIndicator, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useBlockedDates } from '@/hooks/use-blocked-dates';
import { MiniCalendar } from './blocked-dates-calendar';
import {
  BookingWarningBanner,
  SelectionArea,
  QuickActions,
  BlockedDatesList,
  BlockedDatesEmpty,
} from './blocked-dates-sections';

export type { BlockedDateRange } from '@/hooks/use-blocked-dates';

interface BlockedDatesEditorProps {
  coachId: string;
  onUpdate?: (blockedDates: import('@/hooks/use-blocked-dates').BlockedDateRange[]) => void;
}

export default function BlockedDatesEditor({ coachId, onUpdate }: BlockedDatesEditorProps) {
  const { colors, scheme } = useTheme();
  const {
    loading, blockedDates, selectedStart, selectedEnd, reason, setReason,
    bookingConflict, hasSelection, selectionLabel,
    handleDateSelect, handleAddBlock, handleBlockThisWeek, handleRemoveBlock,
  } = useBlockedDates(coachId, onUpdate);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <MiniCalendar selectedStart={selectedStart} selectedEnd={selectedEnd} onSelectDate={handleDateSelect} blockedDates={blockedDates} />
      {hasSelection && <BookingWarningBanner count={bookingConflict.count} dates={bookingConflict.dates} colors={colors} />}
      {hasSelection && (
        <SelectionArea selectionLabel={selectionLabel} reason={reason} onReasonChange={setReason} onBlock={handleAddBlock} colors={colors} scheme={scheme} />
      )}
      <QuickActions onBlockThisWeek={handleBlockThisWeek} colors={colors} scheme={scheme} />
      <BlockedDatesList blockedDates={blockedDates} onRemove={handleRemoveBlock} colors={colors} scheme={scheme} />
      {blockedDates.length === 0 && !hasSelection && <BlockedDatesEmpty colors={colors} />}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: Spacing.sm, paddingTop: Spacing.sm },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottomSpacer: { height: Spacing.lg },
});
