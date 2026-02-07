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
import { Colors, Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { SessionTemplate, SessionType } from '@/constants/session-types';

const DURATION_OPTIONS = [30, 45, 60, 90];
const TYPE_OPTIONS: { key: SessionType; label: string }[] = [
  { key: '1-to-1', label: '1-on-1' },
  { key: 'small-group', label: 'Small Group' },
  { key: 'clinic', label: 'Clinic' },
  { key: 'assessment', label: 'Assessment' },
];

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [name, setName] = useState('');
  const [type, setType] = useState<SessionType>('1-to-1');
  const [duration, setDuration] = useState(60);
  const [capacity, setCapacity] = useState(1);
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');

  // Reset form when modal opens/template changes
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: palette.surface }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: palette.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="subtitle">
              {existing ? 'Edit Session Type' : 'New Session Type'}
            </ThemedText>
            <Clickable onPress={onClose}>
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
          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Type</ThemedText>
            <View style={styles.segmentRow}>
              {TYPE_OPTIONS.map((opt) => (
                <Clickable
                  key={opt.key}
                  onPress={() => {
                    setType(opt.key);
                    if (opt.key === '1-to-1' || opt.key === 'assessment') setCapacity(1);
                  }}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: type === opt.key ? palette.tint : palette.background,
                      borderColor: type === opt.key ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <ThemedText style={[
                    styles.segmentText,
                    { color: type === opt.key ? Colors.light.onPrimary : palette.text },
                  ]}>
                    {opt.label}
                  </ThemedText>
                </Clickable>
              ))}
            </View>
          </View>

          {/* Duration */}
          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Duration</ThemedText>
            <View style={styles.segmentRow}>
              {DURATION_OPTIONS.map((d) => (
                <Clickable
                  key={d}
                  onPress={() => setDuration(d)}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: duration === d ? palette.tint : palette.background,
                      borderColor: duration === d ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <ThemedText style={[
                    styles.segmentText,
                    { color: duration === d ? Colors.light.onPrimary : palette.text },
                  ]}>
                    {d}m
                  </ThemedText>
                </Clickable>
              ))}
            </View>
          </View>

          {/* Capacity + Price row */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Max Athletes</ThemedText>
              <View style={[styles.stepperRow, { borderColor: palette.border, backgroundColor: palette.background }]}>
                <Clickable
                  onPress={() => setCapacity(Math.max(1, capacity - 1))}
                  style={styles.stepperBtn}
                >
                  <Ionicons name="remove" size={18} color={palette.text} />
                </Clickable>
                <ThemedText type="defaultSemiBold" style={styles.stepperValue}>{capacity}</ThemedText>
                <Clickable
                  onPress={() => setCapacity(Math.min(20, capacity + 1))}
                  style={styles.stepperBtn}
                >
                  <Ionicons name="add" size={18} color={palette.text} />
                </Clickable>
              </View>
            </View>

            <View style={[styles.field, { flex: 1 }]}>
              <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Price per Head</ThemedText>
              <View style={[styles.priceRow, { borderColor: palette.border, backgroundColor: palette.background }]}>
                <ThemedText style={{ color: palette.muted }}>£</ThemedText>
                <TextInput
                  style={[styles.priceInput, { color: palette.text }]}
                  placeholder="0"
                  placeholderTextColor={palette.muted}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />
              </View>
            </View>
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
            <Ionicons name="checkmark" size={20} color={Colors.light.onPrimary} />
            <ThemedText style={styles.saveBtnText}>Save</ThemedText>
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
  field: {
    gap: Spacing.xs,
  },
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
  segmentRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  segmentText: {
    ...Typography.smallSemiBold,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  stepperBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  stepperValue: {
    flex: 1,
    textAlign: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingLeft: Spacing.md,
  },
  priceInput: {
    flex: 1,
    padding: Spacing.md,
    paddingLeft: Spacing.xs,
    ...Typography.body,
  },
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
    color: Colors.light.onPrimary,
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
  deleteBtnText: {
    fontWeight: '600',
  },
});
