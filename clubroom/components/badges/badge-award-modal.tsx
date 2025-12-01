import { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, TextInput, View, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { badgeService } from '@/services/badge-service';
import { BadgeAward, BadgeDefinition } from '@/constants/types';
import { Clickable } from '@/components/primitives/clickable';
import { createLogger } from '@/utils/logger';

export const BADGE_REASONS = ['Leadership', 'Consistency', 'Technique', 'Mindset', 'Teamwork', 'Resilience'];

const NOTE_PROMPTS: { id: string; label: string; text: string }[] = [
  {
    id: 'effort',
    label: 'Call out effort',
    text: 'Kept working through the tough reps and matched the tempo.',
  },
  {
    id: 'next_focus',
    label: 'Share a next focus',
    text: 'Next up: stay on your front foot when pressing to win it early.',
  },
  {
    id: 'parent_context',
    label: 'Include parent context',
    text: 'Ask {parent_name} to ask about this drill at home to reinforce it.',
  },
];

const BADGE_PRESETS: {
  id: string;
  title: string;
  reason: string;
  note: string;
  badgeId?: string;
}[] = [
  {
    id: 'core_leadership',
    title: 'Lead the pod',
    reason: 'Leadership',
    note: 'Set the tempo for the group and kept teammates organised.',
    badgeId: 'badge_best_training',
  },
  {
    id: 'core_resilience',
    title: 'Resilience under pressure',
    reason: 'Resilience',
    note: 'Bounced back after mistakes and kept asking for the ball.',
    badgeId: 'badge_sharp_shooter_pro',
  },
  {
    id: 'core_teamwork',
    title: 'Team-first play',
    reason: 'Teamwork',
    note: 'Created chances for others and communicated throughout.',
    badgeId: 'badge_master_passer',
  },
  {
    id: 'core_consistency',
    title: 'Week-on-week consistency',
    reason: 'Consistency',
    note: 'Showed up early, stayed locked in, and finished every rep.',
  },
  {
    id: 'core_mindset',
    title: 'Growth mindset',
    reason: 'Mindset',
    note: 'Took coaching points on quickly and applied them in the next set.',
  },
  {
    id: 'core_technique',
    title: 'Technical focus',
    reason: 'Technique',
    note: 'Clean first touch and quality release even when fatigued.',
  },
];

const COOLDOWN_WINDOW_DAYS = 7;

interface BadgeAwardModalProps {
  visible: boolean;
  athleteId: string;
  athleteName: string;
  coachId: string;
  coachName?: string;
  sessionId?: string;
  sessionLabel?: string;
  initialReason?: string;
  initialNote?: string;
  onClose: () => void;
  onAwarded?: (award: BadgeAward) => void;
}

const logger = createLogger('BadgeAwardModal');

export function BadgeAwardModal({
  visible,
  onClose,
  athleteId,
  athleteName,
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
  const resolvedAthleteName = athleteName || 'Athlete';
  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [recentAward, setRecentAward] = useState<BadgeAward | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [overrideCooldown, setOverrideCooldown] = useState(false);
  const [overrideNote, setOverrideNote] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasonOptions = useMemo(() => {
    if (initialReason && !BADGE_REASONS.includes(initialReason)) {
      return [initialReason, ...BADGE_REASONS];
    }

    return BADGE_REASONS;
  }, [initialReason]);

  const [selectedReason, setSelectedReason] = useState<string>(reasonOptions[0]);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) return;

    setSubmitError(null);
    setSelectedPresetId(null);
    setOverrideCooldown(false);
    setOverrideNote('');
    setCustomNote('');

    badgeService.listDefinitions().then((defs) => {
      setDefinitions(defs);
      setSelectedBadgeId(defs[0]?.id ?? null);
    });
    badgeService.listAwardsForAthlete(athleteId).then((awards) => setRecentAward(awards[0] ?? null));
    setSelectedReason(initialReason ?? reasonOptions[0]);
    setNote(initialNote ?? '');
    logger.info('badge_award_opened', { athleteId, sessionId, coachId });
  }, [athleteId, coachId, initialNote, initialReason, reasonOptions, sessionId, visible]);

  const cooldownActive = useMemo(() => {
    if (!recentAward) return false;
    const lastAwardDate = new Date(recentAward.awardedAt).getTime();
    const diffDays = (Date.now() - lastAwardDate) / (1000 * 60 * 60 * 24);
    return diffDays < COOLDOWN_WINDOW_DAYS;
  }, [recentAward]);

  const cooldownDaysRemaining = useMemo(() => {
    if (!recentAward) return 0;
    const lastAwardDate = new Date(recentAward.awardedAt).getTime();
    const diffDays = (Date.now() - lastAwardDate) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(COOLDOWN_WINDOW_DAYS - diffDays));
  }, [recentAward]);

  const finalNote = useMemo(() => {
    const base = note.trim();
    const custom = customNote.trim();

    if (base && custom) return `${base}\n\n${custom}`;
    if (custom) return custom;
    return base;
  }, [customNote, note]);

  const handlePresetSelect = (presetId: string) => {
    const preset = BADGE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setSelectedPresetId(preset.id);
    setSelectedReason(preset.reason);
    setNote(preset.note);
    if (preset.badgeId) {
      setSelectedBadgeId(preset.badgeId);
    }
    logger.info('badge_preset_selected', {
      presetId: preset.id,
      athleteId,
      sessionId,
    });
  };

  const handleSubmit = async () => {
    if (!selectedBadgeId) return;
    if (overrideCooldown && !overrideNote.trim()) {
      setSubmitError('Add a short exception note before sending.');
      return;
    }
    if (cooldownActive && !overrideCooldown) {
      setSubmitError(`Cooldown active. Wait ${COOLDOWN_WINDOW_DAYS} days or use an exception with a note.`);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const award = await badgeService.awardBadge({
        badgeId: selectedBadgeId,
        athleteId,
        athleteName: resolvedAthleteName,
        coachId,
        coachName,
        sessionId,
        reason: selectedReason,
        note: finalNote,
        visibility: 'supporters',
        presetId: selectedPresetId ?? undefined,
        overrideCooldown,
        overrideNote: overrideNote.trim() || undefined,
        context: sessionId ? 'session' : 'athlete_profile',
      });
      onAwarded?.(award);
      logger.info('badge_award_submitted', {
        athleteId,
        sessionId,
        badgeId: selectedBadgeId,
        presetId: selectedPresetId,
        cooldownBypassed: overrideCooldown,
        context: sessionId ? 'session' : 'athlete_profile',
        hasCustomNote: Boolean(customNote.trim()),
      });
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to award badge right now.');
      logger.error('badge_award_failed', { error });
    } finally {
      setIsSubmitting(false);
    }
  };

  const helperPoints = [
    'Tie badges to recent reps or objectives so parents see the why.',
    'Use notes that mirror the athlete’s words to make it personal.',
    'Show the next focus so the badge nudges future effort.',
    'Add a parent ask so they can reinforce the habit at home.',
  ];

  const addPromptToNote = (prompt: string) => {
    setNote((prev) => {
      if (!prev.trim()) return prompt;
      const needsSpace = !prev.trim().endsWith('.') && !prev.trim().endsWith('!') && !prev.trim().endsWith('?');
      return needsSpace ? `${prev.trim()}. ${prompt}` : `${prev.trim()} ${prompt}`;
    });
    logger.info('badge_note_prompt_applied', { athleteId, prompt });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: `${palette.overlay}99` }]}>
        <SurfaceCard style={styles.modalCard}>
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <Ionicons name="ribbon" size={20} color={palette.tint} />
              <ThemedText type="subtitle">Award badge</ThemedText>
            </View>
            <Clickable onPress={onClose}>
              <Ionicons name="close" size={22} color={palette.icon} />
            </Clickable>
          </View>

          <ScrollView contentContainerStyle={{ gap: Spacing.md }}>
            <View style={{ gap: Spacing.xs }}>
              <View style={[styles.contextRow, { backgroundColor: `${palette.tint}10` }]}>
                <Ionicons name="person" size={16} color={palette.tint} />
                <ThemedText style={{ color: palette.text, fontWeight: '600' }}>{resolvedAthleteName}</ThemedText>
                {recentAward && (
                  <View style={[styles.recentBadge, { borderColor: palette.border, backgroundColor: `${palette.border}15` }]}>
                    <Ionicons name="time" size={14} color={palette.icon} />
                    <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                      Last badge: {new Date(recentAward.awardedAt).toLocaleDateString()}
                    </ThemedText>
                  </View>
                )}
              </View>
              <View style={[styles.contextRow, { backgroundColor: `${palette.border}40` }]}>
                <Ionicons name={sessionId ? 'link' : 'unlink'} size={16} color={palette.icon} />
                <ThemedText style={{ color: palette.text }}>
                  {sessionId ? sessionLabel || 'Linked to session' : 'No session linked'}
                </ThemedText>
              </View>
              {recentAward && (
                <SurfaceCard style={[styles.lastAwardCard, { borderColor: palette.border }]} tactile={false}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                    <Ionicons name="time" size={14} color={palette.icon} />
                    <ThemedText type="defaultSemiBold">Last badge</ThemedText>
                    <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                      {new Date(recentAward.awardedAt).toLocaleDateString()}
                    </ThemedText>
                  </View>
                  <View style={{ gap: 2 }}>
                    <ThemedText style={{ color: palette.text }}>{recentAward.badgeLabel}</ThemedText>
                    <ThemedText style={{ color: palette.muted, fontSize: 12 }}>{recentAward.reason}</ThemedText>
                  </View>
                </SurfaceCard>
              )}
              {cooldownActive && (
                <View
                  style={[styles.cooldownBanner, { backgroundColor: `${palette.warning}15`, borderColor: palette.warning }]}
                >
                  <Ionicons name="warning" size={16} color={palette.warning} />
                  <ThemedText style={{ color: palette.warning, flex: 1 }}>
                    Badge cooldown is on (one per {COOLDOWN_WINDOW_DAYS} days). {cooldownDaysRemaining} day(s) left—use an exception with a short note to send anyway.
                  </ThemedText>
                </View>
              )}
            </View>

            <SurfaceCard style={[styles.helperCard, { borderColor: palette.border }]} tactile={false}>
              <View style={styles.helperHeader}>
                <Ionicons name="help-circle" size={18} color={palette.tint} />
                <ThemedText type="defaultSemiBold">When to give a badge</ThemedText>
              </View>
              <View style={{ gap: Spacing.xs }}>
                {helperPoints.map((point) => (
                  <View key={point} style={styles.helperPoint}>
                    <Ionicons name="checkmark-circle" size={14} color={palette.tint} />
                    <ThemedText style={{ color: palette.text }}>{point}</ThemedText>
                  </View>
                ))}
              </View>
            </SurfaceCard>

            <View style={{ gap: Spacing.xs }}>
              <ThemedText type="defaultSemiBold">Select badge</ThemedText>
              <View style={styles.optionRow}>
                {definitions.map((badge) => (
                  <Clickable key={badge.id} onPress={() => setSelectedBadgeId(badge.id)}>
                    <View
                      style={[
                        styles.badgeOption,
                        {
                          borderColor: selectedBadgeId === badge.id ? palette.tint : palette.border,
                          backgroundColor: selectedBadgeId === badge.id ? `${palette.tint}12` : palette.surface,
                        },
                      ]}
                    >
                      <ThemedText style={{ fontWeight: '600' }}>{badge.label}</ThemedText>
                      {badge.description ? (
                        <ThemedText style={{ color: palette.muted, fontSize: 12 }}>{badge.description}</ThemedText>
                      ) : null}
                    </View>
                  </Clickable>
                ))}
              </View>
            </View>

            <View style={{ gap: Spacing.xs }}>
              <ThemedText type="defaultSemiBold">Reason</ThemedText>
              <View style={styles.optionRow}>
                {reasonOptions.map((reason) => (
                  <Clickable key={reason} onPress={() => setSelectedReason(reason)}>
                    <View
                      style={[
                        styles.reasonChip,
                        {
                          backgroundColor: selectedReason === reason ? `${palette.tint}15` : palette.surface,
                          borderColor: selectedReason === reason ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      <ThemedText style={{ color: palette.text }}>{reason}</ThemedText>
                    </View>
                  </Clickable>
                ))}
              </View>
            </View>

            <View style={{ gap: Spacing.xs }}>
              <View style={styles.presetHeader}>
                <ThemedText type="defaultSemiBold">Core value presets</ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 12 }}>Tap to prefill notes</ThemedText>
              </View>
              <View style={styles.presetGrid}>
                {BADGE_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <Clickable key={preset.id} onPress={() => handlePresetSelect(preset.id)}>
                      <View
                        style={[
                          styles.presetCard,
                          {
                            borderColor: isSelected ? palette.tint : palette.border,
                            backgroundColor: isSelected ? `${palette.tint}12` : palette.surface,
                          },
                        ]}
                      >
                        <View style={styles.presetTitleRow}>
                          <Ionicons
                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                            size={16}
                            color={palette.tint}
                          />
                          <ThemedText style={{ fontWeight: '600', flex: 1 }}>{preset.title}</ThemedText>
                        </View>
                        <ThemedText style={{ color: palette.muted, fontSize: 12 }}>{preset.note}</ThemedText>
                      </View>
                    </Clickable>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: Spacing.xs }}>
              <ThemedText type="defaultSemiBold">Prefilled note</ThemedText>
              <SurfaceCard style={[styles.noteInput, { borderColor: palette.border }]} tactile={false}>
                <TextInput
                  placeholder="Add context for parents and supporters"
                  placeholderTextColor={palette.muted}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  style={{ color: palette.text }}
                />
              </SurfaceCard>
              <SurfaceCard style={[styles.noteInput, { borderColor: palette.border }]} tactile={false}>
                <TextInput
                  placeholder="Optional custom note"
                  placeholderTextColor={palette.muted}
                  value={customNote}
                  onChangeText={setCustomNote}
                  multiline
                  style={{ color: palette.text }}
                />
              </SurfaceCard>
              <View style={{ gap: Spacing.xs }}>
                <ThemedText style={{ color: palette.muted, fontSize: 12 }}>Tap to drop in a prompt</ThemedText>
                <View style={styles.promptRow}>
                  {NOTE_PROMPTS.map((prompt) => (
                    <Clickable key={prompt.id} onPress={() => addPromptToNote(prompt.text)}>
                      <View
                        style={[
                          styles.promptChip,
                          {
                            backgroundColor: `${palette.tint}12`,
                            borderColor: `${palette.tint}40`,
                          },
                        ]}
                      >
                        <ThemedText style={{ color: palette.text, fontSize: 12 }}>{prompt.label}</ThemedText>
                      </View>
                    </Clickable>
                  ))}
                </View>
              </View>
            </View>

            <View style={{ gap: Spacing.xs }}>
              <View style={styles.exceptionRow}>
                <View style={{ flex: 1, gap: 2 }}>
                  <ThemedText type="defaultSemiBold">Exception</ThemedText>
                  <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                    Toggle to bypass cooldown with a short note
                  </ThemedText>
                </View>
                <Switch
                  value={overrideCooldown}
                  onValueChange={(value) => {
                    setOverrideCooldown(value);
                    logger.info('badge_cooldown_toggle', { athleteId, value, sessionId });
                  }}
                  trackColor={{ false: palette.border, true: palette.tint }}
                  thumbColor={overrideCooldown ? palette.background : palette.surface}
                />
              </View>
              {overrideCooldown && (
                <SurfaceCard style={[styles.noteInput, { borderColor: palette.border }]} tactile={false}>
                  <TextInput
                    placeholder="Why is this an exception?"
                    placeholderTextColor={palette.muted}
                    value={overrideNote}
                    onChangeText={setOverrideNote}
                    multiline
                    style={{ color: palette.text }}
                  />
                </SurfaceCard>
              )}
            </View>

            <View style={{ gap: Spacing.xs }}>
              <ThemedText type="defaultSemiBold">Preview (parent sees this)</ThemedText>
              <ParentBadgePreview
                palette={palette}
                badgeLabel={definitions.find((d) => d.id === selectedBadgeId)?.label || 'Badge'}
                reason={selectedReason}
                note={finalNote || 'Add a note so parents know the why'}
                sessionLabel={sessionLabel}
                cooldownBypassed={overrideCooldown}
                presetTitle={BADGE_PRESETS.find((p) => p.id === selectedPresetId)?.title}
              />
            </View>

            {submitError ? (
              <SurfaceCard style={[styles.errorCard, { borderColor: palette.error }]} tactile={false}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                  <Ionicons name="alert-circle" size={16} color={palette.error} />
                  <ThemedText style={{ color: palette.error }}>{submitError}</ThemedText>
                </View>
              </SurfaceCard>
            ) : null}

            <View style={styles.footerRow}>
              <Clickable onPress={onClose}>
                <View style={[styles.secondaryButton, { borderColor: palette.border }]}>
                  <ThemedText style={{ color: palette.text }}>Cancel</ThemedText>
                </View>
              </Clickable>
              <Clickable onPress={handleSubmit}>
                <View
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: isSubmitting ? palette.border : palette.tint,
                      opacity: selectedBadgeId ? 1 : 0.6,
                    },
                  ]}
                >
                  <ThemedText style={{ color: palette.background, fontWeight: '700' }}>
                    {cooldownActive && !overrideCooldown ? 'Cooldown active' : 'Award badge'}
                  </ThemedText>
                </View>
              </Clickable>
            </View>
          </ScrollView>
        </SurfaceCard>
      </View>
    </Modal>
  );
}

