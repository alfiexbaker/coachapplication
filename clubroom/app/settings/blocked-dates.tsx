import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { SettingsFormScreen } from '@/components/settings';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/screen-states';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { addDays, formatDateRange, useBlockedDates } from '@/hooks/use-blocked-dates';

export default function BlockedDatesScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? 'coach_default';
  const {
    blockedDates,
    selectedStart,
    selectedEnd,
    reason,
    setReason,
    bookingConflict,
    selectionLabel,
    handleDateSelect,
    handleAddBlock,
    handleBlockThisWeek,
    handleRemoveBlock,
  } = useBlockedDates(coachId);

  const upcomingDates = Array.from({ length: 14 }, (_, index) => addDays(addDays(new Date().toISOString().split('T')[0], 0), index));

  return (
    <SettingsFormScreen
      title="Blocked Dates"
      infoText="Blocked dates are enforced in availability and prevent new bookings, but they do not cancel existing confirmed sessions."
    >
      <SurfaceCard style={styles.card}>
        <ThemedText type="defaultSemiBold">Select dates</ThemedText>
        <ThemedText style={{ color: palette.muted }}>
          Tap one date for a single-day block, or tap a second date to create a range.
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Row gap="sm">
            {upcomingDates.map((date) => {
              const selected = date === selectedStart || date === selectedEnd;
              return (
                <Clickable
                  key={date}
                  onPress={() => handleDateSelect(date)}
                  style={[
                    styles.dateChip,
                    {
                      borderColor: selected ? palette.tint : palette.border,
                      backgroundColor: selected ? withAlpha(palette.tint, 0.08) : palette.card,
                    },
                  ]}
                >
                  <ThemedText style={{ color: selected ? palette.tint : palette.text }}>
                    {new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </ThemedText>
                </Clickable>
              );
            })}
          </Row>
        </ScrollView>
        {selectionLabel ? (
          <ThemedText style={[Typography.small, { color: palette.muted }]}>
            Selected: {selectionLabel}
          </ThemedText>
        ) : null}
        {bookingConflict.count > 0 ? (
          <ThemedText style={[Typography.small, { color: palette.warning }]}>
            {bookingConflict.count} existing booking{bookingConflict.count === 1 ? '' : 's'} fall inside this range.
          </ThemedText>
        ) : null}
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Reason (optional)"
          placeholderTextColor={palette.muted}
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
        />
        <Row gap="sm">
          <Clickable onPress={() => void handleAddBlock()} style={[styles.actionBtn, { backgroundColor: palette.tint }]}>
            <ThemedText style={{ color: palette.onPrimary }}>Add block</ThemedText>
          </Clickable>
          <Clickable onPress={() => void handleBlockThisWeek()} style={[styles.actionBtn, { borderColor: palette.border, borderWidth: 1 }]}>
            <ThemedText>Block this week</ThemedText>
          </Clickable>
        </Row>
      </SurfaceCard>

      {blockedDates.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No blocked dates"
          message="Add a single day or range above to keep those slots out of booking flow."
        />
      ) : (
        <SurfaceCard style={styles.card}>
          <ThemedText type="defaultSemiBold">Current blocked ranges</ThemedText>
          {blockedDates.map((block) => (
            <Row key={block.id} justify="space-between" align="center" style={styles.blockRow}>
              <View style={styles.blockText}>
                <ThemedText>{formatDateRange(block.startDate, block.endDate)}</ThemedText>
                {block.reason ? (
                  <ThemedText style={[Typography.small, { color: palette.muted }]}>
                    {block.reason}
                  </ThemedText>
                ) : null}
              </View>
              <Clickable onPress={() => handleRemoveBlock(block.id)} style={styles.deleteBtn}>
                <ThemedText style={{ color: palette.error }}>Remove</ThemedText>
              </Clickable>
            </Row>
          ))}
        </SurfaceCard>
      )}
    </SettingsFormScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  dateChip: { borderWidth: 1, borderRadius: 14, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  actionBtn: { borderRadius: 12, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  blockRow: { paddingVertical: Spacing.xs },
  blockText: { flex: 1, gap: Spacing.micro },
  deleteBtn: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
});
