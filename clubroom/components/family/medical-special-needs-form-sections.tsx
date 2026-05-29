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
  tags,
  onChange,
  placeholder,
  palette,
}: {
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
  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>Disabilities</ThemedText>
      <ThemedText style={[styles.hint, { color: palette.muted }]}>Select any that apply</ThemedText>
      <Row style={styles.optionGrid}>
        {DISABILITY_TYPES.map((type) => {
          const isSelected = disabilities.some((d) => d.type === type);
          return (
            <Clickable
              key={type}
              onPress={() => {
                if (isSelected) {
                  onDisabilitiesChange(disabilities.filter((d) => d.type !== type));
                } else {
                  onSelectedDisabilityTypeChange(type);
                }
              }}
              style={[
                styles.optionChip,
                {
                  backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border,
                },
              ]}
            >
              {isSelected && <Ionicons name="checkmark" size={14} color={palette.tint} />}
              <ThemedText
                style={[styles.optionText, { color: isSelected ? palette.tint : palette.text }]}
              >
                {type}
              </ThemedText>
            </Clickable>
          );
        })}
      </Row>

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
            placeholder="Add any details that would help coaches (optional)"
            placeholderTextColor={palette.muted}
            value={disabilityDescription}
            onChangeText={onDisabilityDescriptionChange}
            multiline
            numberOfLines={2}

            maxLength={500}
          />

          <TextInput
            style={[styles.smallInput, { borderColor: palette.border, color: palette.text }]}
            placeholder="Diagnosis year (e.g. 2020)"
            placeholderTextColor={palette.muted}
            value={diagnosisDate}
            onChangeText={onDiagnosisDateChange}
            keyboardType="number-pad"
            maxLength={10}
          />

          <TextInput
            style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
            placeholder="Support required (e.g. clear short instructions, regular breaks)"
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
              tags={calmingStrategies}
              onChange={onCalmingStrategiesChange}
              placeholder="e.g. Counting to 10"
              palette={palette}
            />
          </View>

          <Row style={styles.addButtonRow}>
            <Clickable onPress={() => onSelectedDisabilityTypeChange(null)}>
              <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
            </Clickable>
            <Button onPress={onAddDisability} size="small" label="Add" />
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
  onSnCategoryChange: (v: SpecialNeed['category']) => void;
  onSnNameChange: (v: string) => void;
  onSnDescriptionChange: (v: string) => void;
  onSnSeverityChange: (v: SpecialNeed['severity']) => void;
  onSnAccommodationsChange: (v: string[]) => void;
  onSnParentHintsChange: (v: string) => void;
  onAddSpecialNeed: () => void;
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
  onRemoveSpecialNeed,
  palette,
}: SpecialNeedEntrySectionProps) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>Special Needs & Accommodations</ThemedText>
      <ThemedText style={[styles.hint, { color: palette.muted }]}>
        What accommodations does your child need? (optional)
      </ThemedText>

      {/* Existing special needs as cards */}
      {specialNeeds.map((sn) => (
        <View
          key={sn.id}
          style={[styles.snCard, { backgroundColor: withAlpha(palette.tint, 0.03), borderColor: palette.border }]}
        >
          <Row align="center" justify="space-between">
            <ThemedText style={Typography.bodySemiBold}>{sn.name}</ThemedText>
            <Clickable onPress={() => onRemoveSpecialNeed(sn.id)}>
              <Ionicons name="close-circle" size={20} color={palette.error} />
            </Clickable>
          </Row>
          {sn.severity && (
            <ThemedText style={[Typography.caption, { color: palette.muted }]}>{sn.severity}</ThemedText>
          )}
        </View>
      ))}

      {/* Category picker */}
      <Row style={styles.optionGrid}>
        {SPECIAL_NEEDS_CATEGORIES.map((cat) => {
          const isActive = snCategory === cat.id;
          return (
            <Clickable
              key={cat.id}
              onPress={() => onSnCategoryChange(cat.id)}
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
            placeholder="Name (e.g. Noise Sensitivity)"
            placeholderTextColor={palette.muted}
            value={snName}
            onChangeText={onSnNameChange}

            maxLength={50}
          />

          <TextInput
            style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
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
                    style={[
                      styles.severityChip,
                      {
                        backgroundColor: isActive
                          ? withAlpha(palette.tint, 0.12)
                          : palette.surface,
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
              tags={snAccommodations}
              onChange={onSnAccommodationsChange}
              placeholder="e.g. Visual timers"
              palette={palette}
            />
          </View>

          <TextInput
            style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
            placeholder="Tips for coaches (e.g. Give 5-min warning before transitions)"
            placeholderTextColor={palette.muted}
            value={snParentHints}
            onChangeText={onSnParentHintsChange}
            multiline
            numberOfLines={2}

            maxLength={500}
          />

          <Row style={styles.addButtonRow}>
            <Clickable onPress={() => onSnCategoryChange(snCategory)}>
              <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
            </Clickable>
            <Button
              onPress={onAddSpecialNeed}
              size="small"
              disabled={!snName.trim()}
              label="Add"
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
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  optionText: { ...Typography.small, fontWeight: '500' },
  addDescriptionBox: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  smallInput: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
  },
  textArea: {
    borderWidth: 1.5,
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
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.xs,
    ...Typography.small,
  },
  tagAddButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.pill,
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