function ParentBadgePreview({
  palette,
  badgeLabel,
  reason,
  note,
  sessionLabel,
  cooldownBypassed,
  presetTitle,
}: {
  palette: typeof Colors.light;
  badgeLabel: string;
  reason: string;
  note: string;
  sessionLabel?: string;
  cooldownBypassed: boolean;
  presetTitle?: string;
}) {
  return (
    <SurfaceCard
      tactile={false}
      style={{
        borderColor: palette.border,
        padding: Spacing.sm,
        gap: Spacing.xs,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
        <Ionicons name="ribbon" size={16} color={palette.tint} />
        <ThemedText type="defaultSemiBold">{badgeLabel}</ThemedText>
        {presetTitle ? (
          <View style={[styles.previewTag, { backgroundColor: `${palette.tint}12` }]}>
            <ThemedText style={{ color: palette.tint, fontSize: 11 }}>{presetTitle}</ThemedText>
          </View>
        ) : null}
        {cooldownBypassed ? (
          <View style={[styles.previewTag, { backgroundColor: `${palette.warning}20` }]}>
            <ThemedText style={{ color: palette.warning, fontSize: 11 }}>Exception</ThemedText>
          </View>
        ) : null}
      </View>
      <ThemedText style={{ color: palette.muted, fontSize: 12 }}>{sessionLabel ?? 'Shared with parents'}</ThemedText>
      <View style={{ gap: 4 }}>
        <ThemedText style={{ fontWeight: '600', color: palette.text }}>{reason}</ThemedText>
        <ThemedText style={{ color: palette.text }}>{note}</ThemedText>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.card,
    flexWrap: 'wrap',
  },
  recentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  cooldownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.card,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  badgeOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: 2,
    maxWidth: '48%',
  },
  reasonChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.rounded,
    borderWidth: 1,
  },
  promptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  promptChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.rounded,
    borderWidth: 1,
  },
  noteInput: {
    padding: Spacing.sm,
    borderWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  secondaryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.card,
    borderWidth: 1,
  },
  primaryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.card,
  },
  helperCard: {
    padding: Spacing.sm,
    gap: Spacing.xs,
    borderWidth: 1,
  },
  helperHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  helperPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  lastAwardCard: {
    borderWidth: 1,
    padding: Spacing.sm,
    borderRadius: Radii.card,
    gap: Spacing.xs,
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  presetCard: {
    width: '48%',
    borderRadius: Radii.card,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: 4,
  },
  presetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  exceptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewTag: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.rounded,
  },
  errorCard: {
    borderWidth: 1,
    padding: Spacing.sm,
  },
});
