import { View, StyleSheet, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { VideoUpload } from '@/components/video/video-upload';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { useVideoUpload, VISIBILITY_OPTIONS } from '@/hooks/use-video-upload';
import { ok } from '@/types/result';

export default function VideoUploadScreen() {
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    videoData, title, description, visibility, uploading, uploadProgress, canSubmit,
    setTitle, setDescription, setVisibility,
    handleVideoSelected, handleUploadProgress, handleSubmit,
  } = useVideoUpload();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <Row justify="space-between" align="center" style={[styles.header, { borderBottomColor: colors.border }]}>
        <Clickable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Clickable>
        <ThemedText type="subtitle">Upload Video</ThemedText>
        <Clickable onPress={handleSubmit} disabled={!canSubmit} style={[styles.submitButton, { backgroundColor: canSubmit ? colors.tint : colors.border }]}>
          <ThemedText style={[styles.submitText, { color: canSubmit ? colors.onPrimary : colors.muted }]}>{uploading ? 'Uploading...' : 'Upload'}</ThemedText>
        </Clickable>
      </Row>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Select Video</ThemedText>
          <VideoUpload onUpload={handleVideoSelected} onProgress={handleUploadProgress} maxDurationSeconds={600} maxFileSizeMB={500} />
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Video Details</ThemedText>
          <View style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Title *</ThemedText>
            <TextInput value={title} onChangeText={setTitle} placeholder="e.g., Tom's Dribbling Session - Week 4" placeholderTextColor={colors.muted} style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card }]} />
          </View>
          <View style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Description</ThemedText>
            <TextInput value={description} onChangeText={setDescription} placeholder="Add notes about what's covered in this video..." placeholderTextColor={colors.muted} multiline numberOfLines={4} textAlignVertical="top" style={[styles.input, styles.textArea, { borderColor: colors.border, backgroundColor: colors.card }]} />
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>Visibility</ThemedText>
          <View style={styles.visibilityOptions}>
            {VISIBILITY_OPTIONS.map((option) => {
              const isSelected = visibility === option.value;
              return (
                <Clickable key={option.value} onPress={() => setVisibility(option.value)} style={[styles.visibilityOption, { borderColor: isSelected ? colors.tint : colors.border, backgroundColor: isSelected ? withAlpha(colors.tint, 0.09) : colors.card }]}>
                  <Row align="center" gap="sm">
                    <Ionicons name={option.icon as keyof typeof Ionicons.glyphMap} size={20} color={isSelected ? colors.tint : colors.muted} />
                    <ThemedText style={[styles.visibilityLabel, { color: isSelected ? colors.tint : colors.foreground }]}>{option.label}</ThemedText>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.tint} />}
                  </Row>
                  <ThemedText style={[styles.visibilityDescription, { color: colors.muted }]}>{option.description}</ThemedText>
                </Clickable>
              );
            })}
          </View>
        </SurfaceCard>

        {uploading && (
          <SurfaceCard style={styles.section}>
            <ThemedText style={styles.progressText}>Uploading... {Math.round(uploadProgress * 100)}%</ThemedText>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { backgroundColor: colors.tint, width: `${uploadProgress * 100}%` }]} />
            </View>
          </SurfaceCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  backButton: { padding: Spacing.xs },
  submitButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md },
  submitText: { fontWeight: '600' },
  content: { padding: Spacing.lg, gap: Spacing.md },
  section: { gap: Spacing.md },
  sectionTitle: { marginBottom: Spacing.xs },
  fieldGroup: { gap: Spacing.xs },
  label: { fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, ...Typography.subheading },
  textArea: { minHeight: 100, paddingTop: Spacing.sm },
  visibilityOptions: { gap: Spacing.sm },
  visibilityOption: { padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1, gap: Spacing.xs },
  visibilityLabel: { fontWeight: '600', flex: 1 },
  visibilityDescription: { ...Typography.small, marginLeft: 28 },
  progressText: { textAlign: 'center', fontWeight: '600' },
  progressBar: { height: 8, borderRadius: Radii.xs, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radii.xs },
});
