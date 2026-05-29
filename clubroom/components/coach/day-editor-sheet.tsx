/**
 * DayEditorSheet — Composition root for single-day availability editor.
 * Sub-components: DayEditorExistingBlocks, DayEditorTimeSection, DayEditorVenueSection
 * Hook: useDayEditor
 */
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  useWindowDimensions,
} from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha, Components } from '@/constants/theme';
import type { AvailabilityTemplate, AvailabilityOverride, CoachVenue } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { useDayEditor, SHEET_FOOTER_HEIGHT } from '@/hooks/use-day-editor';
import { DayEditorExistingBlocks } from '@/components/availability/day-editor-existing-blocks';
import { DayEditorTimeSection } from '@/components/availability/day-editor-time-section';
import { DayEditorVenueSection } from '@/components/availability/day-editor-venue-section';
import { Row } from '@/components/primitives';

export type DayEditorScope = 'recurring' | 'just-this-date' | 'next-n-weeks';

interface DayEditorSheetProps {
  visible: boolean;
  onClose: () => void;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  dateStr?: string;
  template?: AvailabilityTemplate | null;
  existingOverride?: AvailabilityOverride | null;
  existingTemplatesForDay?: AvailabilityTemplate[];
  venues: CoachVenue[];
  defaultScope?: DayEditorScope;
  onSaveRecurring: (data: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    location?: string;
  }) => void;
  onSaveOverride: (data: {
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
  }) => void;
  onSaveRepeatedOverride: (data: {
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
    repeatWeeks: number;
  }) => void;
  onDeleteTemplate?: (templateId: string) => void;
  onAddVenue?: (label: string) => void;
  coachId: string;
}

