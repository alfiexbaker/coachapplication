/**
 * Session Type Modal
 *
 * Bottom sheet for creating/editing/deleting session type presets.
 */

import { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SessionTemplate, SessionType } from '@/constants/session-types';
import {
  DURATION_OPTIONS,
  TYPE_OPTIONS,
  SegmentSelector,
  CapacityStepper,
  PriceInput,
} from './session-type-modal-sections';

interface SessionTypeModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    type: SessionType;
    duration: number;
    capacity: number;
    defaultPrice: number;
    description: string;
  }) => void;
  onDelete?: () => void;
  existing?: SessionTemplate | null;
}

export function SessionTypeModal({
  visible,
  onClose,
  onSave,
  onDelete,
  existing,
}: SessionTypeModalProps) {
  const { colors: palette } = useTheme();

  const [name, setName] = useState('');
  const [type, setType] = useState<SessionType>('1-to-1');
  const [duration, setDuration] = useState(60);
  const [capacity, setCapacity] = useState(1);
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (visible) {
      if (existing) {
        setName(existing.name);
        setType(existing.type);
        setDuration(existing.duration);
        setCapacity(existing.capacity);
        setPrice(existing.defaultPrice > 0 ? String(existing.defaultPrice) : '');
        setDescription(existing.description || '');
      } else {
        setName('');
        setType('1-to-1');
        setDuration(60);
        setCapacity(1);
        setPrice('');
        setDescription('');
      }
    }
  }, [visible, existing]);

  const isValid = name.trim().length > 0;

  const handleSave = () => {
    if (!isValid) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({
      name: name.trim(),
      type,
      duration,
      capacity,
      defaultPrice: Number(price) || 0,
      description: description.trim(),
    });
  };

  const handleDelete = () => {
    Alert.alert(
      `Delete "${name}"?`,
      "This won't affect existing bookings or invites.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onDelete?.();
          },
        },
      ]
    );
  };

  const handleTypeSelect = (key: SessionType) => {
    setType(key);
    if (key === '1-to-1' || key === 'assessment') setCapacity(1);
  };

  const durationOptions = DURATION_OPTIONS.map((d) => ({ key: d, label: `${d}m` }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: palette.surface }]}>
          <View style={[styles.handle, { backgroundColor: palette.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="subtitle">
              {existing ? 'Edit Session Type' : 'New Session Type'}
            </ThemedText>
            <Clickable accessibilityLabel="Close" onPress={onClose}>
              <Ionicons name="close" size={24} color={palette.muted} />
            </Clickable>
          </View>

          {/* Name */}
          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Name</ThemedText>
            <TextInput
              style={[styles.textInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.background }]}
              placeholder="e.g. 1-on-1 Skills Session"
              placeholderTextColor={palette.muted}
              value={name}
              onChangeText={(v) => setName(v.slice(0, 40))}
              autoFocus={!existing}
            />
          </View>

          {/* Type */}
          <SegmentSelector
            label="Type"
            options={TYPE_OPTIONS}
            selected={type}
            onSelect={handleTypeSelect}
            palette={palette}
          />

          {/* Duration */}
          <SegmentSelector
            label="Duration"
            options={durationOptions}
            selected={duration}
            onSelect={setDuration}
            palette={palette}
          />

          {/* Capacity + Price row */}
          <View style={styles.row}>
            <CapacityStepper
              value={capacity}
              onChange={setCapacity}
              palette={palette}
            />
            <PriceInput
              value={price}
              onChange={setPrice}
              palette={palette}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Description (optional)</ThemedText>
            <TextInput
              style={[styles.textAreaInput, { color: palette.text, borderColor: palette.border, backgroundColor: palette.background }]}
              placeholder="What athletes can expect"
              placeholderTextColor={palette.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={200}
            />
          </View>

          {/* Save Button */}
          <Clickable
            onPress={handleSave}
            style={[
              styles.saveBtn,
              { backgroundColor: isValid ? palette.tint : palette.border },
            ]}
          >
            <Ionicons name="checkmark" size={20} color={palette.onPrimary} />
            <ThemedText style={[styles.saveBtnText, { color: palette.onPrimary }]}>Save</ThemedText>
          </Clickable>

          {/* Delete Button (edit mode only) */}
          {existing && onDelete && (
            <Clickable onPress={handleDelete} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color={palette.error} />
              <ThemedText style={[styles.deleteBtnText, { color: palette.error }]}>
                Delete this session type
              </ThemedText>
            </Clickable>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
    maxHeight: '90%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  field: { gap: Spacing.xs },
  fieldLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    ...Typography.body,
  },
  textAreaInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    minHeight: 60,
    textAlignVertical: 'top',
    ...Typography.body,
  },
  row: { flexDirection: 'row', gap: Spacing.md },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    marginTop: Spacing.xs,
  },
  saveBtnText: {
    fontWeight: '600',
    fontSize: Typography.body.fontSize,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  deleteBtnText: { fontWeight: '600' },
});
