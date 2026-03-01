import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Clickable } from '@/components/primitives/clickable';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ReportProblem');

type ProblemCategory = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

const problemCategories: ProblemCategory[] = [
  { id: 'coach-late', icon: 'time-outline', label: 'Coach was late' },
  { id: 'coach-noshow', icon: 'close-circle-outline', label: "Coach didn't show up" },
  { id: 'location-issue', icon: 'location-outline', label: 'Location problem' },
  { id: 'quality', icon: 'star-outline', label: 'Session quality' },
  { id: 'safety', icon: 'shield-outline', label: 'Safety concern' },
  { id: 'other', icon: 'ellipsis-horizontal-outline', label: 'Other issue' },
];

export default function ReportProblemScreen() {
  const { colors: palette } = useTheme();
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCategory || !description.trim()) {
      Alert.alert('Missing Information', 'Please select a category and provide a description');
      return;
    }

    if (description.trim().length < 10) {
      Alert.alert('Description Too Short', 'Please provide more details about the issue');
      return;
    }

    setSubmitting(true);
    try {
      // Save report to storage
      const reports = await apiClient.get<Record<string, unknown>[]>(
        STORAGE_KEYS.PROBLEM_REPORTS,
        [],
      );

      const newReport = {
        id: `report_${Date.now()}`,
        bookingId: bookingId || 'unknown',
        category: selectedCategory,
        description: description.trim(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      reports.push(newReport);
      await apiClient.set(STORAGE_KEYS.PROBLEM_REPORTS, reports);

      logger.info('Report submitted', { category: selectedCategory, bookingId });

      Alert.alert(
        'Report Submitted',
        'Thank you for your feedback. We will review your report within 24 hours.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (error) {
      logger.error('Failed to submit report', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['bottom']}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle" style={styles.subtitle}>
            Help us improve by reporting any issues with your session
          </ThemedText>
        </ThemedView>

        {/* Category Selection */}
        <View style={styles.section}>
          <ThemedText style={styles.label}>What went wrong?</ThemedText>
          <Row style={styles.categoriesGrid}>
            {problemCategories.map((category) => {
              const isSelected = selectedCategory === category.id;
              return (
                <Clickable
                  key={category.id}
                  onPress={() => setSelectedCategory(category.id)}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}
                >
                  <SurfaceCard
                    style={[
                      styles.categoryCard,
                      isSelected && {
                        borderColor: palette.tint,
                        borderWidth: 2,
                        backgroundColor: withAlpha(palette.tint, 0.06),
                      },
                    ]}
                  >
                    <Ionicons
                      name={category.icon}
                      size={28}
                      color={isSelected ? palette.tint : palette.foreground}
                    />
                    <ThemedText
                      style={[
                        styles.categoryLabel,
                        isSelected && { color: palette.tint, fontWeight: '600' },
                      ]}
                    >
                      {category.label}
                    </ThemedText>
                  </SurfaceCard>
                </Clickable>
              );
            })}
          </Row>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <ThemedText style={styles.label}>Please describe the issue</ThemedText>
          <SurfaceCard style={styles.inputCard}>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Tell us what happened..."
              placeholderTextColor={palette.muted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={[styles.textArea, { color: palette.foreground }]}
              maxLength={500}
            />
          </SurfaceCard>
          <ThemedText style={styles.helper}>{description.length} / 500 characters</ThemedText>
        </View>

        {/* Info Box */}
        <SurfaceCard style={[styles.infoBox, { backgroundColor: palette.border }]}>
          <Row align="start" gap="sm">
            <Ionicons name="information-circle" size={20} color={palette.foreground} />
            <ThemedText style={styles.infoText}>
              Reports are reviewed within 24 hours. Serious issues will be addressed immediately.
            </ThemedText>
          </Row>
        </SurfaceCard>
      </ScrollView>

      {/* Submit Button */}
      <View
        style={[
          styles.footer,
          { backgroundColor: palette.background, borderTopColor: palette.border },
        ]}
      >
        <Clickable
          onPress={handleSubmit}
          disabled={!selectedCategory || !description.trim() || submitting}
          accessibilityLabel="Submit problem report"
          style={({ pressed }) => [
            styles.submitButton,
            { backgroundColor: palette.tint },
            (!selectedCategory || !description.trim() || submitting) && { opacity: 0.5 },
            pressed && { opacity: 0.8 },
          ]}
        >
          <ThemedText style={[styles.submitText, { color: palette.onPrimary }]}>
            {submitting ? 'Submitting...' : 'Submit Report'}
          </ThemedText>
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  header: {
    gap: Spacing.xs,
  },
  subtitle: {
    ...Typography.bodySmall,
    opacity: 0.6,
  },
  section: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.bodySemiBold,
    paddingLeft: Spacing.xs,
  },
  categoriesGrid: {
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  categoryCard: {
    width: '100%',
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    minWidth: 110,
  },
  categoryLabel: {
    ...Typography.caption,
    textAlign: 'center',
  },
  inputCard: {
    padding: Spacing.md,
  },
  textArea: {
    minHeight: 120,
    ...Typography.body,
  },
  helper: {
    ...Typography.caption,
    opacity: 0.6,
    paddingLeft: Spacing.xs,
  },
  infoBox: {
    padding: Spacing.md,
  },
  infoText: {
    flex: 1,
    ...Typography.small,
    opacity: 0.8,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  submitButton: {
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  submitText: {
    ...Typography.subheading,
  },
});
