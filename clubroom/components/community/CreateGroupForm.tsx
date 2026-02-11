import { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/primitives/button';
import { Radii, Spacing } from '@/constants/theme';
import type { GroupType } from '@/constants/types';
import { scaleFont } from '@/utils/scale';
import { useTheme } from '@/hooks/useTheme';
import { GroupTypeSelector, PrivacySelector } from './create-group-form-sections';
import { Row } from '@/components/primitives';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CreateGroupFormProps {
  onSubmit: (data: CreateGroupFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}

export interface CreateGroupFormData {
  name: string;
  description: string;
  type: GroupType;
  isPublic: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CreateGroupForm({ onSubmit, onCancel, loading = false }: CreateGroupFormProps) {
  const { colors: palette } = useTheme();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<GroupType>('GENERAL');
  const [isPublic, setIsPublic] = useState(true);
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

  const validate = useCallback((): boolean => {
    const newErrors: { name?: string; description?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Group name is required';
    } else if (name.trim().length < 3) {
      newErrors.name = 'Group name must be at least 3 characters';
    } else if (name.trim().length > 50) {
      newErrors.name = 'Group name must be 50 characters or less';
    }

    if (description.length > 200) {
      newErrors.description = 'Description must be 200 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, description]);

  const handleSubmit = useCallback(() => {
    if (validate()) {
      onSubmit({ name: name.trim(), description: description.trim(), type, isPublic });
    }
  }, [name, description, type, isPublic, validate, onSubmit]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Group Name */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Group Name *
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.surface,
                borderColor: errors.name ? palette.error : palette.border,
                color: palette.text,
              },
            ]}
            placeholder="Enter group name"
            placeholderTextColor={palette.muted}
            value={name}
            onChangeText={setName}
            maxLength={50}
            editable={!loading}
          />
          {errors.name && (
            <ThemedText style={[styles.errorText, { color: palette.error }]}>
              {errors.name}
            </ThemedText>
          )}
          <ThemedText style={[styles.charCount, { color: palette.muted }]}>
            {name.length}/50
          </ThemedText>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Description
          </ThemedText>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: palette.surface,
                borderColor: errors.description ? palette.error : palette.border,
                color: palette.text,
              },
            ]}
            placeholder="What's this group about?"
            placeholderTextColor={palette.muted}
            value={description}
            onChangeText={setDescription}
            maxLength={200}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!loading}
          />
          {errors.description && (
            <ThemedText style={[styles.errorText, { color: palette.error }]}>
              {errors.description}
            </ThemedText>
          )}
          <ThemedText style={[styles.charCount, { color: palette.muted }]}>
            {description.length}/200
          </ThemedText>
        </View>

        {/* Group Type */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Group Type
          </ThemedText>
          <GroupTypeSelector
            selected={type}
            onSelect={setType}
            disabled={loading}
            palette={palette}
          />
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Privacy
          </ThemedText>
          <PrivacySelector
            isPublic={isPublic}
            onToggle={setIsPublic}
            disabled={loading}
            palette={palette}
          />
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <Row style={[styles.actions, { borderTopColor: palette.border }]}>
        <Button variant="outline" onPress={onCancel} style={styles.actionButton} disabled={loading}>
          Cancel
        </Button>
        <Button
          onPress={handleSubmit}
          style={styles.actionButton}
          disabled={loading || !name.trim()}
        >
          {loading ? 'Creating...' : 'Create Group'}
        </Button>
      </Row>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  section: { gap: Spacing.xs },
  label: { fontSize: scaleFont(15), marginBottom: Spacing.xxs },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontSize: scaleFont(16),
  },
  textArea: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: scaleFont(16),
  },
  errorText: { fontSize: scaleFont(12), marginTop: Spacing.xxs },
  charCount: { fontSize: scaleFont(11), textAlign: 'right' },
  actions: { padding: Spacing.lg, gap: Spacing.sm, borderTopWidth: 1 },
  actionButton: { flex: 1 },
});
