import { Ionicons } from '@expo/vector-icons';
import { Alert, Modal, StyleSheet, TextInput, View, Keyboard } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';

import { DifficultyBadge } from './DifficultyBadge';
import { AssignmentCardCompact } from './assignment-card-compact';
import {
  type AssignmentCardProps,
  getStatusColor,
  getDueDateText,
} from './assignment-card-helpers';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { drillService } from '@/services/drill-service';
import { scaleFont } from '@/utils/scale';
import { Row } from '@/components/primitives';
import { Column } from '@/components/primitives/column';
import { Button } from '@/components/primitives/button';
import { VideoPlayer } from './VideoPlayer';

// ─── Re-export ──────────────────────────────────────────────────────────────

export type { AssignmentCardProps };

// ─── Component ──────────────────────────────────────────────────────────────

export function AssignmentCard({
  assignment,
  onPress,
  onComplete,
  compact = false,
}: AssignmentCardProps) {
  const { colors: palette } = useTheme();
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceUri, setEvidenceUri] = useState<string | null>(assignment.evidenceVideoUri ?? null);
  const [completionNotes, setCompletionNotes] = useState(assignment.evidenceNotes ?? '');
  const [submittingEvidence, setSubmittingEvidence] = useState(false);

  if (compact) {
    return (
      <AssignmentCardCompact assignment={assignment} onPress={onPress} onComplete={onComplete} />
    );
  }

  const { drill } = assignment;
  const isOverdue = drillService.isOverdue(assignment);
  const isDueSoon = drillService.isDueSoon(assignment);
  const categoryInfo = drill ? drillService.getCategoryInfo(drill.category) : null;
  const hasVideo = Boolean(drill?.videoUrl);
  const statusColor = getStatusColor(assignment, palette, isOverdue, isDueSoon);
  const requiresEvidence = Boolean(assignment.requiresEvidence);

  const handlePickEvidence = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      setEvidenceUri(result.assets[0].uri);
    }
  }, []);

  const handleCompletePress = useCallback(async () => {
    if (requiresEvidence) {
      setShowEvidenceModal(true);
      return;
    }
    onComplete?.();
  }, [onComplete, requiresEvidence]);

  const handleSubmitEvidence = useCallback(async () => {
    if (!evidenceUri) {
      Alert.alert('Evidence Required', 'Please upload a video before submitting.');
      return;
    }
    setSubmittingEvidence(true);
    try {
      await Promise.resolve(onComplete?.({ evidenceVideoUri: evidenceUri, notes: completionNotes.trim() || undefined }));
      setShowEvidenceModal(false);
    } finally {
      setSubmittingEvidence(false);
    }
  }, [completionNotes, evidenceUri, onComplete]);

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      {/* Status bar */}
      <View style={[styles.statusBar, { backgroundColor: statusColor }]} />

      <View style={styles.cardContent}>
        {/* Thumbnail with completion overlay */}
        {drill?.thumbnailUrl && (
          <View style={styles.thumbnailContainer}>
            <Image source={{ uri: drill.thumbnailUrl }} style={styles.thumbnail} />
            {assignment.isCompleted && (
              <View
                style={[
                  styles.completedOverlay,
                  { backgroundColor: withAlpha(palette.success, 0.6) },
                ]}
              >
                <Ionicons name="checkmark-circle" size={48} color={palette.onPrimary} />
              </View>
            )}
            {hasVideo && !assignment.isCompleted && (
              <View style={[styles.playOverlay, { backgroundColor: withAlpha(palette.text, 0.3) }]}>
                <View
                  style={[styles.playButton, { backgroundColor: withAlpha(palette.text, 0.6) }]}
                >
                  <Ionicons name="play" size={20} color={palette.onPrimary} />
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.content}>
          {/* Header with category and priority */}
          <Row style={styles.header}>
            {categoryInfo && (
              <Row
                style={[
                  styles.categoryBadge,
                  { backgroundColor: withAlpha(categoryInfo.color, 0.12) },
                ]}
              >
                <Ionicons
                  name={categoryInfo.icon as keyof typeof Ionicons.glyphMap}
                  size={12}
                  color={categoryInfo.color}
                />
                <ThemedText style={[styles.categoryText, { color: categoryInfo.color }]}>
                  {categoryInfo.label}
                </ThemedText>
              </Row>
            )}
            {!assignment.isCompleted && assignment.priority === 1 && (
              <Row
                style={[
                  styles.priorityBadgeFull,
                  { backgroundColor: withAlpha(palette.error, 0.09) },
                ]}
              >
                <Ionicons name="alert-circle" size={12} color={palette.error} />
                <ThemedText style={[styles.priorityText, { color: palette.error }]}>
                  Priority
                </ThemedText>
              </Row>
            )}
          </Row>

          {/* Title */}
          <ThemedText
            type="defaultSemiBold"
            style={[styles.title, assignment.isCompleted ? styles.completedText : undefined]}
            numberOfLines={2}
          >
            {drill?.title ?? 'Unknown Drill'}
          </ThemedText>

          {/* Coach notes */}
          {assignment.notes && (
            <Row style={[styles.notesContainer, { backgroundColor: palette.surfaceSecondary }]}>
              <Ionicons name="chatbubble-outline" size={12} color={palette.muted} />
              <ThemedText style={[styles.notesText, { color: palette.muted }]} numberOfLines={2}>
                {assignment.notes}
              </ThemedText>
            </Row>
          )}

          {/* Footer with due date and actions */}
          <Row style={[styles.footer, { borderTopColor: palette.border }]}>
            <Row style={styles.dueDateContainer}>
              <Ionicons
                name={assignment.isCompleted ? 'checkmark-circle' : 'calendar-outline'}
                size={16}
                color={statusColor}
              />
              <ThemedText style={[styles.dueDateText, { color: statusColor }]}>
                {getDueDateText(assignment, isOverdue, isDueSoon)}
              </ThemedText>
            </Row>
            <Row style={styles.footerRight}>
              {drill && <DifficultyBadge difficulty={drill.difficulty} size="small" />}
              {drill?.duration && (
                <Row style={styles.durationBadge}>
                  <Ionicons name="time-outline" size={12} color={palette.muted} />
                  <ThemedText style={[styles.durationText, { color: palette.muted }]}>
                    {drillService.formatDuration(drill.duration)}
                  </ThemedText>
                </Row>
              )}
            </Row>
          </Row>

          {/* Repetitions indicator */}
          {assignment.repetitions && assignment.repetitions > 1 && (
            <Row
              style={[styles.repetitionsContainer, { backgroundColor: palette.surfaceSecondary }]}
            >
              <Ionicons name="repeat" size={14} color={palette.tint} />
              <ThemedText style={[styles.repetitionsText, { color: palette.tint }]}>
                {assignment.repetitions} sets
              </ThemedText>
            </Row>
          )}

          {requiresEvidence && !assignment.isCompleted ? (
            <Row
              style={[
                styles.evidenceHint,
                { backgroundColor: withAlpha(palette.warning, 0.09), borderColor: withAlpha(palette.warning, 0.25) },
              ]}
            >
              <Ionicons name="videocam-outline" size={14} color={palette.warning} />
              <ThemedText style={[styles.evidenceHintText, { color: palette.warning }]}>
                Video evidence required
              </ThemedText>
            </Row>
          ) : null}

          {/* Complete button */}
          {!assignment.isCompleted && onComplete && (
            <Clickable
              onPress={onComplete}
              style={[styles.completeButton, { backgroundColor: palette.tint }]}
            >
              <Ionicons name="checkmark" size={18} color={palette.onPrimary} />
              <ThemedText style={[styles.completeButtonText, { color: palette.onPrimary }]}>
                {requiresEvidence ? 'Submit Completion' : 'Mark Complete'}
              </ThemedText>
            </Clickable>
          )}
        </View>
      </View>

      <Modal
        visible={showEvidenceModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowEvidenceModal(false);
        }}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: withAlpha(palette.background, 0.9) }]}>
          <SurfaceCard style={styles.modalCard}>
            <Column gap="sm">
              <ThemedText type="defaultSemiBold">Submit Evidence</ThemedText>
              {evidenceUri ? (
                <VideoPlayer videoUrl={evidenceUri} height={180} />
              ) : (
                <Button variant="secondary" onPress={handlePickEvidence}>
                  Choose Video Evidence
                </Button>
              )}
              {evidenceUri ? (
                <Button variant="secondary" onPress={handlePickEvidence}>
                  Replace Video
                </Button>
              ) : null}
              <TextInput
                value={completionNotes}
                onChangeText={setCompletionNotes}
                placeholder="Add notes (optional)"
                placeholderTextColor={palette.muted}
                multiline
                style={[
                  styles.evidenceNotesInput,
                  {
                    color: palette.text,
                    borderColor: palette.border,
                    backgroundColor: palette.surface,
                  },
                ]}
                maxLength={300}
              />
              <Row gap="xs">
                <Button
                  variant="secondary"
                  onPress={() => setShowEvidenceModal(false)}
                  style={styles.modalAction}
                  disabled={submittingEvidence}
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleSubmitEvidence}
                  style={styles.modalAction}
                  disabled={submittingEvidence}
                >
                  {submittingEvidence ? 'Submitting...' : 'Submit'}
                </Button>
              </Row>
            </Column>
          </SurfaceCard>
        </View>
      </Modal>
    </SurfaceCard>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.md, overflow: 'hidden' },
  statusBar: { height: 4, width: '100%' },
  cardContent: {},
  thumbnailContainer: { position: 'relative', width: '100%', height: 140 },
  thumbnail: { width: '100%', height: '100%' },
  completedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: Components.card.padding, gap: Spacing.xs },
  header: { alignItems: 'center', gap: Spacing.xs },
  categoryBadge: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  categoryText: { fontSize: scaleFont(11), fontWeight: '600' },
  priorityBadgeFull: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  priorityText: { fontSize: scaleFont(11), fontWeight: '600' },
  title: {
    fontSize: scaleFont(17),
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: scaleFont(24),
  },
  completedText: { textDecorationLine: 'line-through', opacity: 0.7 },
  notesContainer: {
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    marginTop: Spacing.xxs,
  },
  notesText: { flex: 1, fontSize: scaleFont(13), lineHeight: scaleFont(18), fontStyle: 'italic' },
  footer: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  dueDateContainer: { alignItems: 'center', gap: Spacing.xxs },
  dueDateText: { fontSize: scaleFont(13), fontWeight: '600' },
  footerRight: { alignItems: 'center', gap: Spacing.sm },
  durationBadge: { alignItems: 'center', gap: Spacing.xxs },
  durationText: { fontSize: scaleFont(12) },
  repetitionsContainer: {
    alignItems: 'center',
    gap: Spacing.xxs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    marginTop: Spacing.xxs,
  },
  repetitionsText: { fontSize: scaleFont(13), fontWeight: '600' },
  evidenceHint: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: Spacing.xxs,
    borderWidth: 1,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    marginTop: Spacing.xxs,
  },
  evidenceHintText: { fontSize: scaleFont(12), fontWeight: '600' },
  completeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs + Spacing.xxs,
    borderRadius: Radii.md,
    marginTop: Spacing.sm,
  },
  completeButtonText: { fontSize: scaleFont(15), fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: Spacing.lg,
  },
  modalCard: {
    padding: Spacing.md,
  },
  evidenceNotesInput: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    textAlignVertical: 'top',
  },
  modalAction: {
    flex: 1,
  },
});
