import { useState, useEffect, useRef, startTransition } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SessionTemplate, SessionType } from '@/constants/session-types';
import { SegmentSelector, CapacityStepper, PriceInput } from './session-type-modal-sections';
import { DURATION_OPTIONS, TYPE_OPTIONS } from './session-type-modal-helpers';
import { Row } from '@/components/primitives';
import { uiFeedback } from '@/services/ui-feedback';
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

interface SessionTypeFormSetters {
  setName: (value: string) => void;
  setType: (value: SessionType) => void;
  setDuration: (value: number) => void;
  setCapacity: (value: number) => void;
  setPrice: (value: string) => void;
  setDescription: (value: string) => void;
}

interface CapacityManualRef {
  current: boolean;
}

function resetSessionTypeForm(
  setters: SessionTypeFormSetters,
  capacityManuallySetRef: CapacityManualRef,
) {
  startTransition(() => {
    setters.setName('');
  });
  startTransition(() => {
    setters.setType('1-to-1');
  });
  startTransition(() => {
    setters.setDuration(60);
  });
  startTransition(() => {
    setters.setCapacity(1);
  });
  startTransition(() => {
    setters.setPrice('');
  });
  startTransition(() => {
    setters.setDescription('');
  });
  startTransition(() => {
    capacityManuallySetRef.current = false;
  });
}

function populateSessionTypeForm(
  existing: SessionTemplate,
  setters: SessionTypeFormSetters,
  capacityManuallySetRef: CapacityManualRef,
) {
  startTransition(() => {
    setters.setName(existing.name);
  });
  startTransition(() => {
    setters.setType(existing.type);
  });
  startTransition(() => {
    setters.setDuration(existing.duration);
  });
  startTransition(() => {
    setters.setCapacity(existing.capacity);
  });
  startTransition(() => {
    setters.setPrice(existing.defaultPrice > 0 ? String(existing.defaultPrice) : '');
  });
  startTransition(() => {
    setters.setDescription(existing.description || '');
  });
  startTransition(() => {
    capacityManuallySetRef.current = true;
  });
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
  const capacityManuallySetRef = useRef(false);

  useEffect(() => {
    const setters = {
      setName,
      setType,
      setDuration,
      setCapacity,
      setPrice,
      setDescription,
    };

    if (visible) {
      if (existing) {
        populateSessionTypeForm(existing, setters, capacityManuallySetRef);
      } else {
        resetSessionTypeForm(setters, capacityManuallySetRef);
      }
    } else {
      resetSessionTypeForm(setters, capacityManuallySetRef);
    }
  }, [visible, existing]);
  const trimmedName = name.trim();
  const isValid = trimmedName.length >= 3;
  const handleSave = () => {
    if (!isValid) return;
    Keyboard.dismiss();
    if (Platform.OS !== 'web')
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
  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };
  const handleDelete = () => {
    uiFeedback.alert(`Delete "${name}"?`, "This won't affect existing bookings or invites.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (Platform.OS !== 'web')
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          onDelete?.();
        },
      },
    ]);
  };
  const handleTypeSelect = (key: SessionType) => {
    if ((key === '1-to-1' || key === 'assessment') && capacity > 1) {
      setType(key);
      setCapacity(1);
      uiFeedback.showToast('Capacity set to 1 for 1-to-1/assessment session types.', 'warning');
      return;
    }
    setType(key);
    if (
      (key === 'small-group' || key === 'clinic') &&
      capacity === 1 &&
      !capacityManuallySetRef.current
    ) {
      setCapacity(8);
    }
  };
  const durationOptions = DURATION_OPTIONS.map((d) => ({ key: d, label: `${d}m` }));
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={[styles.overlay, { backgroundColor: withAlpha(palette.text, 0.4) }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: palette.surface }]}>
          <View style={[styles.handle, { backgroundColor: palette.border }]} />
          <Row style={styles.header}>
            <ThemedText type="subtitle">
              {existing ? 'Edit Session Type' : 'New Session Type'}
            </ThemedText>
            <Clickable accessibilityLabel="Close" onPress={handleClose}>
              <Ionicons name="close" size={24} color={palette.muted} />
            </Clickable>
          </Row>
          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>Name</ThemedText>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: palette.text,
                  borderColor: palette.border,
                  backgroundColor: palette.background,
                },
              ]}
              placeholder="e.g. 1-on-1 Skills Session"
              placeholderTextColor={palette.muted}
              value={name}
              onChangeText={setName}
              maxLength={40}
              autoFocus={!existing}
            />
            <ThemedText
              style={[
                Typography.caption,
                { color: name.length > 35 ? palette.error : palette.muted, textAlign: 'right' },
              ]}
            >
              {name.length}/40
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: palette.muted }]}>
              Short names work best for parent booking screens
            </ThemedText>
          </View>
          <SegmentSelector
            label="Type"
            options={TYPE_OPTIONS}
            selected={type}
            onSelect={handleTypeSelect}
            palette={palette}
          />
          <SegmentSelector
            label="Duration"
            options={durationOptions}
            selected={duration}
            onSelect={setDuration}
            palette={palette}
          />
          <Row style={styles.row}>
            <CapacityStepper
              value={capacity}
              onChange={(next) => {
                capacityManuallySetRef.current = true;
                setCapacity(next);
              }}
              palette={palette}
            />
            <PriceInput value={price} onChange={setPrice} palette={palette} />
          </Row>
          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { color: palette.muted }]}>
              Description (optional)
            </ThemedText>
            <TextInput
              style={[
                styles.textAreaInput,
                {
                  color: palette.text,
                  borderColor: palette.border,
                  backgroundColor: palette.background,
                },
              ]}
              placeholder="What athletes can expect"
              placeholderTextColor={palette.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={200}
            />
          </View>
          <Clickable
            onPress={handleSave}
            style={[styles.saveBtn, { backgroundColor: isValid ? palette.tint : palette.border }]}
          >
            <Ionicons name="checkmark" size={20} color={palette.onPrimary} />
            <ThemedText style={[styles.saveBtnText, { color: palette.onPrimary }]}>Save</ThemedText>
          </Clickable>
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
    borderRadius: Radii.xs,
    alignSelf: 'center',
    marginBottom: Spacing.xs,
  },
  header: {
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
  row: { gap: Spacing.md },
  saveBtn: {
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
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  deleteBtnText: { fontWeight: '600' },
});
