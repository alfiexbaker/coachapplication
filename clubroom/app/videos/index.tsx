import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { EmptyState } from '@/components/ui/empty-state';

import { VideoCard } from '@/components/video/video-card';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useVideosList } from '@/hooks/use-videos-list';

export default function VideosScreen() {
  const { colors } = useTheme();
  const { videos, stats, isCoach, navigateToVideo, navigateToUpload } = useVideosList();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Row align="center" gap="md" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <View style={styles.headerTitle}>
          <ThemedText type="title">Session Videos</ThemedText>
        </View>
        {isCoach && (
          <Clickable onPress={navigateToUpload} style={[styles.uploadButton, { backgroundColor: colors.tint }]}>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.onPrimary} />
          </Clickable>
        )}
      </Row>

      {isCoach && videos.length > 0 && (
        <Row gap="sm" style={styles.statsRow}>
          <StatCard label="Videos" value={stats.totalVideos} colors={colors} />
          <StatCard label="Views" value={stats.totalViews} colors={colors} />
          <StatCard label="Shared" value={stats.sharedCount} colors={colors} />
        </Row>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {videos.length === 0 ? (
          <EmptyState icon="videocam-outline" title="No videos yet" message={isCoach ? 'Upload session videos to share progress with parents' : 'Videos shared by your coach will appear here'} />
        ) : (
          <View style={styles.list}>
            {videos.map((video, index) => (
              <VideoCard key={video.id} video={video} index={index} onPress={() => navigateToVideo(video.id)} colors={colors} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, colors }: { label: string; value: number; colors: ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors'] }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
      <ThemedText type="heading" style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={[styles.statLabel, { color: colors.muted }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerTitle: { flex: 1 },
  uploadButton: { width: 36, height: 36, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  statsRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: Radii.md },
  statValue: { ...Typography.title },
  statLabel: { ...Typography.caption },
  content: { padding: Spacing.lg, paddingTop: 0 },
  list: { gap: Spacing.md },
});
