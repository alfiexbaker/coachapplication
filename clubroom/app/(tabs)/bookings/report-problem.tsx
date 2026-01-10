import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ProblemCategory = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

const problemCategories: ProblemCategory[] = [
  { id: 'coach-late', icon: 'time-outline', label: 'Coach was late' },
  { id: 'coach-noshow', icon: 'close-circle-outline', label: 'Coach didn\'t show up' },
  { id: 'location-issue', icon: 'location-outline', label: 'Location problem' },
  { id: 'quality', icon: 'star-outline', label: 'Session quality' },
  { id: 'safety', icon: 'shield-outline', label: 'Safety concern' },
  { id: 'other', icon: 'ellipsis-horizontal-outline', label: 'Other issue' },
];

export default function ReportProblemScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!selectedCategory || !description.trim()) {
      alert('Please select a category and provide a description');
      return;
    }

    // TODO: Submit report to backend
    alert('Report submitted');
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['bottom']}>
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
          <View style={styles.categoriesGrid}>
            {problemCategories.map((category) => {
              const isSelected = selectedCategory === category.id;
              return (
                <Pressable
                  key={category.id}
                  onPress={() => setSelectedCategory(category.id)}
                  style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                  <SurfaceCard
                    style={[
                      styles.categoryCard,
                      isSelected && {
                        borderColor: palette.tint,
                        borderWidth: 2,
                        backgroundColor: palette.tint + '10',
                      },
                    ]}>
                    <Ionicons
                      name={category.icon}
                      size={28}
                      color={isSelected ? palette.tint : palette.foreground}
                    />
                    <ThemedText
                      style={[styles.categoryLabel, isSelected && { color: palette.tint, fontWeight: '600' }]}>
                      {category.label}
                    </ThemedText>
                  </SurfaceCard>
                </Pressable>
              );
            })}
          </View>
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
            />
          </SurfaceCard>
          <ThemedText style={styles.helper}>{description.length} / 500 characters</ThemedText>
        </View>

        {/* Info Box */}
        <SurfaceCard style={[styles.infoBox, { backgroundColor: palette.border }]}>
          <Ionicons name="information-circle" size={20} color={palette.foreground} />
          <ThemedText style={styles.infoText}>
            Reports are reviewed within 24 hours. Serious issues will be addressed immediately.
          </ThemedText>
        </SurfaceCard>
      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.footer, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
        <Pressable
          onPress={handleSubmit}
          disabled={!selectedCategory || !description.trim()}
          style={({ pressed }) => [
            styles.submitButton,
            { backgroundColor: palette.tint },
            (!selectedCategory || !description.trim()) && { opacity: 0.5 },
            pressed && { opacity: 0.8 },
          ]}>
          <ThemedText style={styles.submitText} lightColor="#FFFFFF" darkColor="#000000">
            Submit Report
          </ThemedText>
        </Pressable>
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
    fontSize: 14,
    opacity: 0.6,
  },
  section: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    paddingLeft: Spacing.xs,
  },
  categoriesGrid: {
    flexDirection: 'row',
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
    fontSize: 12,
    textAlign: 'center',
  },
  inputCard: {
    padding: Spacing.md,
  },
  textArea: {
    minHeight: 120,
    fontSize: 15,
  },
  helper: {
    fontSize: 12,
    opacity: 0.6,
    paddingLeft: Spacing.xs,
  },
  infoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
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
    fontSize: 16,
    fontWeight: '700',
  },
});
