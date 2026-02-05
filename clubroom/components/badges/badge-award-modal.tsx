import { useEffect, useState, useRef } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, View, Image, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { badgeService } from '@/services/badge-service';
import { BadgeAward, BadgeDefinition } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { CelebrationOverlay, CelebrationOverlayRef } from '@/components/celebration-overlay';

export const BADGE_REASONS = ['Leadership', 'Consistency', 'Technique', 'Mindset', 'Teamwork', 'Resilience'];

const QUICK_NOTES = [
  'Great effort today!',
  'Showed real improvement.',
  'Fantastic attitude.',
  'Keep it up!',
];

const logger = createLogger('BadgeAwardModal');

interface BadgeAwardModalProps {
  visible: boolean;
  athleteId: string;
  athleteName: string;
  athletePhotoUrl?: string;
  coachId: string;
  coachName?: string;
  sessionId?: string;
  sessionLabel?: string;
  initialReason?: string;
  initialNote?: string;
  onClose: () => void;
  onAwarded?: (award: BadgeAward) => void;
}

export function BadgeAwardModal({
  visible,
  onClose,
  athleteId,
  athleteName,
  athletePhotoUrl,
  coachId,
  coachName,
  sessionId,
  sessionLabel,
  initialReason,
  initialNote,
  onAwarded,
}: BadgeAwardModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const insets = useSafeAreaInsets();
  const celebrationRef = useRef<CelebrationOverlayRef>(null);

  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(initialReason ?? BADGE_REASONS[0]);
  const [note, setNote] = useState(initialNote ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedAthleteName = athleteName || 'Athlete';
  const selectedBadge = definitions.find((d) => d.id === selectedBadgeId);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setNote(initialNote ?? '');
    setSelectedReason(initialReason ?? BADGE_REASONS[0]);

    badgeService.listDefinitions().then((defs) => {
      setDefinitions(defs);
      if (!selectedBadgeId && defs.length > 0) {
        setSelectedBadgeId(defs[0].id);
      }
    });
    logger.info('badge_award_opened', { athleteId, sessionId, coachId });
  }, [visible, athleteId, coachId, sessionId, initialNote, initialReason, selectedBadgeId]);

  const handleBadgeSelect = (badgeId: string) => {
    Haptics.selectionAsync();
    setSelectedBadgeId(badgeId);
  };

  const handleReasonSelect = (reason: string) => {
    Haptics.selectionAsync();
    setSelectedReason(reason);
  };

  const handleQuickNote = (quickNote: string) => {
    Haptics.selectionAsync();
    setNote((prev) => prev ? `${prev} ${quickNote}` : quickNote);
  };

  const handleSubmit = async () => {
    if (!selectedBadgeId) {
      setError('Please select a badge');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const award = await badgeService.awardBadge({
        badgeId: selectedBadgeId,
        athleteId,
        athleteName: resolvedAthleteName,
        coachId,
        coachName,
        sessionId,
        reason: selectedReason,
        note: note.trim(),
        visibility: 'supporters',
        context: sessionId ? 'session' : 'athlete_profile',
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      celebrationRef.current?.celebrate({
        title: 'Badge Awarded!',
        subtitle: `${selectedBadge?.label} sent to ${resolvedAthleteName}`,
        icon: 'ribbon',
        iconColor: '#FFD700',
        duration: 2500,
      });

      onAwarded?.(award);
      logger.info('badge_award_submitted', {
        athleteId,
        sessionId,
        badgeId: selectedBadgeId,
        reason: selectedReason,
      });

      setTimeout(onClose, 2600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to award badge');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBadgeIcon = (badge: BadgeDefinition): string => {
    const iconMap: Record<string, string> = {
      'badge_best_training': 'trophy',
      'badge_sharp_shooter_pro': 'flame',
      'badge_master_passer': 'people',
      'badge_iron_defender': 'shield',
      'badge_playmaker': 'sparkles',
    };
    return iconMap[badge.id] || 'ribbon';
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: palette.overlay }]}>
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[
            styles.sheet,
            {
              backgroundColor: palette.background,
              paddingBottom: insets.bottom + Spacing.md,
            }
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: palette.border }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.athleteInfo}>
              {athletePhotoUrl ? (
                <Image source={{ uri: athletePhotoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: `${palette.tint}20` }]}>
                  <Ionicons name="person" size={24} color={palette.tint} />
                </View>
              )}
              <View>
                <ThemedText type="subtitle">{resolvedAthleteName}</ThemedText>
                {sessionLabel && (
                  <ThemedText style={[styles.sessionLabel, { color: palette.muted }]}>
                    {sessionLabel}
                  </ThemedText>
                )}
              </View>
            </View>
            <Clickable onPress={onClose} hitSlop={12}>
              <View style={[styles.closeButton, { backgroundColor: palette.surfaceSecondary }]}>
                <Ionicons name="close" size={20} color={palette.icon} />
              </View>
            </Clickable>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Badge Selection */}
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
                      <Pressable onPress={() => handleBadgeSelect(badge.id)}>
                        <View
                          style={[
                            styles.badgeCard,
                            {
                              backgroundColor: isSelected ? `${palette.tint}15` : palette.surface,
                              borderColor: isSelected ? palette.tint : palette.border,
                            },
                          ]}
                        >
                          <View style={[
                            styles.badgeIconCircle,
                            { backgroundColor: isSelected ? `${palette.tint}20` : `${palette.muted}15` }
                          ]}>
                            <Ionicons
                              name={getBadgeIcon(badge) as any}
                              size={24}
                              color={isSelected ? palette.tint : palette.icon}
                            />
                          </View>
                          <ThemedText
                            style={[
                              styles.badgeLabel,
                              { color: isSelected ? palette.tint : palette.text }
                            ]}
                            numberOfLines={2}
                          >
                            {badge.label}
                          </ThemedText>
                          {isSelected && (
                            <View style={[styles.selectedCheck, { backgroundColor: palette.tint }]}>
                              <Ionicons name="checkmark" size={12} color="#fff" />
                            </View>
                          )}
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </ScrollView>
            </View>

            {/* Reason Selection */}
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                For
              </ThemedText>
              <View style={styles.reasonContainer}>
                {BADGE_REASONS.map((reason) => {
                  const isSelected = selectedReason === reason;
                  return (
                    <Pressable key={reason} onPress={() => handleReasonSelect(reason)}>
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
                            { color: isSelected ? '#fff' : palette.text },
                          ]}
                        >
                          {reason}
                        </ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Note Input */}
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Add a note
              </ThemedText>
              <View style={[styles.noteInputContainer, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                <TextInput
                  style={[styles.noteInput, { color: palette.text }]}
                  placeholder="Tell them why they earned this..."
                  placeholderTextColor={palette.muted}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  maxLength={280}
                />
                <View style={styles.quickNotes}>
                  {QUICK_NOTES.map((quickNote) => (
                    <Pressable key={quickNote} onPress={() => handleQuickNote(quickNote)}>
                      <View style={[styles.quickNotePill, { backgroundColor: `${palette.tint}10` }]}>
                        <ThemedText style={[styles.quickNoteText, { color: palette.tint }]}>
                          + {quickNote}
                        </ThemedText>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
              <ThemedText style={[styles.charCount, { color: palette.muted }]}>
                {note.length}/280
              </ThemedText>
            </View>

            {/* Preview */}
            {selectedBadge && (
              <Animated.View entering={FadeIn} style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Preview
                </ThemedText>
                <SurfaceCard style={[styles.previewCard, { borderColor: palette.border }]}>
                  <View style={styles.previewHeader}>
                    <View style={[styles.previewBadgeIcon, { backgroundColor: `${palette.tint}15` }]}>
                      <Ionicons name="ribbon" size={20} color={palette.tint} />
                    </View>
                    <View style={styles.previewHeaderText}>
                      <ThemedText type="defaultSemiBold">{selectedBadge.label}</ThemedText>
                      <ThemedText style={[styles.previewReason, { color: palette.muted }]}>
                        {selectedReason}
                      </ThemedText>
                    </View>
                  </View>
                  {note.trim() && (
                    <ThemedText style={styles.previewNote}>{note}</ThemedText>
                  )}
                  <ThemedText style={[styles.previewFooter, { color: palette.muted }]}>
                    From {coachName || 'Coach'} • Just now
                  </ThemedText>
                </SurfaceCard>
              </Animated.View>
            )}

            {/* Error */}
            {error && (
              <View style={[styles.errorBanner, { backgroundColor: `${palette.error}15` }]}>
                <Ionicons name="alert-circle" size={16} color={palette.error} />
                <ThemedText style={{ color: palette.error, flex: 1 }}>{error}</ThemedText>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: palette.border }]}>
            <Button
              onPress={handleSubmit}
              disabled={isSubmitting || !selectedBadgeId}
              style={styles.submitButton}
            >
              {isSubmitting ? 'Sending...' : 'Award Badge'}
            </Button>
          </View>
        </Animated.View>

        <CelebrationOverlay ref={celebrationRef} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '90%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  athleteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionLabel: {
    fontSize: 13,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
  },
  badgeScroll: {
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
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
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  reasonPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.rounded,
    borderWidth: 1,
  },
  reasonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  noteInputContainer: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  noteInput: {
    padding: Spacing.md,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  quickNotes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    padding: Spacing.sm,
    paddingTop: 0,
  },
  quickNotePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.rounded,
  },
  quickNoteText: {
    fontSize: 12,
    fontWeight: '500',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
  },
  previewCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewBadgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewHeaderText: {
    flex: 1,
  },
  previewReason: {
    fontSize: 13,
  },
  previewNote: {
    fontSize: 14,
    lineHeight: 20,
  },
  previewFooter: {
    fontSize: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  submitButton: {
    width: '100%',
  },
});
