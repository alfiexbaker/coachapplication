/**
 * BadgeAwardModal — Composition root.
 * Coach awards a badge to an athlete: badge picker, reason, note, preview, celebration.
 */
import { useRef } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/primitives/button';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useBadgeAward } from '@/hooks/use-badge-award';
import type { BadgeAward } from '@/constants/types';
import { CelebrationOverlay, CelebrationOverlayRef } from '@/components/celebration-overlay';
import { BADGE_REASONS } from './badge-award-helpers';
import {
  AthleteHeader,
  BadgeSelector,
  ReasonSelector,
  NoteInput,
  PreviewSection,
  ErrorBanner,
} from './badge-award-sections';

export { BADGE_REASONS };

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
  athletePhotoUrl,
  sessionLabel,
  coachName,
  ...rest
}: BadgeAwardModalProps) {
  const { colors: palette } = useTheme();
  const insets = useSafeAreaInsets();
  const celebrationRef = useRef<CelebrationOverlayRef>(null);
  const award = useBadgeAward({ visible, coachName, ...rest });

  const handleSubmit = async () => {
    const result = await award.handleSubmit();
    if (result?.data) {
      celebrationRef.current?.celebrate({
        title: 'Badge Awarded!',
        subtitle: `${award.selectedBadge?.label} sent to ${award.resolvedAthleteName}`,
        icon: 'ribbon',
        iconColor: palette.warning,
        duration: 2500,
      });
      setTimeout(onClose, 2600);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: withAlpha(palette.text, 0.5) }]}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: palette.background, paddingBottom: insets.bottom + Spacing.md },
          ]}
        >
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: palette.border }]} />
          </View>

          <AthleteHeader
            athleteName={award.resolvedAthleteName}
            athletePhotoUrl={athletePhotoUrl}
            sessionLabel={sessionLabel}
            onClose={onClose}
          />

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <BadgeSelector
              definitions={award.definitions}
              selectedBadgeId={award.selectedBadgeId}
              onSelect={award.handleBadgeSelect}
            />
            <ReasonSelector
              selectedReason={award.selectedReason}
              onSelect={award.handleReasonSelect}
            />
            <NoteInput
              note={award.note}
              onNoteChange={award.setNote}
              onQuickNote={award.handleQuickNote}
            />
            {award.selectedBadge && (
              <PreviewSection
                selectedBadge={award.selectedBadge}
                selectedReason={award.selectedReason}
                note={award.note}
                coachName={coachName}
              />
            )}
            {award.error && <ErrorBanner error={award.error} />}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: palette.border }]}>
            <Button
              onPress={handleSubmit}
              disabled={award.isSubmitting || !award.selectedBadgeId}
              style={styles.submitButton}
            >
              {award.isSubmitting ? 'Sending...' : 'Award Badge'}
            </Button>
          </View>
        </View>
        <CelebrationOverlay ref={celebrationRef} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { flex: 1, borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl, maxHeight: '90%' },
  handleContainer: { alignItems: 'center', paddingVertical: Spacing.sm },
  handle: { width: 36, height: 4, borderRadius: Radii.xs },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.lg },
  footer: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1 },
  submitButton: { width: '100%' },
});
