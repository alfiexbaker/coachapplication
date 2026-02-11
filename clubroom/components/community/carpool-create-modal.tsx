import React, { memo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { DateTimeField } from '@/components/ui/primitives';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CreateOfferFormState } from '@/hooks/use-carpool';
import { scaleFont } from '@/utils/scale';
import { Row } from '@/components/primitives';

interface CarpoolCreateModalProps {
  visible: boolean;
  form: CreateOfferFormState;
  creating: boolean;
  onChangeForm: (form: CreateOfferFormState) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export const CarpoolCreateModal = memo(function CarpoolCreateModal({
  visible,
  form,
  creating,
  onChangeForm,
  onSubmit,
  onClose,
}: CarpoolCreateModalProps) {
  const { colors: palette } = useTheme();
  const inputStyle = [
    styles.input,
    { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <Row style={[styles.header, { borderBottomColor: palette.border }]}>
          <ThemedText type="title" style={styles.title}>
            Offer a Ride
          </ThemedText>
          <Clickable accessibilityLabel="Close" onPress={onClose}>
            <Ionicons name="close" size={24} color={palette.text} />
          </Clickable>
        </Row>
        <KeyboardAvoidingView
          style={styles.body}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.field}>
              <ThemedText type="defaultSemiBold" style={styles.label}>
                Session Name *
              </ThemedText>
              <TextInput
                style={inputStyle}
                placeholder="e.g., Saturday Training"
                placeholderTextColor={palette.muted}
                value={form.sessionName}
                onChangeText={(v) => onChangeForm({ ...form, sessionName: v })}
              />
            </View>
            <View style={styles.field}>
              <ThemedText type="defaultSemiBold" style={styles.label}>
                Date *
              </ThemedText>
              <TextInput
                style={inputStyle}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={palette.muted}
                value={form.sessionDate}
                onChangeText={(v) => onChangeForm({ ...form, sessionDate: v })}
              />
            </View>
            <View style={styles.field}>
              <ThemedText type="defaultSemiBold" style={styles.label}>
                Available Seats *
              </ThemedText>
              <TextInput
                style={inputStyle}
                placeholder="2"
                placeholderTextColor={palette.muted}
                value={form.seatsAvailable}
                onChangeText={(v) => onChangeForm({ ...form, seatsAvailable: v })}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.field}>
              <ThemedText type="defaultSemiBold" style={styles.label}>
                Pickup Location *
              </ThemedText>
              <TextInput
                style={inputStyle}
                placeholder="e.g., High Street Car Park"
                placeholderTextColor={palette.muted}
                value={form.pickupLocation}
                onChangeText={(v) => onChangeForm({ ...form, pickupLocation: v })}
              />
            </View>
            <View style={styles.field}>
              <DateTimeField
                mode="time"
                label="Pickup Time *"
                value={form.pickupTime}
                onChange={(v) => onChangeForm({ ...form, pickupTime: v })}
              />
            </View>
            <View style={styles.field}>
              <Clickable
                style={[
                  styles.toggleRow,
                  {
                    backgroundColor: form.returnOffered
                      ? withAlpha(palette.tint, 0.09)
                      : palette.surface,
                    borderColor: form.returnOffered ? palette.tint : palette.border,
                  },
                ]}
                onPress={() => onChangeForm({ ...form, returnOffered: !form.returnOffered })}
              >
                <Ionicons
                  name={form.returnOffered ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={form.returnOffered ? palette.tint : palette.muted}
                />
                <ThemedText style={styles.toggleLabel}>Offering return trip</ThemedText>
              </Clickable>
            </View>
            {form.returnOffered && (
              <View style={styles.field}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                  Return Time
                </ThemedText>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g., 12:00"
                  placeholderTextColor={palette.muted}
                  value={form.returnTime}
                  onChangeText={(v) => onChangeForm({ ...form, returnTime: v })}
                />
              </View>
            )}
            <View style={styles.field}>
              <ThemedText type="defaultSemiBold" style={styles.label}>
                Notes (optional)
              </ThemedText>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                placeholder="Any additional info for parents..."
                placeholderTextColor={palette.muted}
                value={form.notes}
                onChangeText={(v) => onChangeForm({ ...form, notes: v })}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
          <Row style={[styles.actions, { borderTopColor: palette.border }]}>
            <Button
              variant="outline"
              onPress={onClose}
              style={styles.actionBtn}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onPress={onSubmit} style={styles.actionBtn} disabled={creating}>
              {creating ? 'Creating...' : 'Create Offer'}
            </Button>
          </Row>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  title: { ...Typography.title, fontSize: scaleFont(Typography.title.fontSize) },
  body: { flex: 1 },
  formContent: { padding: Spacing.lg, gap: Spacing.md },
  field: { gap: Spacing.xs },
  label: {
    ...Typography.bodySmall,
    fontSize: scaleFont(Typography.bodySmall.fontSize),
    marginBottom: Spacing.xxs,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.subheading,
    fontSize: scaleFont(Typography.subheading.fontSize),
  },
  textArea: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.subheading,
    fontSize: scaleFont(Typography.subheading.fontSize),
  },
  toggleRow: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  toggleLabel: { ...Typography.body, fontSize: scaleFont(Typography.body.fontSize) },
  actions: { padding: Spacing.lg, gap: Spacing.sm, borderTopWidth: 1 },
  actionBtn: { flex: 1 },
});
