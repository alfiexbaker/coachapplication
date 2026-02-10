/**
 * TemplateOptionsSection — Location, session template, session type, buffer time, and delete.
 */
import { memo } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { COMMON_LOCATIONS } from '@/hooks/use-recurring-template-form';
import type { SessionTemplate } from '@/constants/session-types';
import { Row } from '@/components/primitives';

interface TemplateOptionsSectionProps {
  location: string;
  onSetLocation: (loc: string) => void;
  showLocationInput: boolean;
  onSelectLocation: (loc: string) => void;
  onOpenCustomLocation: () => void;
  sessionTemplates?: SessionTemplate[];
  sessionTemplateId: string | undefined;
  onSelectSessionTemplate: (id: string | undefined) => void;
  maxConcurrent: number;
  onSelectMaxConcurrent: (value: number) => void;
  bufferMinutes: number;
  onSelectBufferMinutes: (mins: number) => void;
  isEditing: boolean;
  isQuickAdd: boolean;
  saving: boolean;
  canDelete: boolean;
  onDelete: () => void;
}

function TemplateOptionsSectionInner({
  location, onSetLocation, showLocationInput, onSelectLocation, onOpenCustomLocation,
  sessionTemplates, sessionTemplateId, onSelectSessionTemplate,
  maxConcurrent, onSelectMaxConcurrent, bufferMinutes, onSelectBufferMinutes,
  isEditing, isQuickAdd, saving, canDelete, onDelete,
}: TemplateOptionsSectionProps) {
  const { colors: palette } = useTheme();

  return (
    <>
      {/* Location */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Location (Optional)</ThemedText>
        <Row style={styles.chipRow}>
          {COMMON_LOCATIONS.map((loc) => {
            const isSelected = location === loc;
            return (
              <Clickable
                key={loc}
                onPress={() => onSelectLocation(loc)}
                style={[styles.chip, { backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.surface, borderColor: isSelected ? palette.tint : palette.border }]}
              >
                <Ionicons name={loc === 'Online Session' ? 'videocam-outline' : 'location-outline'} size={14} color={isSelected ? palette.tint : palette.muted} />
                <ThemedText style={[styles.chipText, { color: isSelected ? palette.tint : palette.text }]}>{loc}</ThemedText>
              </Clickable>
            );
          })}
          <Clickable
            onPress={onOpenCustomLocation}
            style={[styles.chip, { backgroundColor: showLocationInput ? withAlpha(palette.tint, 0.09) : palette.surface, borderColor: showLocationInput ? palette.tint : palette.border }]}
          >
            <Ionicons name="add" size={14} color={showLocationInput ? palette.tint : palette.muted} />
            <ThemedText style={[styles.chipText, { color: showLocationInput ? palette.tint : palette.text }]}>Custom</ThemedText>
          </Clickable>
        </Row>
        {showLocationInput && (
          <Row style={[styles.customInput, { borderColor: palette.border, backgroundColor: palette.surface }]}>
            <Ionicons name="location-outline" size={18} color={palette.muted} />
            <TextInput
              style={[styles.textInput, { color: palette.text }]}
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
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Session Template (Optional)</ThemedText>
          <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>Link this slot to a specific session type</ThemedText>
          <Row style={styles.chipRow}>
            <Clickable
              onPress={() => onSelectSessionTemplate(undefined)}
              style={[styles.chip, { backgroundColor: !sessionTemplateId ? withAlpha(palette.tint, 0.09) : palette.surface, borderColor: !sessionTemplateId ? palette.tint : palette.border }]}
            >
              <Ionicons name="apps-outline" size={14} color={!sessionTemplateId ? palette.tint : palette.muted} />
              <ThemedText style={[styles.chipText, { color: !sessionTemplateId ? palette.tint : palette.text }]}>Any Type</ThemedText>
            </Clickable>
            {sessionTemplates.map((st) => {
              const isSelected = sessionTemplateId === st.id;
              return (
                <Clickable
                  key={st.id}
                  onPress={() => onSelectSessionTemplate(isSelected ? undefined : st.id)}
                  style={[styles.chip, { backgroundColor: isSelected ? withAlpha(palette.accent, 0.09) : palette.surface, borderColor: isSelected ? palette.accent : palette.border }]}
                >
                  <Ionicons name={st.capacity === 1 ? 'person-outline' : 'people-outline'} size={14} color={isSelected ? palette.accent : palette.muted} />
                  <ThemedText style={[styles.chipText, { color: isSelected ? palette.accent : palette.text }]}>{st.name}</ThemedText>
                </Clickable>
              );
            })}
          </Row>
        </View>
      )}

      {/* Session Type */}
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Session Type</ThemedText>
        <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>Choose between individual or group sessions</ThemedText>
        <Row style={styles.typeRow}>
          <Clickable
            onPress={() => onSelectMaxConcurrent(1)}
            style={[styles.typeOption, {
              backgroundColor: maxConcurrent === 1 ? withAlpha(palette.tint, 0.07) : palette.surface,
              borderColor: maxConcurrent === 1 ? palette.tint : palette.border,
              borderWidth: maxConcurrent === 1 ? 2 : 1,
            }]}
          >
            <View style={[styles.typeIcon, { backgroundColor: maxConcurrent === 1 ? withAlpha(palette.tint, 0.12) : palette.background }]}>
              <Ionicons name="person-outline" size={22} color={maxConcurrent === 1 ? palette.tint : palette.muted} />
            </View>
            <ThemedText style={[styles.typeLabel, { color: maxConcurrent === 1 ? palette.tint : palette.text }]}>1v1 Session</ThemedText>
            <ThemedText style={[styles.typeDesc, { color: palette.muted }]}>One athlete at a time</ThemedText>
          </Clickable>
          <Clickable
            onPress={() => { if (maxConcurrent <= 1) onSelectMaxConcurrent(4); }}
            style={[styles.typeOption, {
              backgroundColor: maxConcurrent > 1 ? withAlpha(palette.info, 0.07) : palette.surface,
              borderColor: maxConcurrent > 1 ? palette.info : palette.border,
              borderWidth: maxConcurrent > 1 ? 2 : 1,
            }]}
          >
            <View style={[styles.typeIcon, { backgroundColor: maxConcurrent > 1 ? withAlpha(palette.info, 0.12) : palette.background }]}>
              <Ionicons name="people-outline" size={22} color={maxConcurrent > 1 ? palette.info : palette.muted} />
            </View>
            <ThemedText style={[styles.typeLabel, { color: maxConcurrent > 1 ? palette.info : palette.text }]}>Group Session</ThemedText>
            <ThemedText style={[styles.typeDesc, { color: palette.muted }]}>Multiple athletes</ThemedText>
          </Clickable>
        </Row>

        {maxConcurrent > 1 && (
          <Row style={[styles.groupSizeRow, { backgroundColor: withAlpha(palette.info, 0.03), borderColor: palette.border }]}>
            <ThemedText style={[styles.groupSizeLabel, { color: palette.text }]}>Max group size</ThemedText>
            <Row style={styles.stepper}>
              <Clickable accessibilityLabel="Decrease max group size" onPress={() => onSelectMaxConcurrent(Math.max(2, maxConcurrent - 1))} style={[styles.stepperButton, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                <Ionicons name="remove" size={18} color={palette.text} />
              </Clickable>
              <ThemedText style={styles.stepperValue}>{maxConcurrent}</ThemedText>
              <Clickable accessibilityLabel="Increase max group size" onPress={() => onSelectMaxConcurrent(maxConcurrent + 1)} style={[styles.stepperButton, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                <Ionicons name="add" size={18} color={palette.text} />
              </Clickable>
            </Row>
          </Row>
        )}
      </View>

      {/* Buffer Time */}
      {!isQuickAdd && (
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Buffer Time</ThemedText>
          <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>Break between sessions</ThemedText>
          <Row style={styles.bufferRow}>
            {[0, 15, 30].map((mins) => {
              const isSelected = bufferMinutes === mins;
              return (
                <Clickable
                  key={mins}
                  onPress={() => onSelectBufferMinutes(mins)}
                  style={[styles.bufferOption, { backgroundColor: isSelected ? palette.tint : palette.surface, borderColor: isSelected ? palette.tint : palette.border }]}
                >
                  <ThemedText style={[styles.bufferText, { color: isSelected ? palette.onPrimary : palette.text }]}>
                    {mins === 0 ? 'None' : `${mins} min`}
                  </ThemedText>
                </Clickable>
              );
            })}
          </Row>
        </View>
      )}

      {/* Delete */}
      {isEditing && canDelete && (
        <Clickable onPress={onDelete} disabled={saving} style={[styles.deleteButton, { borderColor: palette.error }]}>
          <Ionicons name="trash-outline" size={18} color={palette.error} />
          <ThemedText style={{ ...Typography.bodySemiBold, color: palette.error }}>Delete This Slot</ThemedText>
        </Clickable>
      )}
    </>
  );
}

export const TemplateOptionsSection = memo(TemplateOptionsSectionInner);

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.subheading },
  sectionHint: { ...Typography.small, marginBottom: Spacing.xs },
  chipRow: { flexWrap: 'wrap', gap: Spacing.xs },
  chip: { alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radii.pill, borderWidth: 1 },
  chipText: { ...Typography.smallSemiBold },
  customInput: { alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1, marginTop: Spacing.xs },
  textInput: { flex: 1, ...Typography.body, padding: 0 },
  typeRow: { gap: Spacing.sm },
  typeOption: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderRadius: Radii.md, gap: Spacing.xs },
  typeIcon: { width: 44, height: 44, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  typeLabel: { ...Typography.bodySmallSemiBold, fontWeight: '700' },
  typeDesc: { ...Typography.caption, textAlign: 'center' },
  groupSizeRow: { alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radii.md, borderWidth: 1, marginTop: Spacing.xs },
  groupSizeLabel: { ...Typography.bodySmallSemiBold },
  stepper: { alignItems: 'center', gap: Spacing.sm },
  stepperButton: { width: 44, height: 44, borderRadius: Radii.xl, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { ...Typography.heading, fontWeight: '700', minWidth: 28, textAlign: 'center' },
  bufferRow: { gap: Spacing.sm },
  bufferOption: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1.5, alignItems: 'center' },
  bufferText: { ...Typography.smallSemiBold },
  deleteButton: { alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, borderRadius: Radii.md, borderWidth: 1.5, marginTop: Spacing.md },
});
