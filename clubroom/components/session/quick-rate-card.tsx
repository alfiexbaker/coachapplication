import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { POSITION_LABELS, POSITION_SKILLS, UNIVERSAL_SKILLS } from '@/constants/position-skills';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { FootballSkill, PositionRole, QuickRateInput } from '@/types/progress-types';
import { useSessionMedia } from '@/hooks/use-session-media';
import { MediaCaptureButton } from './media-capture-button';
import { MediaThumbnailStrip } from './media-thumbnail-strip';
import { PositionSelector } from './position-selector';
import { VideoRecorderOverlay } from './video-recorder-overlay';
import { DotRating } from './dot-rating';

interface QuickRateCardProps {
  athleteName: string;
  rating: QuickRateInput;
  onPositionChange: (position: PositionRole) => void;
  onSkillChange: (skill: FootballSkill, value: number) => void;
  onEffortChange: (value: number) => void;
  onBadgePress: () => void;
  onMediaIdsChange?: (mediaIds: string[]) => void;
}

function getSkillRating(rating: QuickRateInput, skill: FootballSkill): number {
  const entry = (rating.positionSkillRatings ?? []).find((item) => item.skill === skill);
  if (!entry) {
    return 3;
  }
  return Math.max(1, Math.min(5, Math.round(entry.rating)));
}

export const QuickRateCard = function QuickRateCard({
  athleteName,
  rating,
  onPositionChange,
  onSkillChange,
  onEffortChange,
  onBadgePress,
  onMediaIdsChange,
}: QuickRateCardProps) {
  const { colors } = useTheme();
  const media = useSessionMedia({
    sessionId: rating.sessionId,
    athleteId: rating.athleteId,
    coachId: rating.coachId,
  });

  const position = rating.positionPlayed ?? 'MID';

  const universalSkills = UNIVERSAL_SKILLS;
  const positionalSkills = POSITION_SKILLS[position];

  useEffect(() => {
    onMediaIdsChange?.(media.mediaIds);
  }, [media.mediaIds, onMediaIdsChange]);

  return (
    <SurfaceCard style={styles.card}>
      <Row align="center" gap="sm">
        <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
          <ThemedText style={[styles.avatarText, { color: colors.tint }]}>
            {athleteName.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <Column gap="xxs" style={styles.headerTextWrap}>
          <ThemedText style={styles.athleteName}>{athleteName}</ThemedText>
          <ThemedText style={[styles.subLabel, { color: colors.muted }]}>Position + 9 skill ratings</ThemedText>
        </Column>
      </Row>

      <Column gap="xs" style={styles.ratingBlock}>
        <Column gap="xxs">
          <ThemedText style={styles.sectionLabel}>Position Played</ThemedText>
          <PositionSelector value={position} onChange={onPositionChange} />
        </Column>

        <Column gap="xxs">
          <ThemedText style={styles.sectionLabel}>Universal Skills</ThemedText>
          {universalSkills.map((skill) => (
            <DotRating
              key={skill}
              label={skill}
              icon="sparkles"
              value={getSkillRating(rating, skill)}
              onChange={(value) => onSkillChange(skill, value)}
            />
          ))}
        </Column>

        <Column gap="xxs">
          <ThemedText style={styles.sectionLabel}>{POSITION_LABELS[position]} Skills</ThemedText>
          {positionalSkills.map((skill) => (
            <DotRating
              key={skill}
              label={skill}
              icon="football"
              value={getSkillRating(rating, skill)}
              onChange={(value) => onSkillChange(skill, value)}
            />
          ))}
        </Column>
      </Column>

      <View style={[styles.separator, { backgroundColor: colors.border }]} />

      <DotRating label="Effort" icon="flash" value={rating.effort} onChange={onEffortChange} />

      <Row gap="xs" wrap>
        <MediaCaptureButton
          mode="photo"
          onPress={() => {
            void media.takePhoto();
          }}
          disabled={!media.canTakePhoto}
          countLabel={`${media.photos.length}/3`}
        />
        <MediaCaptureButton
          mode="video"
          onPress={() => {
            void media.recordVideo();
          }}
          disabled={!media.canRecordVideo}
          countLabel={`${media.video ? 1 : 0}/1`}
        />

        <Clickable
          style={[
            styles.badgeButton,
            {
              borderColor: rating.badgeId ? colors.warning : colors.border,
              backgroundColor: rating.badgeId ? withAlpha(colors.warning, 0.14) : colors.background,
            },
          ]}
          onPress={onBadgePress}
          accessibilityLabel={`Award badge for ${athleteName}`}
          accessibilityRole="button"
        >
          <Row align="center" justify="center" gap="xs">
            <Ionicons
              name={rating.badgeId ? 'ribbon' : 'ribbon-outline'}
              size={18}
              color={rating.badgeId ? colors.warning : colors.text}
            />
            <ThemedText
              style={[
                styles.badgeButtonText,
                { color: rating.badgeId ? colors.warning : colors.text },
              ]}
            >
              {rating.badgeId ? 'Badge selected' : 'Award badge'}
            </ThemedText>
          </Row>
        </Clickable>
      </Row>

      <MediaThumbnailStrip photos={media.photos} video={media.video} onRemove={media.removeMedia} />

      <VideoRecorderOverlay
        visible={media.cameraVisible}
        mode={media.cameraMode}
        isRecording={media.isRecording}
        secondsRemaining={media.recordingSeconds}
        onClose={media.closeCamera}
        onPhotoCaptured={media.handlePhotoCaptured}
        onVideoCaptured={media.handleVideoCaptured}
        onRecordingStateChange={media.setIsRecording}
        onSecondsRemainingChange={media.setRecordingSeconds}
      />
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.bodySemiBold,
  },
  headerTextWrap: {
    flex: 1,
  },
  athleteName: {
    ...Typography.subheading,
  },
  subLabel: {
    ...Typography.small,
  },
  sectionLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ratingBlock: {
    marginTop: Spacing.xs,
  },
  separator: {
    height: 1,
  },
  badgeButton: {
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    minWidth: 128,
    justifyContent: 'center',
  },
  badgeButtonText: {
    ...Typography.bodySmallSemiBold,
  },
});
