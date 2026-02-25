import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { DAY_NAMES } from '@/constants/booking-types';
import { useTheme } from '@/hooks/useTheme';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import {
  useEditTemplate,
  TIME_OPTIONS,
  BUFFER_OPTIONS,
  MAX_SLOTS_OPTIONS,
} from '@/hooks/use-edit-template';

export default function EditTemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const {
    status,
    error,
    saving,
    template,
    refreshing,
    onRefresh,
    retry,
    dayOfWeek,
    startTime,
    endTime,
    maxSlots,
    bufferMinutes,
    setDayOfWeek,
    setStartTime,
    setEndTime,
    setMaxSlots,
    setBufferMinutes,
    handleSave,
    handleDelete,
  } = useEditTemplate(id);

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader title="Edit Availability" showBack onBackPress={() => router.back()} />
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader title="Edit Availability" showBack onBackPress={() => router.back()} />
        <ErrorState message={error?.message || 'Failed to load template.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty' || !template) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader title="Edit Availability" showBack onBackPress={() => router.back()} />
        <EmptyState
          icon="calendar-outline"
          title="Template not found"
          message="This availability template may have been deleted."
          actionLabel="Go Back"
          onPressAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader title="Edit Availability" showBack onBackPress={() => router.back()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        {/* Day Selection */}
        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle">Day of Week</ThemedText>
          <Row gap="xs" wrap>
            {DAY_NAMES.map((day, index) => (
              <Clickable
                key={day}
                onPress={() => setDayOfWeek(index as 0 | 1 | 2 | 3 | 4 | 5 | 6)}
                style={[
                  styles.dayButton,
                  {
                    borderColor: dayOfWeek === index ? colors.tint : colors.border,
                    backgroundColor: dayOfWeek === index ? colors.tint : 'transparent',
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.dayText,
                    { color: dayOfWeek === index ? colors.onPrimary : colors.text },
                  ]}
                >
                  {day.slice(0, 3)}
                </ThemedText>
              </Clickable>
            ))}
          </Row>
        </SurfaceCard>

        {/* Time Selection */}
        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle">Time Window</ThemedText>
          <TimeRow
            label="Start"
            options={TIME_OPTIONS}
            selected={startTime}
            onSelect={setStartTime}
            colors={colors}
          />
          <TimeRow
            label="End"
            options={TIME_OPTIONS}
            selected={endTime}
            onSelect={setEndTime}
            colors={colors}
          />
        </SurfaceCard>

        {/* Capacity */}
        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle">Capacity</ThemedText>
          <OptionRow
            label="Max concurrent bookings"
            options={MAX_SLOTS_OPTIONS}
            selected={maxSlots}
            onSelect={setMaxSlots}
            colors={colors}
            formatLabel={(n) => `${n}`}
          />
          <OptionRow
            label="Buffer between sessions"
            options={BUFFER_OPTIONS}
            selected={bufferMinutes}
            onSelect={setBufferMinutes}
            colors={colors}
            formatLabel={(n) => (n === 0 ? 'None' : `${n}m`)}
          />
        </SurfaceCard>

        <Clickable
          onPress={handleDelete}
          style={[styles.deleteButton, { borderColor: colors.error }]}
        >
          <Row gap="sm" align="center" justify="center">
            <Ionicons name="trash-outline" size={20} color={colors.error} />
            <ThemedText style={[styles.deleteBtnText, { color: colors.error }]}>
              Delete Template
            </ThemedText>
          </Row>
        </Clickable>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.background, borderTopColor: colors.border },
        ]}
      >
        <Clickable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveButton, { backgroundColor: saving ? colors.muted : colors.tint }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Row gap="sm" align="center" justify="center">
              <Ionicons name="checkmark-circle" size={22} color={colors.onPrimary} />
              <ThemedText style={[styles.saveText, { color: colors.onPrimary }]}>
                Save Changes
              </ThemedText>
            </Row>
          )}
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

function TimeRow({
  label,
  options,
  selected,
  onSelect,
  colors,
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={styles.timeRow}>
      <ThemedText style={[styles.label, { color: colors.muted }]}>{label}</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Row gap="xs">
          {options.map((t) => (
            <Clickable
              key={`${label}-${t}`}
              onPress={() => onSelect(t)}
              style={[
                styles.timeOption,
                {
                  borderColor: selected === t ? colors.tint : colors.border,
                  backgroundColor: selected === t ? withAlpha(colors.tint, 0.09) : 'transparent',
                },
              ]}
            >
              <ThemedText style={{ color: selected === t ? colors.tint : colors.text }}>
                {t}
              </ThemedText>
            </Clickable>
          ))}
        </Row>
      </ScrollView>
    </View>
  );
}

function OptionRow<T extends number>({
  label,
  options,
  selected,
  onSelect,
  colors,
  formatLabel,
}: {
  label: string;
  options: T[];
  selected: T;
  onSelect: (v: T) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  formatLabel: (v: T) => string;
}) {
  return (
    <View style={styles.optionRow}>
      <ThemedText>{label}</ThemedText>
      <Row gap="xs">
        {options.map((n) => (
          <Clickable
            key={n}
            onPress={() => onSelect(n)}
            style={[
              styles.optionButton,
              {
                borderColor: selected === n ? colors.tint : colors.border,
                backgroundColor: selected === n ? colors.tint : 'transparent',
              },
            ]}
          >
            <ThemedText style={{ color: selected === n ? colors.onPrimary : colors.text }}>
              {formatLabel(n)}
            </ThemedText>
          </Clickable>
        ))}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: 100, gap: Spacing.md },
  section: { padding: Spacing.md, gap: Spacing.sm },
  dayButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  dayText: { ...Typography.bodySmallSemiBold },
  timeRow: { marginTop: Spacing.sm, gap: Spacing.xs },
  label: { ...Typography.smallSemiBold },
  timeOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1.5,
  },
  optionRow: { gap: Spacing.sm, paddingVertical: Spacing.sm },
  optionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1.5,
    minWidth: 50,
    alignItems: 'center',
  },
  deleteButton: { paddingVertical: Spacing.md, borderRadius: Radii.md, borderWidth: 1.5 },
  deleteBtnText: { ...Typography.bodySemiBold },
  footer: { padding: Spacing.md, borderTopWidth: 1 },
  saveButton: { paddingVertical: Spacing.md, borderRadius: Radii.md },
  saveText: { ...Typography.heading },
});
