/**
 * BadgeAwardModal — Sub-components.
 */
import { memo } from 'react';
import { View, StyleSheet, TextInput, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { BadgeDefinition } from '@/constants/types';
import { getBadgeIcon, BADGE_REASONS, QUICK_NOTES } from './badge-award-helpers';
import { Row } from '@/components/primitives';

/* ─── Athlete Header ─── */
interface AthleteHeaderProps {
  athleteName: string;
  athletePhotoUrl?: string;
  sessionLabel?: string;
  onClose: () => void;
}
export const AthleteHeader = memo(function AthleteHeader({
  athleteName,
  athletePhotoUrl,
  sessionLabel,
  onClose,
}: AthleteHeaderProps) {
  const { colors: palette } = useTheme();
  return (
    <Row style={styles.header}>
      <Row style={styles.athleteInfo}>
        {athletePhotoUrl ? (
          <Image source={{ uri: athletePhotoUrl }} style={styles.avatar} />
        ) : (
          <View
            style={[styles.avatarPlaceholder, { backgroundColor: withAlpha(palette.tint, 0.12) }]}
          >
            <Ionicons name="person" size={24} color={palette.tint} />
          </View>
        )}
        <View>
          <ThemedText type="subtitle">{athleteName}</ThemedText>
          {sessionLabel && (
            <ThemedText style={[styles.sessionLabel, { color: palette.muted }]}>
              {sessionLabel}
            </ThemedText>
          )}
        </View>
      </Row>
      <Clickable
        accessibilityLabel="Close"
        onPress={onClose}
        style={[styles.closeButton, { backgroundColor: palette.surfaceSecondary }]}
      >
        <Ionicons name="close" size={20} color={palette.icon} />
      </Clickable>
    </Row>
  );
});

/* ─── Badge Selector ─── */
interface BadgeSelectorProps {
  definitions: BadgeDefinition[];
  selectedBadgeId: string | null;
  onSelect: (id: string) => void;
}
export const BadgeSelector = memo(function BadgeSelector({
  definitions,
  selectedBadgeId,
  onSelect,
}: BadgeSelectorProps) {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        Choose Badge
      </ThemedText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.badgeScroll}
      >
        {definitions.map((badge, index) => {
          const isSelected = selectedBadgeId === badge.id;
          return (
            <Animated.View key={badge.id} entering={FadeIn.delay(index * 50)}>
              <Clickable
                onPress={() => onSelect(badge.id)}
                accessibilityRole="button"
                accessibilityLabel={`Select badge ${badge.label}`}
                accessibilityState={{ selected: isSelected }}
              >
                <View
                  style={[
                    styles.badgeCard,
                    {
                      backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.surface,
                      borderColor: isSelected ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.badgeIconCircle,
                      {
                        backgroundColor: isSelected
                          ? withAlpha(palette.tint, 0.12)
                          : withAlpha(palette.muted, 0.09),
                      },
                    ]}
                  >
                    <Ionicons
                      name={getBadgeIcon(badge) as keyof typeof Ionicons.glyphMap}
                      size={24}
                      color={isSelected ? palette.tint : palette.icon}
                    />
                  </View>
                  <ThemedText
                    style={[styles.badgeLabel, { color: isSelected ? palette.tint : palette.text }]}
                    numberOfLines={2}
                  >
                    {badge.label}
                  </ThemedText>
                  {isSelected && (
                    <View style={[styles.selectedCheck, { backgroundColor: palette.tint }]}>
                      <Ionicons name="checkmark" size={12} color={palette.onPrimary} />
                    </View>
                  )}
                </View>
              </Clickable>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
});

/* ─── Reason Selector ─── */
interface ReasonSelectorProps {
  selectedReason: string;
  onSelect: (reason: string) => void;
}
export const ReasonSelector = memo(function ReasonSelector({
  selectedReason,
  onSelect,
}: ReasonSelectorProps) {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        For
      </ThemedText>
      <Row style={styles.reasonContainer}>
        {BADGE_REASONS.map((reason) => {
          const isSelected = selectedReason === reason;
          return (
            <Clickable
              key={reason}
              onPress={() => onSelect(reason)}
              accessibilityRole="button"
              accessibilityLabel={`Set award reason ${reason}`}
              accessibilityState={{ selected: isSelected }}
              style={styles.reasonTapTarget}
            >
              <View
                style={[
                  styles.reasonPill,
                  {
                    backgroundColor: isSelected ? palette.tint : palette.surface,
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.reasonText,
                    { color: isSelected ? palette.onPrimary : palette.text },
                  ]}
                >
                  {reason}
                </ThemedText>
              </View>
            </Clickable>
          );
        })}
      </Row>
    </View>
  );
});

/* ─── Note Input ─── */
interface NoteInputProps {
  note: string;
  onNoteChange: (v: string) => void;
  onQuickNote: (n: string) => void;
}
export const NoteInput = memo(function NoteInput({
  note,
  onNoteChange,
  onQuickNote,
}: NoteInputProps) {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        Add a note
      </ThemedText>
      <View
        style={[
          styles.noteInputContainer,
          { borderColor: palette.border, backgroundColor: palette.surface },
        ]}
      >
        <TextInput
          style={[styles.noteInput, { color: palette.text }]}
          placeholder="Tell them why they earned this..."
          placeholderTextColor={palette.muted}
          value={note}
          onChangeText={onNoteChange}
          multiline
          maxLength={280}
        />
        <Row style={styles.quickNotes}>
          {QUICK_NOTES.map((quickNote) => (
            <Clickable
              key={quickNote}
              onPress={() => onQuickNote(quickNote)}
              accessibilityRole="button"
              accessibilityLabel={`Add quick note ${quickNote}`}
              style={styles.quickNoteTapTarget}
            >
              <View
                style={[styles.quickNotePill, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
              >
                <ThemedText style={[styles.quickNoteText, { color: palette.tint }]}>
                  + {quickNote}
                </ThemedText>
              </View>
            </Clickable>
          ))}
        </Row>
      </View>
      <ThemedText style={[styles.charCount, { color: palette.muted }]}>
        {note.length}/280
      </ThemedText>
    </View>
  );
});

/* ─── Preview Section ─── */
interface PreviewSectionProps {
  selectedBadge: BadgeDefinition;
  selectedReason: string;
  note: string;
  coachName?: string;
}
export const PreviewSection = memo(function PreviewSection({
  selectedBadge,
  selectedReason,
  note,
  coachName,
}: PreviewSectionProps) {
  const { colors: palette } = useTheme();
  return (
    <Animated.View entering={FadeIn} style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        Preview
      </ThemedText>
      <SurfaceCard style={[styles.previewCard, { borderColor: palette.border }]}>
        <Row style={styles.previewHeader}>
          <View
            style={[styles.previewBadgeIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
          >
            <Ionicons name="ribbon" size={20} color={palette.tint} />
          </View>
          <View style={styles.previewHeaderText}>
            <ThemedText type="defaultSemiBold">{selectedBadge.label}</ThemedText>
            <ThemedText style={[styles.previewReason, { color: palette.muted }]}>
              {selectedReason}
            </ThemedText>
          </View>
        </Row>
        {note.trim() !== '' && <ThemedText style={styles.previewNote}>{note}</ThemedText>}
        <ThemedText style={[styles.previewFooter, { color: palette.muted }]}>
          From {coachName || 'Coach'} {'\u2022'} Just now
        </ThemedText>
      </SurfaceCard>
    </Animated.View>
  );
});

/* ─── Error Banner ─── */
interface ErrorBannerProps {
  error: string;
}
export const ErrorBanner = memo(function ErrorBanner({ error }: ErrorBannerProps) {
  const { colors: palette } = useTheme();
  return (
    <Row style={[styles.errorBanner, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
      <Ionicons name="alert-circle" size={16} color={palette.error} />
      <ThemedText style={{ color: palette.error, flex: 1 }}>{error}</ThemedText>
    </Row>
  );
});

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  athleteInfo: { alignItems: 'center', gap: Spacing.md },
  avatar: { width: 48, height: 48, borderRadius: Radii.xl },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionLabel: { ...Typography.small },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.body },
  badgeScroll: { gap: Spacing.sm, paddingRight: Spacing.lg },
  badgeCard: {
    width: 100,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  badgeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: { ...Typography.caption, textAlign: 'center' },
  selectedCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonContainer: { flexWrap: 'wrap', gap: Spacing.xs },
  reasonTapTarget: { minHeight: 44, justifyContent: 'center' },
  reasonPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  reasonText: { ...Typography.bodySmallSemiBold },
  noteInputContainer: { borderRadius: Radii.lg, borderWidth: 1, overflow: 'hidden' },
  noteInput: { ...Typography.body, padding: Spacing.md, minHeight: 80, textAlignVertical: 'top' },
  quickNotes: { flexWrap: 'wrap', gap: Spacing.xs, padding: Spacing.sm, paddingTop: 0 },
  quickNoteTapTarget: { minHeight: 44, justifyContent: 'center' },
  quickNotePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.full,
  },
  quickNoteText: { ...Typography.caption },
  charCount: { ...Typography.caption, textAlign: 'right' },
  previewCard: { padding: Spacing.md, gap: Spacing.sm },
  previewHeader: { alignItems: 'center', gap: Spacing.sm },
  previewBadgeIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewHeaderText: { flex: 1 },
  previewReason: { ...Typography.small },
  previewNote: { ...Typography.bodySmall, lineHeight: 20 },
  previewFooter: { ...Typography.caption },
  errorBanner: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
});
