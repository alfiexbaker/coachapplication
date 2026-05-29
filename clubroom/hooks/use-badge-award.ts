/**
 * useBadgeAward — State and handlers for badge award modal.
 */
import { useEffect, useState, startTransition } from 'react';
import * as Haptics from 'expo-haptics';
import { badgeService } from '@/services/badge-service';
import type { BadgeAward, BadgeDefinition } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { BADGE_REASONS } from '@/components/badges/badge-award-helpers';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

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
  const {
    visible,
    athleteId,
    coachId,
    coachName,
    sessionId,
    initialReason,
    initialNote,
    onAwarded,
  } = opts;
  const resolvedAthleteName = opts.athleteName || 'Athlete';

  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(initialReason ?? BADGE_REASONS[0]);
  const [note, setNote] = useState(initialNote ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveSelectedBadgeId = selectedBadgeId ?? definitions[0]?.id ?? null;
  const selectedBadge = definitions.find((d) => d.id === effectiveSelectedBadgeId);

  useEffect(() => {
    if (!visible) return;
    startTransition(() => {
      setError(null);
    });
    startTransition(() => {
      setNote(initialNote ?? '');
    });
    startTransition(() => {
      setSelectedReason(initialReason ?? BADGE_REASONS[0]);
    });
    badgeService.listDefinitions().then((defs) => {
      setDefinitions(defs);
    });
    logger.info('badge_award_opened', { athleteId, sessionId, coachId });
  }, [visible, athleteId, coachId, sessionId, initialNote, initialReason]);

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
    setNote((prev) => (prev ? `${prev} ${quickNote}` : quickNote));
  };

  const handleSubmit = async () => {
    if (!effectiveSelectedBadgeId) {
      setError('Please select a badge');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    return await runAsyncTryCatchFinally(
      async () => {
        const result = await badgeService.awardBadge({
          badgeId: effectiveSelectedBadgeId,
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
        if (!result.success) {
          setError(result.error.message);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onAwarded?.(result.data);
        logger.info('badge_award_submitted', {
          athleteId,
          sessionId,
          badgeId: effectiveSelectedBadgeId,
          reason: selectedReason,
        });
        return result;
      },
      async (err) => {
        setError(err instanceof Error ? err.message : 'Failed to award badge');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return undefined;
      },
      () => {
        setIsSubmitting(false);
      },
    );
  };

  return {
    definitions,
    selectedBadgeId: effectiveSelectedBadgeId,
    selectedBadge,
    selectedReason,
    note,
    setNote,
    isSubmitting,
    error,
    resolvedAthleteName,
    handleBadgeSelect,
    handleReasonSelect,
    handleQuickNote,
    handleSubmit,
  };
}
