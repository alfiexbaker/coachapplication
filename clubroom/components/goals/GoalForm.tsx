/**
 * GoalForm Component
 *
 * A form for creating or editing goals with category selection, date picker,
 * and milestone management. Supports both create and edit modes.
 */

import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { CategoryBadge } from './CategoryBadge';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { Goal, GoalCategory, CreateGoalInput, UpdateGoalInput } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { progressService } from '@/services/progress-service';
import { scaleFont } from '@/utils/scale';

const CATEGORIES: GoalCategory[] = ['SPEED', 'TECHNIQUE', 'FITNESS', 'TACTICAL', 'MENTAL', 'OTHER'];

interface GoalFormProps {
  /** Existing goal to edit (undefined for create mode) */
  goal?: Goal;
  /** Callback when form is submitted */
  onSubmit: (data: CreateGoalInput | UpdateGoalInput) => Promise<void>;
  /** Callback when form is cancelled */
  onCancel?: () => void;
  /** Whether submission is in progress */
  loading?: boolean;
}

/**
 * Form for creating or editing goals.
 *
 * @example
 * ```tsx
 * // Create mode
 * <GoalForm onSubmit={handleCreate} onCancel={goBack} />
 *
 * // Edit mode
 * <GoalForm goal={existingGoal} onSubmit={handleUpdate} onCancel={goBack} />
 * ```
 */