export function DayEditorSheet({
  visible,
  onClose,
  dayOfWeek,
  dateStr,
  template,
  existingOverride,
  existingTemplatesForDay,
  venues,
  defaultScope,
  onSaveRecurring,
  onSaveOverride,
  onSaveRepeatedOverride,
  onDeleteTemplate,
  onAddVenue,
}: DayEditorSheetProps) {
  const { colors: palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheetMaxHeight = Math.min(height * 0.84, height - 40);
  const ed = useDayEditor({
    visible,
    onClose,
    dayOfWeek,
    dateStr,
    template,
    existingOverride,
    existingTemplatesForDay,
    defaultScope,
    onSaveRecurring,
    onSaveOverride,
    onSaveRepeatedOverride,
    onDeleteTemplate,
    onAddVenue,
  });

  const overlayAnimStyle = useAnimatedStyle(() => ({
    opacity: ed.overlayOpacity.value,
  }));

  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ed.slideAnim.value }],
  }));

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.overlay,
            { backgroundColor: withAlpha(palette.text, 0.4) },
            overlayAnimStyle,
          ]}
        >
          <Clickable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityLabel="Close sheet"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: palette.surface, height: sheetMaxHeight },
            sheetAnimStyle,
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <View {...ed.panResponder.panHandlers} style={styles.handleArea}>
              <View style={[styles.handle, { backgroundColor: palette.border }]} />
            </View>

            <View style={styles.body}>
              <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                contentContainerStyle={[
                  styles.content,
                  {
                    paddingBottom:
                      SHEET_FOOTER_HEIGHT + Math.max(insets.bottom + Spacing.xs, Spacing.lg),
                  },
                ]}
                bounces={false}
              >
                {/* Header */}
                <Row style={styles.headerRow}>
                  <ThemedText style={[styles.headerTitle, { color: palette.text }]}>
                    {ed.isNewTimeBlock ? `${ed.dayName} \u2014 New Time Block` : ed.dayName}
                  </ThemedText>
                  <Clickable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close">
                    <Ionicons name="close" size={22} color={palette.muted} />
                  </Clickable>
                </Row>

                {/* Existing Blocks */}
                {existingTemplatesForDay && existingTemplatesForDay.length > 0 && (
                  <DayEditorExistingBlocks
                    dayName={ed.dayName}
                    existingTemplatesForDay={existingTemplatesForDay}
                    currentTemplateId={template?.id}
                  />
                )}

                {/* Scope Selector */}
                <Row style={styles.scopeRow}>
                  <Clickable
                    onPress={() => ed.handleScopeChange('recurring')}
                    accessibilityLabel={`Every ${ed.dayName}`}
                    style={[
                      styles.scopePill,
                      {
                        backgroundColor:
                          ed.scope === 'recurring'
                            ? withAlpha(palette.tint, 0.12)
                            : palette.background,
                        borderColor: ed.scope === 'recurring' ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.scopeText,
                        { color: ed.scope === 'recurring' ? palette.tint : palette.muted },
                      ]}
                    >
                      Every {ed.dayName}
                    </ThemedText>
                  </Clickable>
                  {dateStr && (
                    <>
                      <Clickable
                        onPress={() => ed.handleScopeChange('just-this-date')}
                        accessibilityLabel={`This ${ed.dayName}`}
                        style={[
                          styles.scopePill,
                          {
                            backgroundColor:
                              ed.scope === 'just-this-date'
                                ? withAlpha(palette.tint, 0.12)
                                : palette.background,
                            borderColor:
                              ed.scope === 'just-this-date' ? palette.tint : palette.border,
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.scopeText,
                            { color: ed.scope === 'just-this-date' ? palette.tint : palette.muted },
                          ]}
                        >
                          This {ed.dayName}
                        </ThemedText>
                      </Clickable>

                      <Clickable
                        onPress={() => ed.handleScopeChange('next-n-weeks')}
                        accessibilityLabel={`Next ${ed.repeatWeeks} weeks`}
                        style={[
                          styles.scopePill,
                          {
                            backgroundColor:
                              ed.scope === 'next-n-weeks'
                                ? withAlpha(palette.tint, 0.12)
                                : palette.background,
                            borderColor:
                              ed.scope === 'next-n-weeks' ? palette.tint : palette.border,
                          },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.scopeText,
                            { color: ed.scope === 'next-n-weeks' ? palette.tint : palette.muted },
                          ]}
                        >
                          Next Weeks
                        </ThemedText>
                      </Clickable>
                    </>
                  )}
                </Row>

                {ed.scope === 'next-n-weeks' && (
                  <View style={styles.repeatSection}>
                    <ThemedText style={[styles.repeatLabel, { color: palette.muted }]}>
                      Repeat for
                    </ThemedText>
                    <Row style={styles.repeatPillRow}>
                      {[2, 4, 8, 12].map((count) => {
                        const selected = ed.repeatWeeks === count;
                        return (
                          <Clickable
                            key={count}
                            onPress={() => ed.setRepeatWeeks(count)}
                            accessibilityLabel={`${count} weeks`}
                            style={[
                              styles.repeatPill,
                              {
                                backgroundColor: selected
                                  ? withAlpha(palette.tint, 0.12)
                                  : palette.background,
                                borderColor: selected ? palette.tint : palette.border,
                              },
                            ]}
                          >
                            <ThemedText
                              style={[
                                styles.scopeText,
                                { color: selected ? palette.tint : palette.muted },
                              ]}
                            >
                              {count}w
                            </ThemedText>
                          </Clickable>
                        );
                      })}
                    </Row>
                  </View>
                )}

                {/* Time Section */}
                <DayEditorTimeSection
                  startTime={ed.startTime}
                  endTime={ed.endTime}
                  isValid={ed.isValid}
                  durationLabel={ed.durationLabel}
                  overlapWarning={ed.overlapWarning}
                  onStartTimeChange={ed.handleStartTimeChange}
                  onEndTimeChange={ed.setEndTime}
                />

                {/* Venue Section */}
                <DayEditorVenueSection
                  venues={venues}
                  location={ed.location}
                  showAddVenueInput={ed.showAddVenueInput}
                  newVenueLabel={ed.newVenueLabel}
                  onSelectVenue={(label) => ed.setLocation(ed.location === label ? '' : label)}
                  onToggleAddInput={() => ed.setShowAddVenueInput(!ed.showAddVenueInput)}
                  onNewVenueLabelChange={ed.setNewVenueLabel}
                  onAddVenue={ed.handleAddVenue}
                />
              </ScrollView>
            </View>

            <View
              style={[
                styles.footer,
                {
                  borderTopColor: palette.border,
                  backgroundColor: palette.surface,
                  paddingBottom: Math.max(insets.bottom + Spacing.xs, Spacing.md),
                },
              ]}
            >
              <Clickable
                onPress={ed.handleSave}
                disabled={!ed.isValid}
                accessibilityLabel={ed.saveLabel}
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: ed.isValid ? palette.tint : palette.border,
                    opacity: ed.isValid ? 1 : 0.5,
                  },
                ]}
              >
                <ThemedText style={[styles.saveBtnText, { color: palette.onPrimary }]}>
                  {ed.saveLabel}
                </ThemedText>
              </Clickable>

              {template && onDeleteTemplate && (
                <Clickable
                  onPress={ed.handleDelete}
                  style={styles.deleteBtn}
                  accessibilityLabel="Remove this slot"
                >
                  <Ionicons name="trash-outline" size={16} color={palette.error} />
                  <ThemedText style={[styles.deleteBtnText, { color: palette.error }]}>
                    Remove This Slot
                  </ThemedText>
                </Clickable>
              )}
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: Radii.card,
    borderTopRightRadius: Radii.card,
    overflow: 'hidden',
  },
  body: { flex: 1 },
  handleArea: { alignItems: 'center', paddingTop: Spacing.sm, paddingBottom: Spacing.xs },
  handle: { width: 36, height: 4, borderRadius: Radii.pill },
  scroll: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    minHeight: SHEET_FOOTER_HEIGHT,
    gap: Spacing.xs,
  },
  headerRow: { alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { ...Typography.title },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeRow: { flexWrap: 'wrap', gap: Spacing.xs },
  scopePill: {
    paddingHorizontal: Spacing.sm,
    minHeight: 44,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeText: { ...Typography.smallSemiBold },
  repeatSection: { gap: Spacing.xs },
  repeatLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  repeatPillRow: { gap: Spacing.xs, flexWrap: 'wrap' },
  repeatPill: {
    minHeight: 40,
    minWidth: 56,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    minHeight: Components.button.height,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  saveBtnText: { ...Typography.bodySemiBold },
  deleteBtn: { alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs, minHeight: 44 },
  deleteBtnText: { ...Typography.bodySemiBold },
});
