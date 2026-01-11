import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  Modal,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Video, ResizeMode } from 'expo-av';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { videoService, type LocalVideo } from '@/services/video-service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_COLUMNS = 2;
const GRID_GAP = Spacing.sm;
const ITEM_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

interface MediaGalleryProps {
  videos: LocalVideo[];
  onRefresh?: () => void;
  refreshing?: boolean;
  showAthleteFilter?: boolean;
  athletes?: { id: string; name: string }[];
  onDelete?: (videoId: string) => void;
  onShare?: (video: LocalVideo) => void;
  emptyMessage?: string;
  isCoach?: boolean;
}

type MediaItem = LocalVideo & { type: 'video' | 'image' };

export function MediaGallery({
  videos,
  onRefresh,
  refreshing = false,
  showAthleteFilter = false,
  athletes = [],
  onDelete,
  onShare,
  emptyMessage = 'No media uploaded yet',
  isCoach = false,
}: MediaGalleryProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [selectedVideo, setSelectedVideo] = useState<LocalVideo | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Filter videos by athlete if filter is set
  const filteredVideos = selectedFilter
    ? videos.filter(
        (v) => v.athleteId === selectedFilter || v.athleteIds.includes(selectedFilter)
      )
    : videos;

  const handleVideoPress = useCallback((video: LocalVideo) => {
    setSelectedVideo(video);
    setIsPlaying(false);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedVideo(null);
    setIsPlaying(false);
  }, []);

  const handleDelete = useCallback(
    (video: LocalVideo) => {
      Alert.alert(
        'Delete Video',
        `Are you sure you want to delete "${video.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await videoService.deleteLocalVideo(video.id);
              onDelete?.(video.id);
              handleCloseModal();
            },
          },
        ]
      );
    },
    [onDelete, handleCloseModal]
  );

  const handleShare = useCallback(
    (video: LocalVideo) => {
      onShare?.(video);
    },
    [onShare]
  );

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderItem = ({ item, index }: { item: LocalVideo; index: number }) => {
    const isVideo = item.localUri.includes('.mp4') || item.localUri.includes('.mov') || !item.localUri.includes('.');

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
        <Clickable onPress={() => handleVideoPress(item)}>
          <View style={[styles.gridItem, { backgroundColor: palette.surface }]}>
            <View style={styles.thumbnailContainer}>
              <Image
                source={{ uri: item.thumbnail || item.localUri }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
              {isVideo && (
                <>
                  <View style={styles.playOverlay}>
                    <Ionicons name="play-circle" size={36} color="#fff" />
                  </View>
                  {item.duration && (
                    <View style={styles.durationBadge}>
                      <ThemedText style={styles.durationText}>
                        {formatDuration(item.duration)}
                      </ThemedText>
                    </View>
                  )}
                </>
              )}
              {item.visibility === 'SHARED' && (
                <View style={[styles.sharedBadge, { backgroundColor: palette.tint }]}>
                  <Ionicons name="people" size={10} color="#fff" />
                </View>
              )}
            </View>
            <View style={styles.itemInfo}>
              <ThemedText numberOfLines={1} style={styles.itemTitle}>
                {item.title}
              </ThemedText>
              {item.athleteNames.length > 0 && (
                <ThemedText
                  numberOfLines={1}
                  style={[styles.itemAthlete, { color: palette.muted }]}
                >
                  {item.athleteNames.join(', ')}
                </ThemedText>
              )}
            </View>
          </View>
        </Clickable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Athlete Filter */}
      {showAthleteFilter && athletes.length > 0 && (
        <View style={styles.filterRow}>
          <Clickable
            onPress={() => setSelectedFilter(null)}
            style={[
              styles.filterChip,
              {
                backgroundColor: !selectedFilter ? palette.tint : palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.filterChipText,
                { color: !selectedFilter ? '#fff' : palette.foreground },
              ]}
            >
              All
            </ThemedText>
          </Clickable>
          {athletes.map((athlete) => (
            <Clickable
              key={athlete.id}
              onPress={() => setSelectedFilter(athlete.id)}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    selectedFilter === athlete.id ? palette.tint : palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.filterChipText,
                  { color: selectedFilter === athlete.id ? '#fff' : palette.foreground },
                ]}
              >
                {athlete.name.split(' ')[0]}
              </ThemedText>
            </Clickable>
          ))}
        </View>
      )}

      {/* Grid */}
      {filteredVideos.length === 0 ? (
        <EmptyState
          icon="videocam-outline"
          title="No Videos"
          message={emptyMessage}
        />
      ) : (
        <FlatList
          data={filteredVideos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={GRID_COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            ) : undefined
          }
        />
      )}

      {/* Full Screen Modal */}
      <Modal
        visible={!!selectedVideo}
        animationType="fade"
        transparent
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalContainer}>
          <Animated.View entering={FadeIn} style={styles.modalContent}>
            {/* Header */}
            <View style={[styles.modalHeader, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
              <Clickable onPress={handleCloseModal} hitSlop={12}>
                <Ionicons name="close" size={28} color="#fff" />
              </Clickable>
              <View style={styles.modalHeaderTitle}>
                <ThemedText style={styles.modalTitle} numberOfLines={1}>
                  {selectedVideo?.title}
                </ThemedText>
                <ThemedText style={styles.modalSubtitle}>
                  {selectedVideo?.athleteNames.join(', ')}
                </ThemedText>
              </View>
              <View style={styles.modalActions}>
                {isCoach && onShare && selectedVideo?.visibility === 'PRIVATE' && (
                  <Clickable
                    onPress={() => selectedVideo && handleShare(selectedVideo)}
                    hitSlop={8}
                  >
                    <Ionicons name="share-outline" size={24} color="#fff" />
                  </Clickable>
                )}
                {isCoach && onDelete && (
                  <Clickable
                    onPress={() => selectedVideo && handleDelete(selectedVideo)}
                    hitSlop={8}
                    style={{ marginLeft: Spacing.md }}
                  >
                    <Ionicons name="trash-outline" size={24} color="#ff6b6b" />
                  </Clickable>
                )}
              </View>
            </View>

            {/* Video/Image Display */}
            <View style={styles.mediaContainer}>
              {selectedVideo && (
                <Video
                  source={{ uri: selectedVideo.localUri }}
                  style={styles.fullVideo}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping={false}
                  shouldPlay={isPlaying}
                  onPlaybackStatusUpdate={(status) => {
                    if (status.isLoaded) {
                      setIsPlaying(status.isPlaying);
                    }
                  }}
                />
              )}
            </View>

            {/* Footer Info */}
            <View style={[styles.modalFooter, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
              <View style={styles.footerInfo}>
                <View style={styles.footerItem}>
                  <Ionicons name="time-outline" size={16} color="#999" />
                  <ThemedText style={styles.footerText}>
                    {formatDuration(selectedVideo?.duration)}
                  </ThemedText>
                </View>
                <View style={styles.footerItem}>
                  <Ionicons name="calendar-outline" size={16} color="#999" />
                  <ThemedText style={styles.footerText}>
                    {selectedVideo?.createdAt
                      ? new Date(selectedVideo.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : ''}
                  </ThemedText>
                </View>
                {selectedVideo?.sessionId && (
                  <View style={styles.footerItem}>
                    <Ionicons name="football-outline" size={16} color="#999" />
                    <ThemedText style={styles.footerText}>Session Video</ThemedText>
                  </View>
                )}
              </View>
              {selectedVideo?.visibility === 'SHARED' && (
                <View style={[styles.sharedIndicator, { backgroundColor: palette.tint }]}>
                  <Ionicons name="people" size={12} color="#fff" />
                  <ThemedText style={styles.sharedIndicatorText}>
                    Shared with parents
                  </ThemedText>
                </View>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  row: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  gridItem: {
    width: ITEM_WIDTH,
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 16 / 9,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
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
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    padding: Spacing.sm,
    gap: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  itemAthlete: {
    fontSize: 11,
  },
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
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
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
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mediaContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  fullVideo: {
    width: '100%',
    height: '100%',
  },
  modalFooter: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
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
  sharedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  sharedIndicatorText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});

export default MediaGallery;
