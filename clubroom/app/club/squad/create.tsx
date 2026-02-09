import { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api-client';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/ui/toast';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import type { ClubSquad } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CreateSquad');

const LEVEL_OPTIONS = [
  { value: 'Development', label: 'Development', description: 'Beginner to intermediate' },
  { value: 'Competitive', label: 'Competitive', description: 'Match-ready players' },
  { value: 'Elite', label: 'Elite', description: 'High-performance pathway' },
  { value: 'Staff', label: 'Staff Only', description: 'Coaches and admins' },
];

const AGE_GROUP_OPTIONS = [
  { value: 'U8', label: 'U8', ageMin: 5, ageMax: 8 },
  { value: 'U10', label: 'U10', ageMin: 8, ageMax: 10 },
  { value: 'U12', label: 'U12', ageMin: 10, ageMax: 12 },
  { value: 'U14', label: 'U14', ageMin: 12, ageMax: 14 },
  { value: 'U16', label: 'U16', ageMin: 14, ageMax: 16 },
  { value: 'U18', label: 'U18', ageMin: 16, ageMax: 18 },
  { value: 'Adults', label: 'Adults', ageMin: 18, ageMax: 99 },
  { value: 'Mixed', label: 'Mixed Ages', ageMin: undefined, ageMax: undefined },
];

export default function CreateSquadScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('Development');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('');
  const [meetLocation, setMeetLocation] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = name.trim().length >= 2 && selectedLevel && selectedAgeGroup;

  const handleCreate = async () => {
    if (!isValid || !currentUser || !clubId) return;

    setIsSubmitting(true);
    logger.action('CreateSquad', { name, level: selectedLevel, ageGroup: selectedAgeGroup });

    try {
      const ageGroup = AGE_GROUP_OPTIONS.find(a => a.value === selectedAgeGroup);
      const squadId = `squad_${Date.now()}`;

      const newSquad: ClubSquad = {
        id: squadId,
        clubId,
        name: name.trim(),
        level: `${selectedAgeGroup} · ${selectedLevel}`,
        memberCount: 0,
        primaryCoach: currentUser.fullName || currentUser.username || 'Coach',
        meetLocation: meetLocation.trim() || 'TBC',
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        ageMin: ageGroup?.ageMin,
        ageMax: ageGroup?.ageMax,
      };

      // Store squad
      const squads = await apiClient.get<ClubSquad[]>('club_squads', []);
      squads.push(newSquad);
      await apiClient.set('club_squads', squads);

      logger.success('SquadCreated', { squadId, name: newSquad.name });
      showToast('Squad created!', 'success');

      router.back();
    } catch (error) {
      logger.error('CreateSquadFailed', error);
      showToast('Failed to create squad', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>Create Squad</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Squad Name */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
              Squad Name *
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
              ]}
              placeholder="e.g., U15 Performance"
              placeholderTextColor={palette.muted}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Age Group */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
              Age Group *
            </ThemedText>
            <View style={styles.optionsGrid}>
              {AGE_GROUP_OPTIONS.map((option) => (
                <Clickable
                  key={option.value}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: selectedAgeGroup === option.value
                        ? palette.tint
                        : palette.surface,
                      borderColor: selectedAgeGroup === option.value
                        ? palette.tint
                        : palette.border,
                    },
                  ]}
                  onPress={() => setSelectedAgeGroup(option.value)}
                >
                  <ThemedText
                    style={[
                      styles.optionText,
                      { color: selectedAgeGroup === option.value ? palette.onPrimary : palette.text },
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                </Clickable>
              ))}
            </View>
          </View>

          {/* Level */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
              Level *
            </ThemedText>
            <View style={styles.levelOptions}>
              {LEVEL_OPTIONS.map((option) => (
                <Clickable
                  key={option.value}
                  style={[
                    styles.levelOption,
                    {
                      borderColor: selectedLevel === option.value
                        ? palette.tint
                        : palette.border,
                      backgroundColor: selectedLevel === option.value
                        ? withAlpha(palette.tint, 0.06)
                        : 'transparent',
                    },
                  ]}
                  onPress={() => setSelectedLevel(option.value)}
                >
                  <View style={styles.levelHeader}>
                    <View
                      style={[
                        styles.radio,
                        { borderColor: selectedLevel === option.value ? palette.tint : palette.border },
                      ]}
                    >
                      {selectedLevel === option.value && (
                        <View style={[styles.radioInner, { backgroundColor: palette.tint }]} />
                      )}
                    </View>
                    <View>
                      <ThemedText type="defaultSemiBold">{option.label}</ThemedText>
                      <ThemedText style={[styles.levelDescription, { color: palette.muted }]}>
                        {option.description}
                      </ThemedText>
                    </View>
                  </View>
                </Clickable>
              ))}
            </View>
          </View>

          {/* Meet Location */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
              Default Meeting Location
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
              ]}
              placeholder="e.g., Pitch 2, Sports Hall"
              placeholderTextColor={palette.muted}
              value={meetLocation}
              onChangeText={setMeetLocation}
            />
          </View>

          {/* Focus Areas / Tags */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
              Focus Areas (comma-separated)
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
              ]}
              placeholder="e.g., Passing, Finishing, Pressing"
              placeholderTextColor={palette.muted}
              value={tags}
              onChangeText={setTags}
            />
          </View>

          {/* Preview */}
          <SurfaceCard style={styles.previewCard}>
            <ThemedText style={[styles.previewLabel, { color: palette.muted }]}>
              Preview
            </ThemedText>
            <View style={styles.previewContent}>
              <View style={[styles.previewIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                <Ionicons name="people" size={24} color={palette.tint} />
              </View>
              <View style={styles.previewInfo}>
                <ThemedText type="defaultSemiBold">
                  {name || 'Squad Name'}
                </ThemedText>
                <ThemedText style={{ color: palette.muted, ...Typography.small }}>
                  {selectedAgeGroup || 'Age'} · {selectedLevel || 'Level'}
                </ThemedText>
                {tags && (
                  <View style={styles.previewTags}>
                    {tags.split(',').slice(0, 3).map((tag, i) => (
                      <View
                        key={i}
                        style={[styles.previewTag, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
                      >
                        <ThemedText style={{ color: palette.tint, ...Typography.caption }}>
                          {tag.trim()}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </SurfaceCard>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          <Clickable
            style={[
              styles.createButton,
              { backgroundColor: isValid ? palette.tint : palette.border },
            ]}
            onPress={handleCreate}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <ThemedText style={[styles.createButtonText, { color: palette.onPrimary }]}>Creating...</ThemedText>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={palette.onPrimary} />
                <ThemedText style={[styles.createButtonText, { color: palette.onPrimary }]}>Create Squad</ThemedText>
              </>
            )}
          </Clickable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    ...Typography.heading,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: 100,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    ...Typography.body,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.subheading,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  optionText: {
    ...Typography.bodySmallSemiBold,
  },
  levelOptions: {
    gap: Spacing.sm,
  },
  levelOption: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: Radii.sm,
  },
  levelDescription: {
    ...Typography.small,
    marginTop: Spacing.micro,
  },
  previewCard: {
    gap: Spacing.sm,
  },
  previewLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  previewTags: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xxs,
  },
  previewTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
  },
  createButtonText: {
    ...Typography.subheading,
  },
});
