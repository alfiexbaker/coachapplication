import { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import type { GroupType } from '@/constants/types';
import { scaleFont } from '@/utils/scale';
import { useTheme } from '@/hooks/useTheme';

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

interface GroupTypeOption {
  value: GroupType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const GROUP_TYPE_OPTIONS: GroupTypeOption[] = [
  {
    value: 'GENERAL',
    label: 'General',
    description: 'A general discussion group for parents',
    icon: 'chatbubbles-outline',
  },
  {
    value: 'CLUB',
    label: 'Club',
    description: 'For parents of a specific club or team',
    icon: 'football-outline',
  },
  {
    value: 'SESSION',
    label: 'Session',
    description: 'For parents attending the same sessions',
    icon: 'calendar-outline',
  },
  {
    value: 'CARPOOL',
    label: 'Carpool',
    description: 'Coordinate rides to training and matches',
    icon: 'car-outline',
  },
];

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
      onSubmit({
        name: name.trim(),
        description: description.trim(),
        type,
        isPublic,
      });
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
          <View style={styles.typeOptions}>
            {GROUP_TYPE_OPTIONS.map((option) => (
              <SurfaceCard
                key={option.value}
                style={[
                  styles.typeOption,
                  type === option.value ? {
                    borderColor: palette.tint,
                    borderWidth: 2,
                  } : undefined,
                ]}
                onPress={() => setType(option.value)}
                tactile={!loading}
              >
                <View
                  style={[
                    styles.typeIconContainer,
                    {
                      backgroundColor:
                        type === option.value ? withAlpha(palette.tint, 0.09) : palette.surfaceSecondary,
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={24}
                    color={type === option.value ? palette.tint : palette.icon}
                  />
                </View>
                <ThemedText
                  type="defaultSemiBold"
                  style={[
                    styles.typeLabel,
                    type === option.value ? { color: palette.tint } : undefined,
                  ]}
                >
                  {option.label}
                </ThemedText>
                <ThemedText
                  style={[styles.typeDescription, { color: palette.muted }]}
                  numberOfLines={2}
                >
                  {option.description}
                </ThemedText>
              </SurfaceCard>
            ))}
          </View>
        </View>

        {/* Privacy Setting */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Privacy
          </ThemedText>
          <View style={styles.privacyOptions}>
            <Clickable
              style={[
                styles.privacyOption,
                {
                  backgroundColor: isPublic ? withAlpha(palette.tint, 0.09) : palette.surface,
                  borderColor: isPublic ? palette.tint : palette.border,
                },
              ]}
              onPress={() => setIsPublic(true)}
              disabled={loading}
            >
              <Ionicons
                name="globe-outline"
                size={22}
                color={isPublic ? palette.tint : palette.icon}
              />
              <View style={styles.privacyTextContainer}>
                <ThemedText
                  type="defaultSemiBold"
                  style={[
                    styles.privacyLabel,
                    isPublic ? { color: palette.tint } : undefined,
                  ]}
                >
                  Public
                </ThemedText>
                <ThemedText style={[styles.privacyDescription, { color: palette.muted }]}>
                  Anyone can join
                </ThemedText>
              </View>
              {isPublic && (
                <Ionicons name="checkmark-circle" size={22} color={palette.tint} />
              )}
            </Clickable>

            <Clickable
              style={[
                styles.privacyOption,
                {
                  backgroundColor: !isPublic ? withAlpha(palette.tint, 0.09) : palette.surface,
                  borderColor: !isPublic ? palette.tint : palette.border,
                },
              ]}
              onPress={() => setIsPublic(false)}
              disabled={loading}
            >
              <Ionicons
                name="lock-closed-outline"
                size={22}
                color={!isPublic ? palette.tint : palette.icon}
              />
              <View style={styles.privacyTextContainer}>
                <ThemedText
                  type="defaultSemiBold"
                  style={[
                    styles.privacyLabel,
                    !isPublic ? { color: palette.tint } : undefined,
                  ]}
                >
                  Private
                </ThemedText>
                <ThemedText style={[styles.privacyDescription, { color: palette.muted }]}>
                  Invite only
                </ThemedText>
              </View>
              {!isPublic && (
                <Ionicons name="checkmark-circle" size={22} color={palette.tint} />
              )}
            </Clickable>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actions, { borderTopColor: palette.border }]}>
        <Button
          variant="outline"
          onPress={onCancel}
          style={styles.cancelButton}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onPress={handleSubmit}
          style={styles.submitButton}
          disabled={loading || !name.trim()}
        >
          {loading ? 'Creating...' : 'Create Group'}
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: scaleFont(15),
    marginBottom: Spacing.xxs,
  },
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
  errorText: {
    fontSize: scaleFont(12),
    marginTop: Spacing.xxs,
  },
  charCount: {
    fontSize: scaleFont(11),
    textAlign: 'right',
  },
  typeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeOption: {
    width: '47%',
    padding: Spacing.sm,
    gap: 8,
    alignItems: 'center',
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: scaleFont(14),
    textAlign: 'center',
  },
  typeDescription: {
    fontSize: scaleFont(11),
    textAlign: 'center',
    lineHeight: scaleFont(15),
  },
  privacyOptions: {
    gap: Spacing.sm,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  privacyTextContainer: {
    flex: 1,
    gap: Spacing.micro,
  },
  privacyLabel: {
    fontSize: scaleFont(15),
  },
  privacyDescription: {
    fontSize: scaleFont(12),
  },
  actions: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});
