import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { VideoPlayer, AnnotationTimeline } from '@/components/video/video-player';
import { AddAnnotationModal, QuickAnnotationBar } from '@/components/video/video-annotation';
import { VideoInfoSection } from '@/components/video/video-info-section';
import { VideoDetailActions } from '@/components/video/video-detail-actions';
import { VideoDetailsCard } from '@/components/video/video-details-card';
import { LoadingState } from '@/components/ui/screen-states';
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
        <Row align="center" gap="md" style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Clickable>
          <ThemedText type="title">Video</ThemedText>
          <View style={{ width: 24 }} />
        </Row>
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Row align="center" gap="md" style={styles.header}>
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
      </Row>

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
            coachName={video.coachId}
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
