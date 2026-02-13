import React, { memo } from 'react';
import { StyleSheet } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { videoService } from '@/services/video-service';

interface VideoDetailsCardProps {
  colors: ThemeColors;
  coachName: string;
  createdAt: string;
  fileSize: number;
  sessionId?: string;
  onViewSession?: (sessionId: string) => void;
}

export const VideoDetailsCard = memo(function VideoDetailsCard({
  colors,
  coachName,
  createdAt,
  fileSize,
  sessionId,
  onViewSession,
}: VideoDetailsCardProps) {
  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="defaultSemiBold" style={styles.title}>
        Details
      </ThemedText>
      <Column gap="sm">
        <Row justify="space-between" align="center">
          <ThemedText style={{ color: colors.muted }}>Coach</ThemedText>
          <ThemedText>{coachName}</ThemedText>
        </Row>
        <Row justify="space-between" align="center">
          <ThemedText style={{ color: colors.muted }}>Uploaded</ThemedText>
          <ThemedText>
            {new Date(createdAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </ThemedText>
        </Row>
        <Row justify="space-between" align="center">
          <ThemedText style={{ color: colors.muted }}>File Size</ThemedText>
          <ThemedText>{videoService.formatFileSize(fileSize)}</ThemedText>
        </Row>
        {sessionId && (
          <Row justify="space-between" align="center">
            <ThemedText style={{ color: colors.muted }}>Session</ThemedText>
            {onViewSession ? (
              <Clickable
                onPress={() => onViewSession(sessionId)}
                accessibilityRole="button"
                accessibilityLabel="View linked session"
              >
                <ThemedText style={{ color: colors.tint }}>View Session</ThemedText>
              </Clickable>
            ) : (
              <ThemedText style={{ color: colors.muted }}>Linked</ThemedText>
            )}
          </Row>
        )}
      </Column>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  title: {
    marginBottom: Spacing.xs,
  },
});
