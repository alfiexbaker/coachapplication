import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { ReactNode } from 'react';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { VideoPlayer, AnnotationTimeline } from '@/components/video/video-player';
import { AddAnnotationModal, QuickAnnotationBar } from '@/components/video/video-annotation';
import { VideoInfoSection } from '@/components/video/video-info-section';
import { VideoDetailActions } from '@/components/video/video-detail-actions';
import { VideoDetailsCard } from '@/components/video/video-details-card';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { useVideoDetail } from '@/hooks/use-video-detail';
import { Routes } from '@/navigation/routes';
import { ok } from '@/types/result';
import { useRequiredParam } from '@/hooks/use-required-param';

export default function VideoDetailScreen() {
  const idParam = useRequiredParam('id');
  const id = idParam.valid ? idParam.value : '';
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    video,
    loading,
    status,
    error,
    retry,
    currentTime,
    showAnnotationModal,
    isOwner,
    handleTimeUpdate,
    handleSeekToAnnotation,
    handleQuickAnnotation,
    handleSaveAnnotation,
    handleShare,
    handleToggleVisibility,
    handleDelete,
    dismissAnnotationModal,
    setCurrentTime,
  } = useVideoDetail(id);
  const stateHeader = (
    <PageHeader
      title="Video"
      showBack
      backIcon="arrow-back"
      onBackPress={() => router.back()}
      centerTitle
      containerStyle={styles.header}
    />
  );
  const detailHeader = (
    <PageHeader
      title="Video"
      showBack
      backIcon="arrow-back"
      onBackPress={() => router.back()}
      centerTitle
      containerStyle={styles.header}
      right={
        <Row align="center" gap="md">
          <Clickable accessibilityLabel="Share video" onPress={handleShare} hitSlop={8}>
            <Ionicons name="share-outline" size={22} color={colors.text} />
          </Clickable>
          {isOwner ? (
            <Clickable accessibilityLabel="Delete video" onPress={handleDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </Clickable>
          ) : null}
        </Row>
      }
    />
  );
  const renderShell = ({
    header,
    content,
  }: {
    header?: ReactNode;
    content: ReactNode;
  }) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {header}
      {content}
    </SafeAreaView>
  );

  if (!idParam.valid) {
    return renderShell({
      header: stateHeader,
      content: <ErrorState message="Invalid video link." onRetry={() => router.back()} />,
    });
  }

  if (loading) {
    return renderShell({
      header: stateHeader,
      content: <LoadingState variant="hero" />,
    });
  }

  if (status === 'error') {
    return renderShell({
      header: stateHeader,
      content: <ErrorState message={error?.message ?? 'Failed to load video.'} onRetry={retry} />,
    });
  }

  if (status === 'empty' || !video) {
    return renderShell({
      header: stateHeader,
      content: (
        <EmptyState
          icon="videocam-outline"
          title="Video not found"
          message="This video is unavailable."
        />
      ),
    });
  }

  return renderShell({
    header: detailHeader,
    content: (
      <>
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
                canToggleVisibility={video.athleteIds.length > 0}
                onAddAnnotation={() => {
                  dismissAnnotationModal();
                  handleQuickAnnotation('HIGHLIGHT' as never);
                }}
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
              onViewSession={(sessionId) => router.push(Routes.developmentSession(sessionId))}
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
      </>
    ),
  });
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
