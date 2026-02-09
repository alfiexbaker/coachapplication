/**
 * useBadgeAward — State and handlers for badge award modal.
 */
import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { badgeService } from '@/services/badge-service';
import type { BadgeAward, BadgeDefinition } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { BADGE_REASONS } from '@/components/badges/badge-award-helpers';

const logger = createLogger('BadgeAwardModal');

interface UseBadgeAwardOptions {
  visible: boolean;
  athleteId: string;
  athleteName: string;
  coachId: string;
  coachName?: string;
  sessionId?: string;
  initialReason?: string;
  initialNote?: string;
  onAwarded?: (award: BadgeAward) => void;
}

export function useBadgeAward(opts: UseBadgeAwardOptions) {
  const { visible, athleteId, coachId, coachName, sessionId, initialReason, initialNote, onAwarded } = opts;
  const resolvedAthleteName = opts.athleteName || 'Athlete';

  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(initialReason ?? BADGE_REASONS[0]);
  const [note, setNote] = useState(initialNote ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBadge = definitions.find((d) => d.id === selectedBadgeId);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setNote(initialNote ?? '');
    setSelectedReason(initialReason ?? BADGE_REASONS[0]);
    badgeService.listDefinitions().then((defs) => {
      setDefinitions(defs);
      if (!selectedBadgeId && defs.length > 0) setSelectedBadgeId(defs[0].id);
    });
    logger.info('badge_award_opened', { athleteId, sessionId, coachId });
  }, [visible, athleteId, coachId, sessionId, initialNote, initialReason, selectedBadgeId]);

  const handleBadgeSelect = (badgeId: string) => { Haptics.selectionAsync(); setSelectedBadgeId(badgeId); };
  const handleReasonSelect = (reason: string) => { Haptics.selectionAsync(); setSelectedReason(reason); };
  const handleQuickNote = (quickNote: string) => { Haptics.selectionAsync(); setNote((prev) => prev ? `${prev} ${quickNote}` : quickNote); };

  const handleSubmit = async () => {
    if (!selectedBadgeId) { setError('Please select a badge'); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await badgeService.awardBadge({
        badgeId: selectedBadgeId, athleteId, athleteName: resolvedAthleteName,
        coachId, coachName, sessionId, reason: selectedReason, note: note.trim(),
        visibility: 'supporters', context: sessionId ? 'session' : 'athlete_profile',
      });
      if (!result.success) { setError(result.error.message); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onAwarded?.(result.data);
      logger.info('badge_award_submitted', { athleteId, sessionId, badgeId: selectedBadgeId, reason: selectedReason });
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to award badge');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return undefined;
    } finally { setIsSubmitting(false); }
  };

  return {
    definitions, selectedBadgeId, selectedBadge, selectedReason, note, setNote,
    isSubmitting, error, resolvedAthleteName,
    handleBadgeSelect, handleReasonSelect, handleQuickNote, handleSubmit,
  };
}
