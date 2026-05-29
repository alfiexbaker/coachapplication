import { View, StyleSheet, ScrollView, TextInput } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { VideoUpload } from '@/components/video/video-upload';
import { formatDuration, formatFileSize } from '@/components/video/video-upload-helpers';
import { SubmitProgressState } from '@/components/ui/screen-states';
import { StatusBanner } from '@/components/ui/primitives/StatusBanner';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { useVideoUpload } from '@/hooks/use-video-upload';
import { ok } from '@/types/result';

export default function VideoUploadScreen() {
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    videoData,
    title,
    description,
    uploadStage,
    uploadStatusMessage,
    isUploading,
    canSubmit,
    setTitle,
    setDescription,
    clearSelectedVideo,
    handleVideoSelected,
    handleSubmit,
  } = useVideoUpload();

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Row
        justify="space-between"
        align="center"
        style={[styles.header, { borderBottomColor: colors.border }]}
      >
        <Clickable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Clickable>
        <ThemedText type="subtitle">Upload Video</ThemedText>
        <Clickable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[
            styles.submitButton,
            { backgroundColor: canSubmit ? colors.tint : colors.border },
          ]}
        >
          <ThemedText
            style={[styles.submitText, { color: canSubmit ? colors.onPrimary : colors.muted }]}
          >
            {isUploading ? 'Uploading' : 'Upload'}
          </ThemedText>
        </Clickable>
      </Row>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {uploadStatusMessage ? (
          <StatusBanner
            variant={uploadStage === 'failed' ? 'error' : 'info'}
            message={uploadStatusMessage}
          />
        ) : null}

        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Select Video
          </ThemedText>
          <VideoUpload
            onSelect={handleVideoSelected}
            disabled={isUploading}
            maxDurationSeconds={600}
            maxFileSizeMB={500}
          />
          {videoData ? (
            <StatusBanner
              variant="success"
              icon="checkmark-circle"
              message={`${videoData.name} selected (${formatDuration(videoData.duration)}, ${formatFileSize(videoData.fileSize)}). It stays private on this device until upload completes.`}
              action={
                !isUploading
                  ? {
                      label: 'Remove',
                      onPress: clearSelectedVideo,
                      accessibilityLabel: 'Remove selected video',
                    }
                  : undefined
              }
            />
          ) : null}
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Video Details
          </ThemedText>
          <View style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Title *</ThemedText>
            <TextInput
              value={title}
              onChangeText={setTitle}
              editable={!isUploading}
              placeholder="e.g., Dribbling Session — Week 4"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                { borderColor: colors.border, backgroundColor: colors.card, color: colors.text },
              ]}
              maxLength={100}
            />
          </View>
          <View style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Description</ThemedText>
            <TextInput
              value={description}
              onChangeText={setDescription}
              editable={!isUploading}
              placeholder="Add notes about what's covered in this video..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[
                styles.input,
                styles.textArea,
                { borderColor: colors.border, backgroundColor: colors.card, color: colors.text },
              ]}
              maxLength={500}
            />
          </View>
          {isUploading ? (
            <SubmitProgressState label={uploadStatusMessage ?? 'Uploading video...'} />
          ) : null}
          <ThemedText style={[styles.helperText, { color: colors.muted }]}>
            Uploads start private. Share from the video detail screen after processing.
          </ThemedText>
        </SurfaceCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  backButton: { padding: Spacing.xs },
  submitButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  submitText: { fontWeight: '600' },
  content: { padding: Spacing.lg, gap: Spacing.md },
  section: { gap: Spacing.md },
  sectionTitle: { marginBottom: Spacing.xs },
  fieldGroup: { gap: Spacing.xs },
  label: { fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.subheading,
  },
  textArea: { minHeight: 100, paddingTop: Spacing.sm },
  helperText: { ...Typography.small },
});
