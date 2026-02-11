/**
 * WizardStepHours — Step 2: Set hours, location, and session type.
 */
import { memo } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { DateTimeField } from '@/components/ui/primitives/DateTimeField';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { COMMON_LOCATIONS, DAYS_SHORT, type DayHours } from '@/hooks/use-availability-wizard';
import type { SessionTemplate } from '@/constants/session-types';
import { Row } from '@/components/primitives';

interface WizardStepHoursProps {
  selectedDays: boolean[];
  selectedCount: number;
  sameHours: boolean;
  globalHours: DayHours;
  perDayHours: DayHours[];
  totalHoursLive: number;
  location: string;
  showLocationInput: boolean;
  sessionTemplateId: string | undefined;
  sessionTemplates?: SessionTemplate[];
  onToggleSameHours: () => void;
  onUpdateGlobalHours: (field: 'start' | 'end', value: string) => void;
  onUpdateDayHours: (index: number, field: 'start' | 'end', value: string) => void;
  onSelectLocation: (loc: string) => void;
  onSetLocation: (loc: string) => void;
  onSetShowLocationInput: (show: boolean) => void;
  onSelectSessionTemplate: (id: string | undefined) => void;
  onBack: () => void;
  onNext: () => void;
}

function WizardStepHoursInner({
  selectedDays,
  selectedCount,
  sameHours,
  globalHours,
  perDayHours,
  totalHoursLive,
  location,
  showLocationInput,
  sessionTemplateId,
  sessionTemplates,
  onToggleSameHours,
  onUpdateGlobalHours,
  onUpdateDayHours,
  onSelectLocation,
  onSetLocation,
  onSetShowLocationInput,
  onSelectSessionTemplate,
  onBack,
  onNext,
}: WizardStepHoursProps) {
  const { colors: palette } = useTheme();

  return (
    <>
      <View style={styles.stepHeader}>
        <View style={[styles.stepBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <ThemedText style={[styles.stepBadgeText, { color: palette.tint }]}>
            Step 2 of 3
          </ThemedText>
        </View>
        <ThemedText type="subtitle" style={styles.stepTitle}>
          What hours?
        </ThemedText>
        <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>
          Set your coaching hours for each day
        </ThemedText>
      </View>

      {/* Live hours counter */}
      <Row
        style={[
          styles.hoursBanner,
          {
            backgroundColor: withAlpha(
              totalHoursLive > 20
                ? palette.warning
                : totalHoursLive >= 5
                  ? palette.tint
                  : palette.muted,
              0.08,
            ),
          },
        ]}
      >
        <Ionicons
          name="time-outline"
          size={18}
          color={
            totalHoursLive > 20
              ? palette.warning
              : totalHoursLive >= 5
                ? palette.tint
                : palette.muted
          }
        />
        <ThemedText
          style={[
            styles.hoursBannerText,
            {
              color:
                totalHoursLive > 20
                  ? palette.warning
                  : totalHoursLive >= 5
                    ? palette.tint
                    : palette.muted,
            },
          ]}
        >
          {totalHoursLive > 0
            ? `${totalHoursLive} hrs/week across ${selectedCount} day${selectedCount !== 1 ? 's' : ''}`
            : 'Set your available hours'}
        </ThemedText>
      </Row>

      {/* Same hours toggle */}
      <Clickable
        onPress={onToggleSameHours}
        style={[styles.toggleRow, { borderColor: palette.border }]}
        accessibilityLabel="Toggle same hours for all days"
      >
        <View
          style={[
            styles.toggleSwitch,
            { backgroundColor: sameHours ? palette.tint : palette.border },
          ]}
        >
          <View
            style={[
              styles.toggleThumb,
              { backgroundColor: palette.surface, transform: [{ translateX: sameHours ? 18 : 2 }] },
            ]}
          />
        </View>
        <ThemedText style={styles.toggleLabel}>Same hours for all days</ThemedText>
      </Clickable>

      {sameHours ? (
        <Row style={styles.hoursRow}>
          <DateTimeField
            mode="time"
            label="Start"
            value={globalHours.start}
            onChange={(v) => onUpdateGlobalHours('start', v)}
            minuteInterval={15}
            style={styles.timePicker}
          />
          <DateTimeField
            mode="time"
            label="End"
            value={globalHours.end}
            onChange={(v) => onUpdateGlobalHours('end', v)}
            minuteInterval={15}
            style={styles.timePicker}
          />
        </Row>
      ) : (
        <View style={styles.perDayList}>
          {selectedDays.map((selected, i) => {
            if (!selected) return null;
            return (
              <Row key={DAYS_SHORT[i]} style={[styles.perDayRow, { borderColor: palette.border }]}>
                <ThemedText type="defaultSemiBold" style={styles.perDayLabel}>
                  {DAYS_SHORT[i]}
                </ThemedText>
                <DateTimeField
                  mode="time"
                  value={perDayHours[i].start}
                  onChange={(v) => onUpdateDayHours(i, 'start', v)}
                  minuteInterval={15}
                  style={styles.timePickerSmall}
                />
                <ThemedText style={{ color: palette.muted }}>to</ThemedText>
                <DateTimeField
                  mode="time"
                  value={perDayHours[i].end}
                  onChange={(v) => onUpdateDayHours(i, 'end', v)}
                  minuteInterval={15}
                  style={styles.timePickerSmall}
                />
              </Row>
            );
          })}
        </View>
      )}

      {/* Location */}
      <View style={styles.sectionBlock}>
        <ThemedText type="defaultSemiBold">Location (Optional)</ThemedText>
        <Row style={styles.chipRow}>
          {COMMON_LOCATIONS.map((loc) => {
            const isSelected = location === loc;
            return (
              <Clickable
                key={loc}
                onPress={() => onSelectLocation(loc)}
                accessibilityLabel={`Location: ${loc}`}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? withAlpha(palette.tint, 0.09)
                      : palette.background,
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                <Ionicons
                  name={loc === 'Online Session' ? 'videocam-outline' : 'location-outline'}
                  size={14}
                  color={isSelected ? palette.tint : palette.muted}
                />
                <ThemedText
                  style={[styles.chipText, { color: isSelected ? palette.tint : palette.text }]}
                >
                  {loc}
                </ThemedText>
              </Clickable>
            );
          })}
          <Clickable
            onPress={() => {
              onSetShowLocationInput(true);
              onSetLocation('');
            }}
            accessibilityLabel="Custom location"
            style={[
              styles.chip,
              {
                backgroundColor: showLocationInput
                  ? withAlpha(palette.tint, 0.09)
                  : palette.background,
                borderColor: showLocationInput ? palette.tint : palette.border,
              },
            ]}
          >
            <Ionicons
              name="add"
              size={14}
              color={showLocationInput ? palette.tint : palette.muted}
            />
            <ThemedText
              style={[styles.chipText, { color: showLocationInput ? palette.tint : palette.text }]}
            >
              Custom
            </ThemedText>
          </Clickable>
        </Row>
        {showLocationInput && (
          <Row
            style={[
              styles.customInput,
              { borderColor: palette.border, backgroundColor: palette.background },
            ]}
          >
            <Ionicons name="location-outline" size={18} color={palette.muted} />
            <TextInput
              style={[styles.customInputText, { color: palette.text }]}
              placeholder="Enter custom location"
              placeholderTextColor={palette.muted}
              value={location}
              onChangeText={onSetLocation}
              autoFocus
            />
          </Row>
        )}
      </View>

      {/* Session Template */}
      {sessionTemplates && sessionTemplates.length > 0 && (
        <View style={styles.sectionBlock}>
          <ThemedText type="defaultSemiBold">Session Type (Optional)</ThemedText>
          <Row style={styles.chipRow}>
            <Clickable
              onPress={() => onSelectSessionTemplate(undefined)}
              accessibilityLabel="Any session type"
              style={[
                styles.chip,
                {
                  backgroundColor: !sessionTemplateId
                    ? withAlpha(palette.tint, 0.09)
                    : palette.background,
                  borderColor: !sessionTemplateId ? palette.tint : palette.border,
                },
              ]}
            >
              <Ionicons
                name="apps-outline"
                size={14}
                color={!sessionTemplateId ? palette.tint : palette.muted}
              />
              <ThemedText
                style={[
                  styles.chipText,
                  { color: !sessionTemplateId ? palette.tint : palette.text },
                ]}
              >
                Any Type
              </ThemedText>
            </Clickable>
            {sessionTemplates.map((st) => {
              const isSelected = sessionTemplateId === st.id;
              return (
                <Clickable
                  key={st.id}
                  onPress={() => onSelectSessionTemplate(isSelected ? undefined : st.id)}
                  accessibilityLabel={`Session type: ${st.name}`}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? withAlpha(palette.accent, 0.09)
                        : palette.background,
                      borderColor: isSelected ? palette.accent : palette.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={st.capacity === 1 ? 'person-outline' : 'people-outline'}
                    size={14}
                    color={isSelected ? palette.accent : palette.muted}
                  />
                  <ThemedText
                    style={[styles.chipText, { color: isSelected ? palette.accent : palette.text }]}
                  >
                    {st.name}
                  </ThemedText>
                </Clickable>
              );
            })}
          </Row>
        </View>
      )}

      <Row style={styles.navRow}>
        <Clickable
          onPress={onBack}
          style={[styles.backBtn, { borderColor: palette.border }]}
          accessibilityLabel="Back to day selection"
        >
          <Ionicons name="arrow-back" size={18} color={palette.text} />
          <ThemedText>Back</ThemedText>
        </Clickable>
        <Clickable
          onPress={onNext}
          style={[styles.nextBtn, { backgroundColor: palette.tint, flex: 1 }]}
          accessibilityLabel="Review schedule"
        >
          <ThemedText style={[styles.nextBtnText, { color: palette.onPrimary }]}>Review</ThemedText>
          <Ionicons name="arrow-forward" size={18} color={palette.onPrimary} />
        </Clickable>
      </Row>
    </>
  );
}

export const WizardStepHours = memo(WizardStepHoursInner);

const styles = StyleSheet.create({
  stepHeader: { gap: Spacing.xs },
  stepBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  stepBadgeText: { ...Typography.caption, fontWeight: '600' },
  stepTitle: { marginTop: Spacing.xs },
  stepSubtitle: { ...Typography.body },
  hoursBanner: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  hoursBannerText: { ...Typography.bodySmallSemiBold },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    minHeight: 44,
  },
  toggleSwitch: { width: 40, height: 22, borderRadius: 11, justifyContent: 'center' },
  toggleThumb: { width: 18, height: 18, borderRadius: 9 },
  toggleLabel: { ...Typography.body, fontWeight: '500' },
  hoursRow: { gap: Spacing.md },
  timePicker: { flex: 1 },
  timePickerSmall: { flex: 1 },
  perDayList: { gap: Spacing.sm },
  perDayRow: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  perDayLabel: { width: 36 },
  sectionBlock: { gap: Spacing.sm },
  chipRow: { flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    minHeight: 44,
  },
  chipText: { ...Typography.smallSemiBold },
  customInput: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  customInputText: { flex: 1, ...Typography.body, padding: 0 },
  navRow: { gap: Spacing.sm },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
    minHeight: 52,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    minHeight: 52,
  },
  nextBtnText: { fontWeight: '600', fontSize: Typography.body.fontSize },
});
