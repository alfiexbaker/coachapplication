/**
 * QuickRecognitionModal — 3-tap coach recognition flow.
 * Category → Template → Done. Under 5 seconds.
 */
import { memo, useCallback, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { Avatar } from '@/components/ui/primitives';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha, Components } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/components/ui/toast';
import { badgeService } from '@/services/badge-service';
import { CategoryInfo } from '@/constants/progression';
import { getTemplatesForCategory, type RecognitionTemplate } from '@/constants/recognition-templates';
import { createLogger } from '@/utils/logger';
import type { BadgeCategory, BadgeAward } from '@/constants/types';

const logger = createLogger('QuickRecognition');

interface QuickRecognitionModalProps {
  visible: boolean;
  athleteId: string;
  athleteName: string;
  athleteAvatar?: string;
  coachId: string;
  sessionId?: string;
  sessionLabel?: string;
  onClose: () => void;
  onAwarded?: (award: BadgeAward) => void;
}

const CATEGORIES: BadgeCategory[] = ['technical', 'physical', 'psychological', 'social'];

const CATEGORY_ICONS: Record<BadgeCategory, string> = {
  technical: 'football-outline',
  physical: 'fitness-outline',
  psychological: 'bulb-outline',
  social: 'people-outline',
};

export function QuickRecognitionModal({
  visible,
  athleteId,
  athleteName,
  athleteAvatar,
  coachId,
  sessionId,
  sessionLabel,
  onClose,
  onAwarded,
}: QuickRecognitionModalProps) {
  const { colors: palette } = useTheme();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | null>(null);
  const [customNote, setCustomNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [cooldownError, setCooldownError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setSelectedCategory(null);
    setCustomNote('');
    setShowNoteInput(false);
    setAwarding(false);
    setCooldownError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleCategorySelect = useCallback((category: BadgeCategory) => {
    Haptics.selectionAsync();
    setSelectedCategory(category);
    setCooldownError(null);
  }, []);

  const handleBackToCategories = useCallback(() => {
    Haptics.selectionAsync();
    setSelectedCategory(null);
    setCooldownError(null);
  }, []);

  const handleTemplateSelect = useCallback(async (template: RecognitionTemplate) => {
    if (awarding) return;

    setAwarding(true);
    setCooldownError(null);
    Haptics.selectionAsync();

    const badge = badgeService.findBadgeForCategory(template.category);
    if (!badge) {
      setCooldownError('No badge found for this category.');
      setAwarding(false);
      return;
    }

    const result = await badgeService.awardBadge({
      badgeId: badge.id,
      athleteId,
      coachId,
      sessionId,
      reason: template.message,
      note: customNote.trim() || undefined,
      visibility: 'supporters',
      overrideCooldown: false,
    });

    if (!result.success) {
      const msg = result.error.message;
      if (msg.includes('Cooldown')) {
        setCooldownError(msg);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        setCooldownError(msg);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setAwarding(false);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast('Recognition sent', 'success');
    onAwarded?.(result.data);
    logger.info('quick_recognition_awarded', {
      athleteId,
      coachId,
      sessionId,
      category: template.category,
      templateId: template.id,
    });

    setTimeout(() => {
      resetState();
      onClose();
    }, 500);
  }, [awarding, athleteId, coachId, sessionId, customNote, showToast, onAwarded, resetState, onClose]);

  const handleToggleNote = useCallback(() => {
    Haptics.selectionAsync();
    setShowNoteInput((prev) => !prev);
  }, []);

  const templates = selectedCategory ? getTemplatesForCategory(selectedCategory) : [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.backdrop, { backgroundColor: palette.overlay }]}>
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[
            styles.sheet,
            { backgroundColor: palette.background, paddingBottom: insets.bottom + Spacing.md },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: palette.border }]} />
          </View>

          {/* Athlete header */}
          <Row gap="sm" align="center" style={styles.header}>
            <Avatar name={athleteName} photoUrl={athleteAvatar} size="md" />
            <Column gap="micro">
              <ThemedText type="defaultSemiBold" style={Typography.heading}>
                {athleteName}
              </ThemedText>
              {sessionLabel ? (
                <ThemedText style={[Typography.caption, { color: palette.textSecondary }]}>
                  {sessionLabel}
                </ThemedText>
              ) : null}
            </Column>
            <View style={{ flex: 1 }} />
            <Clickable
              onPress={handleClose}
              style={[styles.closeButton, { backgroundColor: withAlpha(palette.text, 0.06) }]}
              accessibilityLabel="Close recognition modal"
            >
              <Ionicons name="close" size={20} color={palette.text} />
            </Clickable>
          </Row>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {!selectedCategory ? (
              /* Category grid */
              <Animated.View entering={FadeIn.duration(200)}>
                <ThemedText
                  style={[Typography.bodySmall, { color: palette.textSecondary, marginBottom: Spacing.sm }]}
                >
                  What would you like to recognise?
                </ThemedText>
                <View style={styles.categoryGrid}>
                  {CATEGORIES.map((category) => (
                    <CategoryButton
                      key={category}
                      category={category}
                      onPress={handleCategorySelect}
                    />
                  ))}
                </View>
              </Animated.View>
            ) : (
              /* Template list */
              <Animated.View entering={FadeIn.duration(200)}>
                <Row align="center" gap="xs" style={{ marginBottom: Spacing.sm }}>
                  <Clickable
                    onPress={handleBackToCategories}
                    style={styles.backButton}
                    accessibilityLabel="Back to categories"
                  >
                    <Ionicons name="chevron-back" size={20} color={palette.tint} />
                  </Clickable>
                  <Ionicons
                    name={CATEGORY_ICONS[selectedCategory] as any}
                    size={20}
                    color={palette.tint}
                  />
                  <ThemedText type="defaultSemiBold" style={[Typography.subheading, { color: palette.tint }]}>
                    {CategoryInfo[selectedCategory].label}
                  </ThemedText>
                </Row>

                <Column gap="xs">
                  {templates.map((template) => (
                    <TemplateRow
                      key={template.id}
                      template={template}
                      onPress={handleTemplateSelect}
                      disabled={awarding}
                    />
                  ))}
                </Column>

                {/* Cooldown error */}
                {cooldownError ? (
                  <Animated.View entering={FadeIn.duration(200)}>
                    <SurfaceCard
                      style={[styles.errorBanner, { borderColor: withAlpha(palette.warning, 0.3) }]}
                    >
                      <Row align="center" gap="xs">
                        <Ionicons name="time-outline" size={16} color={palette.warning} />
                        <ThemedText
                          style={[Typography.bodySmall, { color: palette.warning, flex: 1 }]}
                        >
                          {cooldownError}
                        </ThemedText>
                      </Row>
                    </SurfaceCard>
                  </Animated.View>
                ) : null}

                {/* Optional note */}
                <Clickable
                  onPress={handleToggleNote}
                  style={styles.addNoteButton}
                  accessibilityLabel={showNoteInput ? 'Hide note' : 'Add a note'}
                >
                  <Row align="center" gap="xs">
                    <Ionicons
                      name={showNoteInput ? 'chevron-up' : 'create-outline'}
                      size={16}
                      color={palette.textSecondary}
                    />
                    <ThemedText style={[Typography.bodySmall, { color: palette.textSecondary }]}>
                      {showNoteInput ? 'Hide note' : 'Add a note (optional)'}
                    </ThemedText>
                  </Row>
                </Clickable>

                {showNoteInput ? (
                  <Animated.View entering={FadeIn.duration(150)}>
                    <TextInput
                      value={customNote}
                      onChangeText={setCustomNote}
                      placeholder="Add a personal note..."
                      placeholderTextColor={palette.textTertiary}
                      multiline
                      style={[
                        styles.noteInput,
                        {
                          color: palette.text,
                          backgroundColor: withAlpha(palette.text, 0.04),
                          borderColor: palette.border,
                        },
                      ]}
                      accessibilityLabel="Personal note for recognition"
                    />
                  </Animated.View>
                ) : null}
              </Animated.View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ——— Sub-components ———

interface CategoryButtonProps {
  category: BadgeCategory;
  onPress: (category: BadgeCategory) => void;
}

const CategoryButton = memo(function CategoryButton({ category, onPress }: CategoryButtonProps) {
  const { colors: palette } = useTheme();
  const info = CategoryInfo[category];
  const icon = CATEGORY_ICONS[category];

  const handlePress = useCallback(() => {
    onPress(category);
  }, [onPress, category]);

  return (
    <SurfaceCard
      onPress={handlePress}
      style={styles.categoryButton}
      accessibilityLabel={`Recognise ${info.label} development`}
    >
      <Column align="center" gap="xs" style={styles.categoryButtonInner}>
        <View
          style={[
            styles.categoryIconCircle,
            { backgroundColor: withAlpha(palette.tint, 0.08) },
          ]}
        >
          <Ionicons name={icon as any} size={24} color={palette.tint} />
        </View>
        <ThemedText type="defaultSemiBold" style={Typography.bodySmallSemiBold}>
          {info.label}
        </ThemedText>
      </Column>
    </SurfaceCard>
  );
});

interface TemplateRowProps {
  template: RecognitionTemplate;
  onPress: (template: RecognitionTemplate) => void;
  disabled: boolean;
}

const TemplateRow = memo(function TemplateRow({ template, onPress, disabled }: TemplateRowProps) {
  const { colors: palette } = useTheme();

  const handlePress = useCallback(() => {
    onPress(template);
  }, [onPress, template]);

  return (
    <Clickable
      onPress={handlePress}
      disabled={disabled}
      style={[
        styles.templateRow,
        { backgroundColor: withAlpha(palette.text, 0.02), borderColor: palette.border },
      ]}
      accessibilityLabel={`Recognise: ${template.label}`}
    >
      <Column gap="micro">
        <ThemedText type="defaultSemiBold" style={Typography.bodySemiBold}>
          {template.label}
        </ThemedText>
        <ThemedText style={[Typography.bodySmall, { color: palette.textSecondary }]}>
          {template.message}
        </ThemedText>
      </Column>
    </Clickable>
  );
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, maxHeight: '85%' },
  handleContainer: { alignItems: 'center', paddingVertical: Spacing.sm },
  handle: { width: 36, height: 4, borderRadius: Radii.xs },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryButton: {
    width: '47%',
    flexGrow: 1,
  },
  categoryButtonInner: {
    paddingVertical: Spacing.md,
  },
  categoryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: Components.button.height,
    height: Components.button.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateRow: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    minHeight: Components.button.height,
    justifyContent: 'center',
  },
  errorBanner: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  addNoteButton: {
    marginTop: Spacing.md,
    minHeight: Components.button.height,
    justifyContent: 'center',
  },
  noteInput: {
    ...Typography.body,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
