import React, { useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import {
  type Disability,
  type SpecialNeed,
  DISABILITY_TYPES,
  SPECIAL_NEEDS_CATEGORIES,
} from '@/services/child-service';
import { Row } from '@/components/primitives';
import { uiFeedback } from '@/services/ui-feedback';

const MAX_TAGS = 10;

/* ---------- Tag Input Helper ---------- */

function TagInput({
  label,
  tags,
  onChange,
  placeholder,
  palette,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  palette: ThemeColors;
}) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const trimmed = input.trim();
    if (tags.length >= MAX_TAGS) {
      uiFeedback.showToast(`Maximum ${MAX_TAGS} tags allowed.`);
      return;
    }
    const duplicate = tags.find((tag) => tag.toLowerCase() === trimmed.toLowerCase());
    if (trimmed && duplicate) {
      uiFeedback.showToast(`"${duplicate}" is already in the list.`);
      setInput('');
      return;
    }
    if (trimmed) {
      onChange([...tags, trimmed]);
      setInput('');
    }
  };

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag));

  return (
    <View style={styles.tagInputContainer}>
      {tags.length > 0 && (
        <Row style={styles.tagRow}>
          {tags.map((tag) => (
            <Clickable
              key={tag}
              onPress={() => removeTag(tag)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${tag} from ${label}`}
              style={[styles.tag, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
            >
              <ThemedText style={[Typography.caption, { color: palette.tint }]}>{tag}</ThemedText>
              <Ionicons name="close" size={12} color={palette.tint} />
            </Clickable>
          ))}
        </Row>
      )}
      <Row style={styles.tagInputRow}>
        <TextInput
          style={[styles.tagInput, { borderColor: palette.border, color: palette.text }]}
          accessibilityLabel={label}
          placeholder={placeholder}
          placeholderTextColor={palette.muted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={addTag}
          returnKeyType="done"
          maxLength={100}
        />
        <Clickable
          onPress={addTag}
          accessibilityRole="button"
          accessibilityLabel={`Add ${label}`}
          style={[styles.tagAddButton, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
        >
          <Ionicons name="add" size={18} color={palette.tint} />
        </Clickable>
      </Row>
    </View>
  );
}

/* ---------- DisabilitySelector ---------- */

export interface DisabilitySelectorProps {
  disabilities: Disability[];
  selectedDisabilityType: string | null;
  disabilityDescription: string;
  diagnosisDate: string;
  supportRequired: string;
  commPrefs: string[];
  triggers: string[];
  calmingStrategies: string[];
  onDisabilitiesChange: (value: Disability[]) => void;
  onSelectedDisabilityTypeChange: (value: string | null) => void;
  onDisabilityDescriptionChange: (value: string) => void;
  onDiagnosisDateChange: (value: string) => void;
  onSupportRequiredChange: (value: string) => void;
  onCommPrefsChange: (value: string[]) => void;
  onTriggersChange: (value: string[]) => void;
  onCalmingStrategiesChange: (value: string[]) => void;
  onAddDisability: () => void;
  palette: ThemeColors;
}

export const DisabilitySelector = function DisabilitySelector({
  disabilities,
  selectedDisabilityType,
  disabilityDescription,
  diagnosisDate,
  supportRequired,
  commPrefs,
  triggers,
  calmingStrategies,
  onDisabilitiesChange,
  onSelectedDisabilityTypeChange,
  onDisabilityDescriptionChange,
  onDiagnosisDateChange,
  onSupportRequiredChange,
  onCommPrefsChange,
  onTriggersChange,
  onCalmingStrategiesChange,
  onAddDisability,
  palette,
}: DisabilitySelectorProps) {
  const [isAdding, setIsAdding] = useState(Boolean(selectedDisabilityType));
  const availableTypes = DISABILITY_TYPES.filter(
    (type) => !disabilities.some((disability) => disability.type === type),
  );

  const cancelAdd = () => {
    onSelectedDisabilityTypeChange(null);
    setIsAdding(false);
  };

  const confirmAdd = () => {
    onAddDisability();
    setIsAdding(false);
  };

  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>Conditions and access needs</ThemedText>
      <ThemedText style={[styles.hint, { color: palette.muted }]}>
        Record anything that changes how sessions should be run.
      </ThemedText>

      {disabilities.map((disability) => (
        <Row
          key={disability.id}
          align="center"
          justify="space-between"
          style={[styles.savedItem, { borderColor: palette.border }]}
        >
          <ThemedText style={Typography.bodySemiBold}>{disability.type}</ThemedText>
          <Clickable
            onPress={() =>
              onDisabilitiesChange(disabilities.filter((item) => item.id !== disability.id))
            }
            accessibilityRole="button"
            accessibilityLabel={`Remove ${disability.type}`}
            style={styles.removeAction}
          >
            <Ionicons name="close-circle" size={20} color={palette.error} />
          </Clickable>
        </Row>
      ))}

      {!isAdding && availableTypes.length > 0 ? (
        <Button onPress={() => setIsAdding(true)} variant="outline" label="Add condition" />
      ) : null}

      {isAdding && !selectedDisabilityType ? (
        <>
          <ThemedText style={[styles.hint, { color: palette.muted }]}>
            Choose a condition
          </ThemedText>
          <Row style={styles.optionGrid}>
            {availableTypes.map((type) => (
              <Clickable
                key={type}
                onPress={() => onSelectedDisabilityTypeChange(type)}
                accessibilityRole="radio"
                accessibilityLabel={type}
                accessibilityState={{ checked: false }}
                style={[
                  styles.optionChip,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                ]}
              >
                <ThemedText style={[styles.optionText, { color: palette.text }]}>{type}</ThemedText>
              </Clickable>
            ))}
          </Row>
          <Clickable
            onPress={cancelAdd}
            accessibilityRole="button"
            accessibilityLabel="Cancel condition"
            style={styles.cancelLink}
          >
            <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
          </Clickable>
        </>
      ) : null}

      {selectedDisabilityType && (
        <View
          style={[
            styles.addDescriptionBox,
            { backgroundColor: withAlpha(palette.tint, 0.03), borderColor: palette.border },
          ]}
        >
          <ThemedText type="defaultSemiBold">{selectedDisabilityType}</ThemedText>

          <TextInput
            style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
            accessibilityLabel={`${selectedDisabilityType} notes, optional`}
            placeholder="Notes for the coach (optional)"
            placeholderTextColor={palette.muted}
            value={disabilityDescription}
            onChangeText={onDisabilityDescriptionChange}
            multiline
            numberOfLines={2}
            maxLength={500}
          />

          <TextInput
            style={[styles.smallInput, { borderColor: palette.border, color: palette.text }]}
            accessibilityLabel="Diagnosis year, optional"
            placeholder="Diagnosis year (optional)"
            placeholderTextColor={palette.muted}
            value={diagnosisDate}
            onChangeText={onDiagnosisDateChange}
            keyboardType="number-pad"
            maxLength={10}
          />

          <TextInput
            style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
            accessibilityLabel="Support required, optional"
            placeholder="Support required (optional)"
            placeholderTextColor={palette.muted}
            value={supportRequired}
            onChangeText={onSupportRequiredChange}
            multiline
            numberOfLines={2}
            maxLength={500}
          />

          <View style={styles.tagField}>
            <ThemedText style={[styles.hint, { color: palette.muted }]}>
              Communication preferences
            </ThemedText>
            <TagInput
              label="communication preference"
              tags={commPrefs}
              onChange={onCommPrefsChange}
              placeholder="e.g. Visual cues"
              palette={palette}
            />
          </View>

          <View style={styles.tagField}>
            <ThemedText style={[styles.hint, { color: palette.muted }]}>
              Triggers to avoid
            </ThemedText>
            <TagInput
              label="trigger"
              tags={triggers}
              onChange={onTriggersChange}
              placeholder="e.g. Loud whistles"
              palette={palette}
            />
          </View>

          <View style={styles.tagField}>
            <ThemedText style={[styles.hint, { color: palette.muted }]}>
              Calming strategies
            </ThemedText>
            <TagInput
              label="calming strategy"
              tags={calmingStrategies}
              onChange={onCalmingStrategiesChange}
              placeholder="e.g. Counting to 10"
              palette={palette}
            />
          </View>

          <Row style={styles.addButtonRow}>
            <Clickable
              onPress={cancelAdd}
              accessibilityRole="button"
              accessibilityLabel={`Cancel ${selectedDisabilityType}`}
            >
              <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
            </Clickable>
            <Button onPress={confirmAdd} size="small" label="Add condition" />
          </Row>
        </View>
      )}
    </View>
  );
};

/* ---------- SpecialNeedEntrySection ---------- */

const SEVERITY_OPTIONS: { key: NonNullable<SpecialNeed['severity']>; label: string }[] = [
  { key: 'MILD', label: 'Mild' },
  { key: 'MODERATE', label: 'Moderate' },
  { key: 'SEVERE', label: 'Severe' },
];

export interface SpecialNeedEntrySectionProps {
  specialNeeds: SpecialNeed[];
  snCategory: SpecialNeed['category'] | null;
  snName: string;
  snDescription: string;
  snSeverity: SpecialNeed['severity'] | undefined;
  snAccommodations: string[];
  snParentHints: string;
  onSnCategoryChange: (v: SpecialNeed['category'] | null) => void;
  onSnNameChange: (v: string) => void;
  onSnDescriptionChange: (v: string) => void;
  onSnSeverityChange: (v: SpecialNeed['severity']) => void;
  onSnAccommodationsChange: (v: string[]) => void;
  onSnParentHintsChange: (v: string) => void;
  onAddSpecialNeed: () => void;
  onCancelSpecialNeed: () => void;
  onRemoveSpecialNeed: (id: string) => void;
  palette: ThemeColors;
}

export const SpecialNeedEntrySection = function SpecialNeedEntrySection({
  specialNeeds,
  snCategory,
  snName,
  snDescription,
  snSeverity,
  snAccommodations,
  snParentHints,
  onSnCategoryChange,
  onSnNameChange,
  onSnDescriptionChange,
  onSnSeverityChange,
  onSnAccommodationsChange,
  onSnParentHintsChange,
  onAddSpecialNeed,
  onCancelSpecialNeed,
  onRemoveSpecialNeed,
  palette,
}: SpecialNeedEntrySectionProps) {
  const [isAdding, setIsAdding] = useState(Boolean(snCategory));

  const cancelAdd = () => {
    onCancelSpecialNeed();
    setIsAdding(false);
  };

  const confirmAdd = () => {
    onAddSpecialNeed();
    setIsAdding(false);
  };

  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>Session adjustments</ThemedText>
      <ThemedText style={[styles.hint, { color: palette.muted }]}>
        Add changes coaches should make during sessions.
      </ThemedText>

      {/* Existing special needs as cards */}
      {specialNeeds.map((sn) => (
        <View
          key={sn.id}
          style={[
            styles.snCard,
            { backgroundColor: withAlpha(palette.tint, 0.03), borderColor: palette.border },
          ]}
        >
          <Row align="center" justify="space-between">
            <ThemedText style={Typography.bodySemiBold}>{sn.name}</ThemedText>
            <Clickable
              onPress={() => onRemoveSpecialNeed(sn.id)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${sn.name}`}
              style={styles.removeAction}
            >
              <Ionicons name="close-circle" size={20} color={palette.error} />
            </Clickable>
          </Row>
          {sn.severity && (
            <ThemedText style={[Typography.caption, { color: palette.muted }]}>
              {sn.severity}
            </ThemedText>
          )}
        </View>
      ))}

      {!isAdding ? (
        <Button onPress={() => setIsAdding(true)} variant="outline" label="Add adjustment" />
      ) : (
        <>
          <ThemedText style={[styles.hint, { color: palette.muted }]}>
            Choose an adjustment type
          </ThemedText>
          <Row style={styles.optionGrid}>
            {SPECIAL_NEEDS_CATEGORIES.map((cat) => {
              const isActive = snCategory === cat.id;
              return (
                <Clickable
                  key={cat.id}
                  onPress={() => onSnCategoryChange(cat.id)}
                  accessibilityRole="radio"
                  accessibilityLabel={cat.label}
                  accessibilityState={{ selected: isActive, checked: isActive }}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: isActive ? withAlpha(palette.tint, 0.09) : palette.surface,
                      borderColor: isActive ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[styles.optionText, { color: isActive ? palette.tint : palette.text }]}
                  >
                    {cat.label}
                  </ThemedText>
                </Clickable>
              );
            })}
          </Row>
          {!snCategory ? (
            <Clickable
              onPress={cancelAdd}
              accessibilityRole="button"
              accessibilityLabel="Cancel adjustment"
              style={styles.cancelLink}
            >
              <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
            </Clickable>
          ) : null}
        </>
      )}

      {/* Detail panel when category selected */}
      {snCategory && (
        <View
          style={[
            styles.addDescriptionBox,
            { backgroundColor: withAlpha(palette.tint, 0.03), borderColor: palette.border },
          ]}
        >
          <TextInput
            style={[styles.smallInput, { borderColor: palette.border, color: palette.text }]}
            accessibilityLabel="Adjustment name"
            placeholder="Adjustment name"
            placeholderTextColor={palette.muted}
            value={snName}
            onChangeText={onSnNameChange}
            maxLength={50}
          />

          <TextInput
            style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
            accessibilityLabel="Adjustment description, optional"
            placeholder="Description (optional)"
            placeholderTextColor={palette.muted}
            value={snDescription}
            onChangeText={onSnDescriptionChange}
            multiline
            numberOfLines={2}
            maxLength={500}
          />

          <View style={styles.tagField}>
            <ThemedText style={[styles.hint, { color: palette.muted }]}>Severity</ThemedText>
            <Row style={styles.severityRow}>
              {SEVERITY_OPTIONS.map((opt) => {
                const isActive = snSeverity === opt.key;
                return (
                  <Clickable
                    key={opt.key}
                    onPress={() => onSnSeverityChange(opt.key)}
                    accessibilityRole="radio"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ selected: isActive, checked: isActive }}
                    style={[
                      styles.severityChip,
                      {
                        backgroundColor: isActive ? withAlpha(palette.tint, 0.12) : palette.surface,
                        borderColor: isActive ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: isActive ? palette.tint : palette.text },
                      ]}
                    >
                      {opt.label}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </Row>
          </View>

          <View style={styles.tagField}>
            <ThemedText style={[styles.hint, { color: palette.muted }]}>
              Accommodations needed
            </ThemedText>
            <TagInput
              label="accommodation"
              tags={snAccommodations}
              onChange={onSnAccommodationsChange}
              placeholder="e.g. Visual timers"
              palette={palette}
            />
          </View>

          <TextInput
            style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
            accessibilityLabel="Tips for coaches, optional"
            placeholder="Tips for coaches (optional)"
            placeholderTextColor={palette.muted}
            value={snParentHints}
            onChangeText={onSnParentHintsChange}
            multiline
            numberOfLines={2}
            maxLength={500}
          />

          <Row style={styles.addButtonRow}>
            <Clickable
              onPress={cancelAdd}
              accessibilityRole="button"
              accessibilityLabel="Cancel adjustment"
            >
              <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
            </Clickable>
            <Button
              onPress={confirmAdd}
              size="small"
              disabled={!snName.trim()}
              label="Add adjustment"
            />
          </Row>
        </View>
      )}
    </View>
  );
};

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  field: { gap: Spacing.xs },
  label: { ...Typography.bodySmall, fontWeight: '500' },
  hint: { ...Typography.small },
  optionGrid: { flexWrap: 'wrap', gap: Spacing.xs },
  optionChip: {
    minHeight: 44,
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  optionText: { ...Typography.small, fontWeight: '500' },
  savedItem: {
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  removeAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLink: {
    minHeight: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  addDescriptionBox: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  smallInput: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  addButtonRow: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
  },
  tagField: { gap: Spacing.xxs },
  tagInputContainer: { gap: Spacing.xs },
  tagRow: { flexWrap: 'wrap', gap: Spacing.xs },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  tagInputRow: { gap: Spacing.xs, alignItems: 'center' },
  tagInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.xs,
    ...Typography.small,
  },
  tagAddButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snCard: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xxs,
  },
  severityRow: { gap: Spacing.xs },
  severityChip: {
    flex: 1,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
});
