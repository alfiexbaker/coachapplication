/**
 * CoachObservationModal — Add or edit a coach observation about an athlete.
 *
 * Uses React Native Modal with pageSheet presentation.
 * Category picker + text input + private toggle.
 */

import { memo, useState, useCallback, useEffect, useMemo, type ComponentProps } from 'react';
import { View, StyleSheet, TextInput, Modal, ScrollView, Switch, Alert, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  OBSERVATION_CATEGORIES,
  type CoachObservation,
  type ObservationCategory,
} from '@/services/coach-observation-service';

interface CoachObservationModalProps {
  visible: boolean;
  observation?: CoachObservation | null;
  onSave: (data: { text: string; category: ObservationCategory; isPrivate: boolean }) => void;
  onClose: () => void;
  saving?: boolean;
}

export const CoachObservationModal = memo(function CoachObservationModal({
  visible,
  observation,
  onSave,
  onClose,
  saving = false,
}: CoachObservationModalProps) {
  const { colors } = useTheme();
  const isEditing = !!observation;

  const [text, setText] = useState('');
  const [category, setCategory] = useState<ObservationCategory>('OTHER');
  const [isPrivate, setIsPrivate] = useState(false);
  const [initialState, setInitialState] = useState({
    text: '',
    category: 'OTHER' as ObservationCategory,
    isPrivate: false,
  });

  useEffect(() => {
    if (visible) {
      const nextText = observation?.text ?? '';
      const nextCategory = observation?.category ?? 'OTHER';
      const nextPrivate = observation?.isPrivate ?? false;
      setText(nextText);
      setCategory(nextCategory);
      setIsPrivate(nextPrivate);
      setInitialState({ text: nextText, category: nextCategory, isPrivate: nextPrivate });
    }
  }, [visible, observation]);

  const canSave = text.trim().length > 0 && !saving;
  const hasUnsavedChanges = useMemo(
    () =>
      text.trim() !== initialState.text.trim() ||
      category !== initialState.category ||
      isPrivate !== initialState.isPrivate,
    [text, category, isPrivate, initialState],
  );

  const handleSave = useCallback(() => {
    if (!canSave) return;
    Keyboard.dismiss();
    onSave({ text: text.trim(), category, isPrivate });
  }, [canSave, text, category, isPrivate, onSave]);

  const closeNow = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const handleClose = useCallback(() => {
    if (!hasUnsavedChanges || saving) {
      closeNow();
      return;
    }
    Alert.alert(
      'Discard Changes?',
      'You have unsaved observations. Are you sure you want to close?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: closeNow },
      ],
    );
  }, [hasUnsavedChanges, saving, closeNow]);

  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Row align="center" justify="space-between" style={styles.header}>
          <Clickable
            onPress={handleClose}
            accessibilityLabel="Close"
            style={styles.headerButton}
          >
            <ThemedText style={[Typography.body, { color: colors.muted }]}>Cancel</ThemedText>
          </Clickable>
          <ThemedText type="heading">
            {isEditing ? 'Edit Observation' : 'Add Observation'}
          </ThemedText>
          <Clickable
            onPress={handleSave}
            accessibilityLabel="Save observation"
            style={[styles.headerButton, { opacity: canSave ? 1 : 0.4 }]}
            disabled={!canSave}
          >
            <ThemedText style={[Typography.bodySemiBold, { color: colors.tint }]}>
              {saving ? 'Saving...' : 'Save'}
            </ThemedText>
          </Clickable>
        </Row>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.field}>
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>Category</ThemedText>
            <Row style={styles.categoryRow}>
              {OBSERVATION_CATEGORIES.map((cat) => {
                const isActive = category === cat.id;
                return (
                  <Clickable
                    key={cat.id}
                    onPress={() => setCategory(cat.id)}
                    accessibilityLabel={cat.label}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isActive
                          ? withAlpha(colors.tint, 0.12)
                          : withAlpha(colors.surface, 0.5),
                        borderColor: isActive ? colors.tint : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={cat.icon as IconName}
                      size={14}
                      color={isActive ? colors.tint : colors.muted}
                    />
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: isActive ? colors.tint : colors.muted },
                      ]}
                    >
                      {cat.label}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </Row>
          </View>

          <View style={styles.field}>
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>
              Observation
            </ThemedText>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="What have you observed? Strategies that work, things to watch for..."
              placeholderTextColor={colors.muted}
              multiline
              style={[
                styles.textInput,
                {
                  color: colors.text,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
              maxLength={2000}
            />
            <ThemedText style={[Typography.micro, { color: colors.muted, textTransform: 'none', alignSelf: 'flex-end' }]}>
              {text.length}/2000
            </ThemedText>
          </View>

          <Row align="center" justify="space-between" style={styles.toggleRow}>
            <View style={styles.toggleLabel}>
              <Row gap="xs" align="center">
                <Ionicons name="lock-closed" size={16} color={colors.muted} />
                <ThemedText style={Typography.body}>Private</ThemedText>
              </Row>
              <ThemedText style={[Typography.small, { color: colors.muted }]}>
                Only visible to you
              </ThemedText>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: colors.border, true: colors.tint }}
            />
          </Row>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  headerButton: {
    minHeight: Components.buttonCompact.height,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  content: {
    padding: Spacing.sm,
    gap: Spacing.md,
  },
  field: { gap: Spacing.xs },
  categoryRow: { flexWrap: 'wrap', gap: Spacing.xs },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    minHeight: Components.buttonCompact.height,
  },
  textInput: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    textAlignVertical: 'top',
    ...Typography.body,
  },
  toggleRow: { paddingVertical: Spacing.xs },
  toggleLabel: { flex: 1, gap: Spacing.micro },
});
