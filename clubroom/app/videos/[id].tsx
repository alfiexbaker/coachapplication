import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { VideoPlayer, AnnotationTimeline } from '@/components/video/video-player';
import { AddAnnotationModal, QuickAnnotationBar } from '@/components/video/video-annotation';
import { VideoInfoSection } from '@/components/video/video-info-section';
import { VideoDetailActions } from '@/components/video/video-detail-actions';
import { VideoDetailsCard } from '@/components/video/video-details-card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useVideoDetail } from '@/hooks/use-video-detail';

export default function VideoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const {
    video, loading, currentTime, showAnnotationModal, isOwner,
    handleTimeUpdate, handleSeekToAnnotation, handleQuickAnnotation,
    handleSaveAnnotation, handleShare, handleToggleVisibility,
    handleDelete, dismissAnnotationModal, setCurrentTime,
  } = useVideoDetail(id);

  if (loading || !video) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Clickable>
          <ThemedText type="title">Loading...</ThemedText>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <View style={{ flex: 1 }} />
        <Clickable accessibilityLabel="Share video" onPress={handleShare} hitSlop={8}>
          <Ionicons name="share-outline" size={22} color={colors.text} />
        </Clickable>
        {isOwner && (
          <Clickable accessibilityLabel="Delete video" onPress={handleDelete} hitSlop={8} style={{ marginLeft: Spacing.md }}>
            <Ionicons name="trash-outline" size={22} color={colors.error} />
          </Clickable>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.springify()}>
          <VideoPlayer
            videoUrl={video.videoUrl}
            thumbnailUrl={video.thumbnailUrl}
            duration={video.duration}
            annotations={video.annotations}
            onAnnotationPress={handleSeekToAnnotation}
            onTimeUpdate={handleTimeUpdate}
          />
        </Animated.View>

        {isOwner && (
          <Animated.View entering={FadeInDown.delay(50).springify()}>
            <QuickAnnotationBar onAdd={handleQuickAnnotation} />
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <VideoInfoSection video={video} colors={colors} />
        </Animated.View>

        {isOwner && (
          <Animated.View entering={FadeInDown.delay(150).springify()}>
            <VideoDetailActions
              colors={colors}
              visibility={video.visibility}
              onAddAnnotation={() => { dismissAnnotationModal(); handleQuickAnnotation('HIGHLIGHT' as never); }}
              onToggleVisibility={handleToggleVisibility}
            />
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <SurfaceCard style={styles.annotationsCard}>
            <AnnotationTimeline
              annotations={video.annotations}
              currentTime={currentTime}
              duration={video.duration}
              onSeek={(timestamp) => setCurrentTime(timestamp)}
            />
          </SurfaceCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <VideoDetailsCard
            colors={colors}
            coachName={video.coachName}
            createdAt={video.createdAt}
            fileSize={video.fileSize}
            sessionId={video.sessionId}
          />
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <AddAnnotationModal
        visible={showAnnotationModal}
        onClose={dismissAnnotationModal}
        onSave={handleSaveAnnotation}
        currentTime={currentTime}
        duration={video.duration}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
  },
  annotationsCard: {
    padding: Spacing.md,
  },
  bottomSpacer: {
    height: 40,
  },
});
