import React, { memo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Components, Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { AttendanceStatus, AthleteAttendanceData } from './attendance-step';

interface GroupCompletionBoardProps {
  colors: ThemeColors;
  athletes: AthleteAttendanceData[];
  parentNameByRegistration: Record<string, string>;
  groupMessage: string;
  videoUrls: string[];
  imageUrls: string[];
  onGroupMessageChange: (value: string) => void;
  onUpdateStatus: (registrationId: string, status: AttendanceStatus) => void;
  onSelectAll: () => void;
  onSendGroupMessage: () => void;
  onPersonalFeedback: (registrationId: string) => void;
  onMessage: (registrationId: string) => void;
  onAddVideo: () => void;
  onRemoveVideo: (index: number) => void;
  onAddImage: () => void;
  onRemoveImage: (index: number) => void;
}

const ATTENDANCE_STATUS_OPTIONS: AttendanceStatus[] = ['present', 'absent'];

function getAttendanceIcon(status: AttendanceStatus) {
  switch (status) {
    case 'present':
      return 'checkmark-circle' as const;
    case 'absent':
      return 'close-circle' as const;
    default:
      return 'ellipse-outline' as const;
  }
}

function getStatusColor(status: AttendanceStatus, colors: ThemeColors) {
  switch (status) {
    case 'present':
      return colors.success;
    case 'absent':
      return colors.error;
    default:
      return colors.muted;
  }
}

export const GroupCompletionBoard = memo(function GroupCompletionBoard({
  colors,
  athletes,
  parentNameByRegistration,
  groupMessage,
  videoUrls,
  imageUrls,
  onGroupMessageChange,
  onUpdateStatus,
  onSelectAll,
  onSendGroupMessage,
  onPersonalFeedback,
  onMessage,
  onAddVideo,
  onRemoveVideo,
  onAddImage,
  onRemoveImage,
}: GroupCompletionBoardProps) {
  const canSendGroupMessage = groupMessage.trim().length > 0;

  return (
    <View style={styles.container}>
      <SurfaceCard style={styles.sectionCard}>
        <ThemedText type="subtitle">Participants & Attendance</ThemedText>
        <ThemedText style={[styles.helperCopy, { color: colors.muted }]}>
          Mark attendance and send follow-ups from one board.
        </ThemedText>

        <Row gap="xs" style={styles.bulkActions}>
          <Clickable
            style={[styles.pillButton, { backgroundColor: withAlpha(colors.success, 0.12) }]}
            onPress={onSelectAll}
          >
            <ThemedText style={[styles.pillButtonText, { color: colors.success }]}>
              Select all present
            </ThemedText>
          </Clickable>
        </Row>

        <View style={styles.rowsContainer}>
          {athletes.map((athlete) => (
            <View
              key={athlete.registrationId}
              style={[styles.athleteRowCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Row align="center" justify="space-between" style={styles.rowHeader}>
                <Row align="center" gap="xs" style={styles.identityCluster}>
                  <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
                    <ThemedText style={[styles.avatarText, { color: colors.tint }]}>
                      {athlete.userName.charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                  <View style={styles.identityCell}>
                    <ThemedText type="defaultSemiBold" numberOfLines={1}>
                      {athlete.userName}
                    </ThemedText>
                    <ThemedText style={[styles.parentLabel, { color: colors.muted }]} numberOfLines={1}>
                      {parentNameByRegistration[athlete.registrationId]
                        ? `Parent: ${parentNameByRegistration[athlete.registrationId]}`
                        : 'No parent link'}
                    </ThemedText>
                  </View>
                </Row>

                <Row gap="xxs" style={styles.statusButtons}>
                  {ATTENDANCE_STATUS_OPTIONS.map((status) => {
                    const selected = athlete.status === status;
                    const color = getStatusColor(status, colors);
                    return (
                      <Clickable
                        key={status}
                        style={[
                          styles.statusButton,
                          selected
                            ? { backgroundColor: withAlpha(color, 0.12), borderColor: color }
                            : { borderColor: colors.border },
                        ]}
                        onPress={() => onUpdateStatus(athlete.registrationId, status)}
                        accessibilityLabel={`${athlete.userName} marked ${status}`}
                      >
                        <Ionicons
                          name={getAttendanceIcon(status)}
                          size={16}
                          color={selected ? color : colors.muted}
                        />
                      </Clickable>
                    );
                  })}
                </Row>
              </Row>

              <Row gap="xs" style={styles.actionsRow}>
                <Clickable
                  style={[
                    styles.inlineAction,
                    {
                      backgroundColor: withAlpha(colors.tint, 0.08),
                    },
                  ]}
                  onPress={() => onPersonalFeedback(athlete.registrationId)}
                >
                  <Row align="center" justify="center" gap="micro">
                    <Ionicons name="create-outline" size={12} color={colors.tint} />
                    <ThemedText numberOfLines={1} style={[styles.inlineActionText, { color: colors.tint }]}>
                      Personal feedback
                    </ThemedText>
                  </Row>
                </Clickable>
                <Clickable
                  style={[
                    styles.inlineAction,
                    {
                      backgroundColor: withAlpha(colors.icon, 0.08),
                    },
                  ]}
                  onPress={() => onMessage(athlete.registrationId)}
                >
                  <Row align="center" justify="center" gap="micro">
                    <Ionicons name="chatbubble-ellipses-outline" size={12} color={colors.icon} />
                    <ThemedText numberOfLines={1} style={[styles.inlineActionText, { color: colors.icon }]}>
                      Message
                    </ThemedText>
                  </Row>
                </Clickable>
              </Row>
            </View>
          ))}
        </View>

      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <Row align="center" justify="space-between">
          <ThemedText type="subtitle">Group Media</ThemedText>
          <ThemedText style={[styles.mediaCountText, { color: colors.muted }]}>
            {videoUrls.length + imageUrls.length} attached
          </ThemedText>
        </Row>

        <Row gap="xs">
          <Clickable
            style={[styles.mediaActionButton, { borderColor: colors.border }]}
            onPress={onAddVideo}
          >
            <Row align="center" justify="center" gap="xxs">
              <Ionicons name="videocam-outline" size={14} color={colors.text} />
              <ThemedText style={styles.mediaActionText}>Add video</ThemedText>
            </Row>
          </Clickable>
          <Clickable
            style={[styles.mediaActionButton, { borderColor: colors.border }]}
            onPress={onAddImage}
          >
            <Row align="center" justify="center" gap="xxs">
              <Ionicons name="image-outline" size={14} color={colors.text} />
              <ThemedText style={styles.mediaActionText}>Add photo</ThemedText>
            </Row>
          </Clickable>
        </Row>

        {videoUrls.length === 0 && imageUrls.length === 0 ? (
          <View style={[styles.emptyMediaState, { borderColor: colors.border }]}>
            <Ionicons name="images-outline" size={20} color={colors.muted} />
            <ThemedText style={[styles.emptyMediaText, { color: colors.muted }]}>
              Add clips or photos for this group session record.
            </ThemedText>
          </View>
        ) : (
          <View style={styles.mediaList}>
            {videoUrls.map((_, index) => (
              <Row
                key={`video-${index}`}
                align="center"
                justify="space-between"
                style={[styles.mediaRow, { borderColor: colors.border }]}
              >
                <Row align="center" gap="xs">
                  <Ionicons name="videocam" size={16} color={colors.tint} />
                  <ThemedText style={styles.mediaRowText}>Video {index + 1}</ThemedText>
                </Row>
                <Clickable
                  onPress={() => onRemoveVideo(index)}
                  accessibilityLabel={`Remove video ${index + 1}`}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </Clickable>
              </Row>
            ))}

            {imageUrls.map((_, index) => (
              <Row
                key={`image-${index}`}
                align="center"
                justify="space-between"
                style={[styles.mediaRow, { borderColor: colors.border }]}
              >
                <Row align="center" gap="xs">
                  <Ionicons name="image" size={16} color={colors.tint} />
                  <ThemedText style={styles.mediaRowText}>Photo {index + 1}</ThemedText>
                </Row>
                <Clickable
                  onPress={() => onRemoveImage(index)}
                  accessibilityLabel={`Remove photo ${index + 1}`}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </Clickable>
              </Row>
            ))}
          </View>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.sectionCard}>
        <Row align="center" gap="xs" style={styles.broadcastHeader}>
          <Ionicons name="megaphone-outline" size={18} color={colors.tint} />
          <ThemedText type="subtitle">Group Update</ThemedText>
        </Row>
        <TextInput
          value={groupMessage}
          onChangeText={onGroupMessageChange}
          placeholder="Share one update to the whole group..."
          placeholderTextColor={colors.muted}
          multiline
          style={[
            styles.broadcastInput,
            {
              borderColor: colors.border,
              color: colors.text,
              backgroundColor: withAlpha(colors.surface, 0.6),
            },
          ]}
        />
        <Clickable
          style={[
            styles.sendButton,
            { backgroundColor: canSendGroupMessage ? colors.tint : colors.muted },
          ]}
          onPress={onSendGroupMessage}
          disabled={!canSendGroupMessage}
        >
          <Row align="center" justify="center" gap="xs">
            <Ionicons name="send" size={16} color={colors.onPrimary} />
            <ThemedText style={[styles.sendButtonText, { color: colors.onPrimary }]}>
              Send to Group
            </ThemedText>
          </Row>
        </Clickable>
      </SurfaceCard>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  sectionCard: {
    gap: Spacing.sm,
  },
  helperCopy: {
    ...Typography.caption,
  },
  bulkActions: {
    marginTop: Spacing.xs,
  },
  pillButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  pillButtonText: {
    ...Typography.smallSemiBold,
  },
  tableContainer: {
    borderWidth: 0,
    borderRadius: 0,
    overflow: 'visible',
  },
  rowsContainer: {
    gap: Spacing.xs,
  },
  athleteRowCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  rowHeader: {
    marginBottom: Spacing.xs,
  },
  identityCluster: {
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.smallSemiBold,
  },
  identityCell: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.micro,
    paddingRight: Spacing.xs,
  },
  parentLabel: {
    ...Typography.caption,
  },
  statusButtons: {
    alignItems: 'center',
    flexShrink: 0,
  },
  statusButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    width: '100%',
  },
  inlineAction: {
    flex: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineActionText: {
    ...Typography.caption,
    letterSpacing: -0.1,
  },
  mediaCountText: {
    ...Typography.caption,
  },
  mediaActionButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radii.pill,
    minHeight: 38,
    justifyContent: 'center',
  },
  mediaActionText: {
    ...Typography.smallSemiBold,
  },
  emptyMediaState: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyMediaText: {
    ...Typography.small,
    textAlign: 'center',
  },
  mediaList: {
    gap: Spacing.xs,
  },
  mediaRow: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  mediaRowText: {
    ...Typography.smallSemiBold,
  },
  broadcastHeader: {
    marginBottom: Spacing.micro,
  },
  broadcastInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    minHeight: 96,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    textAlignVertical: 'top',
    ...Typography.body,
  },
  sendButton: {
    marginTop: Spacing.xs,
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
    justifyContent: 'center',
  },
  sendButtonText: {
    ...Typography.subheading,
  },
});
