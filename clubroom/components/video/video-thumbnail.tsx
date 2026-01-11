import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { LocalVideo } from '@/services/video-service';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VideoThumbnailProps {
  video: LocalVideo;
  onPlaybackError?: (error: string) => void;
  showTitle?: boolean;
  compact?: boolean;
}

export function VideoThumbnail({
  video,
  onPlaybackError,
  showTitle = true,
  compact = false,
}: VideoThumbnailProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOpenModal = useCallback(async () => {
    // Check if video file exists
    try {
      const fileInfo = await FileSystem.getInfoAsync(video.localUri);
      if (!fileInfo.exists) {
        setHasError(true);
        onPlaybackError?.('Video file not found');
        return;
      }
      setIsModalVisible(true);
      setIsLoading(true);
      setHasError(false);
    } catch (error) {
      // If we can't check (e.g., remote URL), try to open anyway
      setIsModalVisible(true);
      setIsLoading(true);
      setHasError(false);
    }
  }, [video.localUri, onPlaybackError]);

  const handleCloseModal = useCallback(() => {
    setIsModalVisible(false);
    setIsPlaying(false);
  }, []);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        setHasError(true);
        setIsLoading(false);
        onPlaybackError?.(status.error);
      }
      return;
    }

    setIsLoading(false);
    setIsPlaying(status.isPlaying);
    setCurrentTime(status.positionMillis / 1000);
    if (status.durationMillis) {
      setDuration(status.durationMillis / 1000);
    }
  }, [onPlaybackError]);

  return (
    <>
      <Clickable onPress={handleOpenModal}>
        <SurfaceCard style={[styles.card, compact && styles.cardCompact]}>
          <View style={[styles.thumbnailContainer, compact && styles.thumbnailCompact]}>
            {video.thumbnail ? (
              <Image
                source={{ uri: video.thumbnail }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.placeholderThumbnail, { backgroundColor: `${palette.tint}15` }]}>
                <Ionicons name="videocam" size={compact ? 24 : 32} color={palette.tint} />
              </View>
            )}

            {/* Play overlay */}
            <View style={styles.playOverlay}>
              {hasError ? (
                <View style={[styles.errorBadge, { backgroundColor: palette.error }]}>
                  <Ionicons name="alert-circle" size={20} color="#fff" />
                </View>
              ) : (
                <View style={styles.playButton}>
                  <Ionicons name="play" size={compact ? 20 : 28} color="#fff" />
                </View>
              )}
            </View>

            {/* Duration badge */}
            {video.duration && !hasError && (
              <View style={styles.durationBadge}>
                <ThemedText style={styles.durationText}>
                  {formatDuration(video.duration)}
                </ThemedText>
              </View>
            )}

            {/* Shared indicator */}
            {video.visibility === 'SHARED' && (
              <View style={[styles.sharedBadge, { backgroundColor: palette.tint }]}>
                <Ionicons name="people" size={10} color="#fff" />
              </View>
            )}
          </View>

          {/* Video info */}
          {showTitle && (
            <View style={[styles.infoContainer, compact && styles.infoContainerCompact]}>
              <ThemedText numberOfLines={1} style={[styles.title, compact && styles.titleCompact]}>
                {video.title}
              </ThemedText>
              {hasError && (
                <ThemedText style={[styles.errorText, { color: palette.error }]}>
                  Video unavailable
                </ThemedText>
              )}
            </View>
          )}
        </SurfaceCard>
      </Clickable>

      {/* Full-screen video player modal */}
      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent
        onRequestClose={handleCloseModal}
        supportedOrientations={['portrait', 'landscape']}
      >
        <View style={styles.modalContainer}>
          <Animated.View entering={FadeIn} style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Clickable onPress={handleCloseModal} hitSlop={12}>
                <Ionicons name="close" size={28} color="#fff" />
              </Clickable>
              <View style={styles.modalHeaderTitle}>
                <ThemedText style={styles.modalTitle} numberOfLines={1}>
                  {video.title}
                </ThemedText>
                {video.description && (
                  <ThemedText style={styles.modalSubtitle} numberOfLines={1}>
                    {video.description}
                  </ThemedText>
                )}
              </View>
              <View style={{ width: 28 }} />
            </View>

            {/* Video Player */}
            <View style={styles.videoContainer}>
              {hasError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={64} color="#999" />
                  <ThemedText style={styles.errorMessage}>
                    Video unavailable
                  </ThemedText>
                  <ThemedText style={styles.errorHint}>
                    The video file may have been moved or deleted.
                  </ThemedText>
                </View>
              ) : (
                <>
                  <Video
                    source={{ uri: video.localUri }}
                    style={styles.video}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping={false}
                    shouldPlay
                    onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                    onError={(error) => {
                      console.error('Video playback error:', error);
                      setHasError(true);
                      setIsLoading(false);
                    }}
                  />
                  {isLoading && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="large" color="#fff" />
                      <ThemedText style={styles.loadingText}>Loading video...</ThemedText>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <View style={styles.footerInfo}>
                <View style={styles.footerItem}>
                  <Ionicons name="time-outline" size={16} color="#999" />
                  <ThemedText style={styles.footerText}>
                    {formatDuration(duration)}
                  </ThemedText>
                </View>
                <View style={styles.footerItem}>
                  <Ionicons name="calendar-outline" size={16} color="#999" />
                  <ThemedText style={styles.footerText}>
                    {new Date(video.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </ThemedText>
                </View>
                {video.coachName && (
                  <View style={styles.footerItem}>
                    <Ionicons name="person-outline" size={16} color="#999" />
                    <ThemedText style={styles.footerText}>
                      {video.coachName}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

/**
 * Empty state component for when no videos are available
 */
interface VideoEmptyStateProps {
  message?: string;
}

export function VideoEmptyState({ message = 'No videos available' }: VideoEmptyStateProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SurfaceCard style={styles.emptyState}>
      <Ionicons name="videocam-outline" size={40} color={palette.muted} />
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
        {message}
      </ThemedText>
    </SurfaceCard>
  );
}

/**
 * Component for unavailable/broken video references
 */
interface VideoUnavailableProps {
  title?: string;
  onRemove?: () => void;
}

export function VideoUnavailable({ title = 'Video', onRemove }: VideoUnavailableProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SurfaceCard style={styles.unavailableCard}>
      <View style={styles.unavailableContent}>
        <View style={[styles.unavailableIcon, { backgroundColor: `${palette.error}15` }]}>
          <Ionicons name="alert-circle" size={20} color={palette.error} />
        </View>
        <View style={styles.unavailableInfo}>
          <ThemedText style={styles.unavailableTitle} numberOfLines={1}>
            {title}
          </ThemedText>
          <ThemedText style={[styles.unavailableMessage, { color: palette.muted }]}>
            Video unavailable
          </ThemedText>
        </View>
      </View>
      {onRemove && (
        <Clickable onPress={onRemove} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={palette.error} />
        </Clickable>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    padding: 0,
  },
  cardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
  },
  thumbnailCompact: {
    width: 100,
    aspectRatio: 16 / 9,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  sharedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    padding: Spacing.md,
    gap: 4,
  },
  infoContainerCompact: {
    flex: 1,
    paddingVertical: Spacing.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  titleCompact: {
    fontSize: 13,
  },
  errorText: {
    fontSize: 12,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl + 20,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  modalHeaderTitle: {
    flex: 1,
    marginHorizontal: Spacing.md,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSubtitle: {
    color: '#999',
    fontSize: 13,
    marginTop: 2,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    color: '#fff',
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  errorMessage: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  errorHint: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  modalFooter: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl + 20,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  footerInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    color: '#999',
    fontSize: 13,
  },
  // Empty state styles
  emptyState: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Unavailable video styles
  unavailableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  unavailableContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  unavailableIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unavailableInfo: {
    flex: 1,
    gap: 2,
  },
  unavailableTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  unavailableMessage: {
    fontSize: 12,
  },
});
