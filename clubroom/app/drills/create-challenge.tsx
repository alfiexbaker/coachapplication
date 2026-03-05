/**
 * Create Challenge Screen
 *
 * Allows coaches to create a new video challenge for their squad.
 * Includes title, description, demo video placeholder, deadline,
 * and squad selection.
 */

import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useAuth } from '@/hooks/use-auth';
import { challengeService } from '@/services/challenge-service';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('CreateChallengeScreen');

export default function CreateChallengeScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { currentUser } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Default deadline: 7 days from now
  const [deadline] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString();
  });

  const deadlineLabel = new Date(deadline).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const isValid = title.trim().length > 0 && description.trim().length > 0;

  const handleCreate = useCallback(async () => {
    if (!isValid || creating) return;

    setCreating(true);
    try {
      await challengeService.createChallenge(
        currentUser?.id ?? 'coach1',
        currentUser?.name ?? 'Coach',
        {
          title: title.trim(),
          description: description.trim(),
          deadline,
          squadId: 'squad_1',
        },
      );

      Platform.OS !== 'web' &&
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      logger.error('Failed to create challenge', err);
      uiFeedback.showToast('Failed to create challenge. Please try again.', 'error');
    } finally {
      setCreating(false);
    }
  }, [isValid, creating, title, description, deadline, currentUser]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      {/* Header */}
      <Row align="center" justify="space-between" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Close">
          <Ionicons name="close" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="heading">Create Challenge</ThemedText>
        <Ionicons name="close" size={24} color="transparent" />
      </Row>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Details */}
        <SurfaceCard style={styles.section}>
          <ThemedText type="subheading" style={{ color: palette.text }}>
            Challenge Details
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                color: palette.text,
                backgroundColor: palette.surfaceSecondary,
                borderColor: palette.border,
              },
            ]}
            placeholder="Challenge title"
            placeholderTextColor={palette.muted}
            value={title}
            onChangeText={setTitle}
            maxLength={80}
          />
          <TextInput
            style={[
              styles.inputMultiline,
              {
                color: palette.text,
                backgroundColor: palette.surfaceSecondary,
                borderColor: palette.border,
              },
            ]}
            placeholder="Describe the challenge..."
            placeholderTextColor={palette.muted}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            maxLength={500}
          />
        </SurfaceCard>

        {/* Video placeholder */}
        <SurfaceCard style={styles.section}>
          <Row align="center" gap="xs">
            <Ionicons name="videocam-outline" size={Components.icon.md} color={palette.tint} />
            <ThemedText type="subheading">Demo Video</ThemedText>
          </Row>
          <Clickable
            onPress={() =>
              uiFeedback.showToast('Video upload will be available in a future update.')
            }
          >
            <View
              style={[
                styles.videoPlaceholder,
                { backgroundColor: palette.surfaceSecondary, borderColor: palette.border },
              ]}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={Components.icon.xl}
                color={palette.muted}
              />
              <ThemedText style={[Typography.body, { color: palette.muted }]}>
                Tap to upload demo video
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                (coming soon)
              </ThemedText>
            </View>
          </Clickable>
        </SurfaceCard>

        {/* Deadline */}
        <SurfaceCard style={styles.section}>
          <Row align="center" gap="xs">
            <Ionicons name="calendar-outline" size={Components.icon.md} color={palette.tint} />
            <ThemedText type="subheading">Deadline</ThemedText>
          </Row>
          <Row
            align="center"
            justify="space-between"
            style={[styles.deadlineRow, { backgroundColor: palette.surfaceSecondary }]}
          >
            <ThemedText style={{ color: palette.text }}>{deadlineLabel}</ThemedText>
            <Ionicons name="chevron-forward" size={Components.icon.md} color={palette.muted} />
          </Row>
        </SurfaceCard>

        {/* Squad */}
        <SurfaceCard style={styles.section}>
          <Row align="center" gap="xs">
            <Ionicons name="people-outline" size={Components.icon.md} color={palette.tint} />
            <ThemedText type="subheading">Audience</ThemedText>
          </Row>
          <Row
            align="center"
            justify="space-between"
            style={[styles.deadlineRow, { backgroundColor: palette.surfaceSecondary }]}
          >
            <ThemedText style={{ color: palette.text }}>U12 Lions</ThemedText>
            <Ionicons name="chevron-forward" size={Components.icon.md} color={palette.muted} />
          </Row>
        </SurfaceCard>

        {/* Create Button */}
        <Clickable
          onPress={handleCreate}
          disabled={!isValid || creating}
          accessibilityLabel="Create Challenge"
        >
          <View
            style={[
              styles.createButton,
              {
                backgroundColor: isValid && !creating ? palette.tint : palette.border,
              },
            ]}
          >
            <ThemedText
              style={[
                Typography.bodySemiBold,
                { color: isValid ? palette.onPrimary : palette.muted },
              ]}
            >
              {creating ? 'Creating...' : 'Create Challenge'}
            </ThemedText>
          </View>
        </Clickable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['2xl'], gap: Spacing.lg },
  section: { gap: Spacing.sm },
  input: {
    height: Components.input.height,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  inputMultiline: {
    minHeight: 100,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
  },
  videoPlaceholder: {
    height: 160,
    borderRadius: Radii.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  deadlineRow: {
    height: Components.button.height,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
  },
  createButton: {
    height: Components.button.height,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