export function GoalForm({ goal, onSubmit, onCancel, loading = false }: GoalFormProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const isEditing = Boolean(goal);

  // Form state
  const [title, setTitle] = useState(goal?.title ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [category, setCategory] = useState<GoalCategory>(goal?.category ?? 'OTHER');
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '');
  const [milestones, setMilestones] = useState<string[]>(
    goal?.milestones.map((m) => m.title) ?? []
  );
  const [newMilestone, setNewMilestone] = useState('');

  const isValid = title.trim().length > 0;

  const handleCategorySelect = useCallback((cat: GoalCategory) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategory(cat);
  }, []);

  const handleAddMilestone = useCallback(() => {
    if (!newMilestone.trim()) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMilestones((prev) => [...prev, newMilestone.trim()]);
    setNewMilestone('');
  }, [newMilestone]);

  const handleRemoveMilestone = useCallback((index: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isValid || loading) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isEditing) {
      const updates: UpdateGoalInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        targetDate: targetDate || undefined,
      };
      await onSubmit(updates);
    } else {
      const createData: CreateGoalInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        targetDate: targetDate || undefined,
        milestones: milestones.length > 0 ? milestones : undefined,
      };
      await onSubmit(createData);
    }
  }, [isValid, loading, isEditing, title, description, category, targetDate, milestones, onSubmit]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.section}>
          <ThemedText style={styles.label}>Goal Title *</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.surface,
                color: palette.text,
                borderColor: palette.border,
              },
            ]}
            placeholder="What do you want to achieve?"
            placeholderTextColor={palette.muted}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            returnKeyType="next"
          />
          <ThemedText style={[styles.charCount, { color: palette.muted }]}>
            {title.length}/100
          </ThemedText>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.delay(150)} style={styles.section}>
          <ThemedText style={styles.label}>Description (Optional)</ThemedText>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: palette.surface,
                color: palette.text,
                borderColor: palette.border,
              },
            ]}
            placeholder="Describe your goal in more detail..."
            placeholderTextColor={palette.muted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={500}
          />
          <ThemedText style={[styles.charCount, { color: palette.muted }]}>
            {description.length}/500
          </ThemedText>
        </Animated.View>

        {/* Category */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <ThemedText style={styles.label}>Category</ThemedText>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const { color, icon } = progressService.getCategoryInfo(cat);
              const isSelected = category === cat;

              return (
                <Clickable
                  key={cat}
                  onPress={() => handleCategorySelect(cat)}
                  style={[
                    styles.categoryOption,
                    {
                      backgroundColor: isSelected ? `${color}15` : palette.surface,
                      borderColor: isSelected ? color : palette.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={isSelected ? color : palette.muted}
                  />
                  <ThemedText
                    style={[
                      styles.categoryLabel,
                      { color: isSelected ? color : palette.text },
                    ]}
                  >
                    {progressService.getCategoryInfo(cat).label}
                  </ThemedText>
                </Clickable>
              );
            })}
          </View>
        </Animated.View>

        {/* Target Date */}
        <Animated.View entering={FadeInDown.delay(250)} style={styles.section}>
          <ThemedText style={styles.label}>Target Date (Optional)</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.surface,
                color: palette.text,
                borderColor: palette.border,
              },
            ]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={palette.muted}
            value={targetDate}
            onChangeText={setTargetDate}
            keyboardType="numbers-and-punctuation"
          />
          <ThemedText style={[styles.hint, { color: palette.muted }]}>
            Set a deadline to stay motivated
          </ThemedText>
        </Animated.View>

        {/* Milestones (only for create mode) */}
        {!isEditing && (
          <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
            <ThemedText style={styles.label}>
              Milestones (Optional)
            </ThemedText>
            <ThemedText style={[styles.hint, { color: palette.muted, marginBottom: Spacing.sm }]}>
              Break your goal into smaller steps
            </ThemedText>

            {/* Existing milestones */}
            {milestones.map((ms, index) => (
              <SurfaceCard key={index} style={styles.milestoneItem}>
                <View style={styles.milestoneContent}>
                  <Ionicons name="flag-outline" size={16} color={palette.muted} />
                  <ThemedText style={styles.milestoneText} numberOfLines={1}>
                    {ms}
                  </ThemedText>
                </View>
                <Clickable onPress={() => handleRemoveMilestone(index)} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={palette.error} />
                </Clickable>
              </SurfaceCard>
            ))}

            {/* Add milestone input */}
            <View style={styles.addMilestoneRow}>
              <TextInput
                style={[
                  styles.milestoneInput,
                  {
                    backgroundColor: palette.surface,
                    color: palette.text,
                    borderColor: palette.border,
                  },
                ]}
                placeholder="Add a milestone..."
                placeholderTextColor={palette.muted}
                value={newMilestone}
                onChangeText={setNewMilestone}
                onSubmitEditing={handleAddMilestone}
                returnKeyType="done"
              />
              <Clickable
                onPress={handleAddMilestone}
                disabled={!newMilestone.trim()}
                style={[
                  styles.addMilestoneButton,
                  {
                    backgroundColor: newMilestone.trim()
                      ? palette.tint
                      : palette.border,
                  },
                ]}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
              </Clickable>
            </View>

            {milestones.length === 0 && (
              <View style={[styles.milestoneTip, { backgroundColor: palette.surfaceSecondary }]}>
                <Ionicons name="bulb-outline" size={18} color={palette.warning} />
                <ThemedText style={[styles.tipText, { color: palette.muted }]}>
                  Tip: Goals with milestones are 3x more likely to be achieved!
                </ThemedText>
              </View>
            )}
          </Animated.View>
        )}

        {/* Preview */}
        <Animated.View entering={FadeInDown.delay(350)} style={styles.section}>
          <ThemedText style={styles.label}>Preview</ThemedText>
          <SurfaceCard style={styles.preview}>
            <View style={styles.previewHeader}>
              <CategoryBadge category={category} />
              <ThemedText style={[styles.previewProgress, { color: palette.muted }]}>
                0%
              </ThemedText>
            </View>
            <ThemedText type="defaultSemiBold" style={styles.previewTitle}>
              {title || 'Your goal title'}
            </ThemedText>
            {description && (
              <ThemedText style={[styles.previewDescription, { color: palette.muted }]} numberOfLines={2}>
                {description}
              </ThemedText>
            )}
            {targetDate && (
              <View style={styles.previewMeta}>
                <Ionicons name="calendar-outline" size={14} color={palette.muted} />
                <ThemedText style={[styles.previewMetaText, { color: palette.muted }]}>
                  Target: {progressService.formatTargetDate(targetDate)}
                </ThemedText>
              </View>
            )}
            {milestones.length > 0 && (
              <View style={styles.previewMeta}>
                <Ionicons name="flag-outline" size={14} color={palette.muted} />
                <ThemedText style={[styles.previewMetaText, { color: palette.muted }]}>
                  {milestones.length} milestone{milestones.length !== 1 ? 's' : ''}
                </ThemedText>
              </View>
            )}
          </SurfaceCard>
        </Animated.View>
      </ScrollView>

      {/* Footer buttons */}
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        {onCancel && (
          <Button variant="outline" onPress={onCancel} style={styles.footerButton}>
            Cancel
          </Button>
        )}
        <Button
          onPress={handleSubmit}
          disabled={!isValid || loading}
          style={[styles.footerButton, !onCancel && styles.fullWidthButton]}
        >
          {loading ? 'Saving...' : isEditing ? 'Update Goal' : 'Create Goal'}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    marginBottom: 4,
  },
  input: {
    height: 48,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    fontSize: scaleFont(15),
  },
  textArea: {
    minHeight: 88,
    borderRadius: Radii.md,
    padding: Spacing.md,
    borderWidth: 1,
    fontSize: scaleFont(15),
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: scaleFont(12),
    textAlign: 'right',
  },
  hint: {
    fontSize: scaleFont(13),
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: 6,
  },
  categoryLabel: {
    fontSize: scaleFont(13),
    fontWeight: '500',
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  milestoneContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  milestoneText: {
    fontSize: scaleFont(14),
    flex: 1,
  },
  addMilestoneRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  milestoneInput: {
    flex: 1,
    height: 44,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    fontSize: scaleFont(14),
  },
  addMilestoneButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneTip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  tipText: {
    fontSize: scaleFont(13),
    flex: 1,
  },
  preview: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewProgress: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  previewTitle: {
    fontSize: scaleFont(16),
    marginTop: Spacing.xs,
  },
  previewDescription: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  previewMetaText: {
    fontSize: scaleFont(13),
  },
  footer: {
    flexDirection: 'row',
    padding: Spacing.lg,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
  fullWidthButton: {
    flex: 1,
  },
});
