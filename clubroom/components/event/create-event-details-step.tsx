import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';

interface CreateEventDetailsStepProps {
  title: string;
  description: string;
  venue: string;
  address: string;
  isVirtual: boolean;
  meetingLink: string;
  onFieldChange: (field: string, value: unknown) => void;
}

function CreateEventDetailsStepInner({
  title,
  description,
  venue,
  address,
  isVirtual,
  meetingLink,
  onFieldChange,
}: CreateEventDetailsStepProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>
        Event details
      </ThemedText>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Title *</ThemedText>
        <TextInput
          style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
          placeholder="e.g., End of Season Presentation"
          placeholderTextColor={palette.muted}
          value={title}
          onChangeText={(v) => onFieldChange('title', v)}
        />
      </View>

      <View style={styles.inputGroup}>
        <ThemedText style={styles.inputLabel}>Description</ThemedText>
        <TextInput
          style={[styles.textArea, { backgroundColor: palette.surface, color: palette.text }]}
          placeholder="What should attendees know about this event?"
          placeholderTextColor={palette.muted}
          value={description}
          onChangeText={(v) => onFieldChange('description', v)}
          multiline
          numberOfLines={4}
        />
      </View>

      <Clickable onPress={() => onFieldChange('isVirtual', !isVirtual)} style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <ThemedText type="defaultSemiBold">Virtual Event</ThemedText>
          <ThemedText style={[styles.toggleDesc, { color: palette.muted }]}>
            This event will be held online
          </ThemedText>
        </View>
        <View
          style={[
            styles.toggleSwitch,
            { backgroundColor: isVirtual ? palette.tint : palette.border },
          ]}
        >
          <View
            style={[
              styles.toggleHandle,
              {
                backgroundColor: palette.surface,
                transform: [{ translateX: isVirtual ? 18 : Spacing.micro }],
              },
            ]}
          />
        </View>
      </Clickable>

      {!isVirtual ? (
        <>
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Venue *</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
              placeholder="e.g., Bradwell Community Centre"
              placeholderTextColor={palette.muted}
              value={venue}
              onChangeText={(v) => onFieldChange('venue', v)}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Address</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
              placeholder="Full address"
              placeholderTextColor={palette.muted}
              value={address}
              onChangeText={(v) => onFieldChange('address', v)}
            />
          </View>
        </>
      ) : (
        <View style={styles.inputGroup}>
          <ThemedText style={styles.inputLabel}>Meeting Link</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
            placeholder="https://zoom.us/j/..."
            placeholderTextColor={palette.muted}
            value={meetingLink}
            onChangeText={(v) => onFieldChange('meetingLink', v)}
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>
      )}
    </Animated.View>
  );
}

export const CreateEventDetailsStep = CreateEventDetailsStepInner;

const styles = StyleSheet.create({
  stepContent: {
    gap: Spacing.lg,
  },
  stepTitle: {
    textAlign: 'center',
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    ...Typography.smallSemiBold,
    fontSize: scaleFont(Typography.smallSemiBold.fontSize),
  },
  input: {
    height: 48,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
    fontSize: scaleFont(Typography.body.fontSize),
  },
  textArea: {
    minHeight: 100,
    borderRadius: Radii.md,
    padding: Spacing.md,
    ...Typography.body,
    fontSize: scaleFont(Typography.body.fontSize),
    textAlignVertical: 'top',
  },
  toggleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleDesc: {
    ...Typography.caption,
    fontSize: scaleFont(Typography.caption.fontSize),
    marginTop: Spacing.micro,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: Radii.lg,
    justifyContent: 'center',
  },
  toggleHandle: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    // backgroundColor set inline for dynamic theming
  },
});
