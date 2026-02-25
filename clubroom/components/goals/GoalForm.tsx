/**
 * GoalForm Component
 *
 * A form for creating or editing goals with category selection, date picker,
 * and milestone management. Supports both create and edit modes.
 */

import { useState, useCallback } from 'react';
import {
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { DateTimeField } from '@/components/ui/primitives/DateTimeField';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { Goal, GoalCategory, CreateGoalInput, UpdateGoalInput } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { progressService } from '@/services/progress-service';
import { scaleFont } from '@/utils/scale';
import { GoalMilestonesSection } from './goal-milestones-section';
import { GoalPreviewCard } from './goal-preview-card';
import { Row } from '@/components/primitives';
import { useToast } from '@/components/ui/toast';

const CATEGORIES: GoalCategory[] = [
  'BALL_SKILLS',
  'ATTACKING',
  'DEFENDING',
  'GAME_SENSE',
  'CHARACTER',
  'OTHER',
];
const CATEGORY_LABEL_OVERRIDES: Partial<Record<GoalCategory, string>> = {
  BALL_SKILLS: 'Ball Skills',
  GAME_SENSE: 'Game Sense',
};

interface GoalFormProps {
  goal?: Goal;
  onSubmit: (data: CreateGoalInput | UpdateGoalInput) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export function GoalForm({ goal, onSubmit, onCancel, loading = false }: GoalFormProps) {
  const { colors: palette } = useTheme();
  const { showToast } = useToast();
  const isEditing = Boolean(goal);

  const [title, setTitle] = useState(goal?.title ?? '');
  const [description, setDescription] = useState(goal?.description ?? '');
  const [category, setCategory] = useState<GoalCategory>(goal?.category ?? 'OTHER');
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '');
  const [milestones, setMilestones] = useState<string[]>(
    goal?.milestones.map((m) => m.title) ?? [],
  );
  const [newMilestone, setNewMilestone] = useState('');

  const minTargetDate = new Date();
  minTargetDate.setHours(0, 0, 0, 0);
  minTargetDate.setDate(minTargetDate.getDate() + 1);

  const parsedTargetDate = targetDate ? new Date(`${targetDate}T00:00:00`) : null;
  const targetDateError =
    parsedTargetDate && parsedTargetDate.getTime() <= Date.now()
      ? 'Target must be in the future'
      : null;
  const isValid = title.trim().length > 0 && !targetDateError;

  const handleCategorySelect = useCallback((cat: GoalCategory) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategory(cat);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isValid || loading) return;
    if (targetDateError) {
      showToast('Target date must be in the future', 'error');
      return;
    }
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isEditing) {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        targetDate: targetDate || undefined,
      });
    } else {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        targetDate: targetDate || undefined,
        milestones: milestones.length > 0 ? milestones : undefined,
      });
    }
  }, [
    isValid,
    loading,
    targetDateError,
    isEditing,
    title,
    description,
    category,
    targetDate,
    milestones,
    onSubmit,
    showToast,
  ]);

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
          <Row style={styles.categoryGrid}>
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
                      backgroundColor: isSelected ? withAlpha(color, 0.09) : palette.surface,
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
                    style={[styles.categoryLabel, { color: isSelected ? color : palette.text }]}
                    numberOfLines={1}
                  >
                    {CATEGORY_LABEL_OVERRIDES[cat] ?? progressService.getCategoryInfo(cat).label}
                  </ThemedText>
                </Clickable>
              );
            })}
          </Row>
        </Animated.View>

        {/* Target Date */}
        <Animated.View entering={FadeInDown.delay(250)} style={styles.section}>
          <DateTimeField
            mode="date"
            value={targetDate}
            onChange={setTargetDate}
            label="Target Date (Optional)"
            minimumDate={minTargetDate}
            placeholder="Set a deadline to stay motivated"
            error={targetDateError ?? undefined}
          />
          <ThemedText style={[Typography.caption, { color: palette.muted }]}>
            Target must be in the future
          </ThemedText>
        </Animated.View>

        {/* Milestones (create only) */}
        {!isEditing && (
          <Animated.View entering={FadeInDown.delay(300)}>
            <GoalMilestonesSection
              milestones={milestones}
              newMilestone={newMilestone}
              onMilestonesChange={setMilestones}
              onNewMilestoneChange={setNewMilestone}
            />
          </Animated.View>
        )}

        {/* Preview */}
        <Animated.View entering={FadeInDown.delay(350)}>
          <GoalPreviewCard
            title={title}
            description={description}
            category={category}
            targetDate={targetDate}
            milestoneCount={milestones.length}
          />
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <Row style={[styles.footer, { borderTopColor: palette.border }]}>
        {onCancel && (
          <Button variant="outline" onPress={onCancel} style={styles.footerButton}>
            Cancel
          </Button>
        )}
        <Button
          onPress={handleSubmit}
          disabled={!isValid || loading}
          style={
            [styles.footerButton, !onCancel ? styles.fullWidthButton : undefined].filter(
              Boolean,
            ) as ViewStyle[]
          }
        >
          {loading ? 'Saving...' : isEditing ? 'Update Goal' : 'Create Goal'}
        </Button>
      </Row>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.lg },
  section: { gap: Spacing.xs },
  label: { fontSize: scaleFont(14), fontWeight: '600', marginBottom: Spacing.xxs },
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
  charCount: { fontSize: scaleFont(12), textAlign: 'right' },
  hint: { fontSize: scaleFont(13) },
  categoryGrid: { flexWrap: 'wrap', gap: Spacing.xs },
  categoryOption: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.xxs,
    maxWidth: '48%',
  },
  categoryLabel: { fontSize: scaleFont(13), fontWeight: '500', flexShrink: 1 },
  footer: { padding: Spacing.lg, borderTopWidth: 1, gap: Spacing.sm },
  footerButton: { flex: 1 },
  fullWidthButton: { flex: 1 },
});
