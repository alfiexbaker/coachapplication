import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { clubs } from '@/constants/mock-data';
import { squadService } from '@/services/squad-service';

const AGE_GROUPS = [
  { label: 'U8', min: 5, max: 8 },
  { label: 'U10', min: 8, max: 10 },
  { label: 'U12', min: 10, max: 12 },
  { label: 'U14', min: 12, max: 14 },
  { label: 'U16', min: 14, max: 16 },
  { label: 'U18', min: 16, max: 18 },
  { label: 'Adults', min: 18, max: 99 },
];

const SQUAD_LEVELS = [
  'Development',
  'Competitive',
  'Elite',
  'Performance',
  'Foundation',
  'Fun Football',
];

const SKILL_TAGS = [
  'Ball Mastery',
  'Finishing',
  'Tactics',
  'Teamwork',
  'Confidence',
  'Technical',
  'Conditioning',
  'Goalkeeping',
  'Match Play',
];

export default function CreateSquadScreen() {
  const { colors: palette } = useTheme();
  useAuth();
  const { clubId } = useLocalSearchParams<{ clubId: string }>();

  const [squadName, setSquadName] = useState('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<typeof AGE_GROUPS[0] | null>(null);
  const [selectedLevel, setSelectedLevel] = useState('');
  const [meetLocation, setMeetLocation] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const club = clubs.find((c) => c.id === clubId);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else if (selectedTags.length < 3) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleCreate = async () => {
    if (!squadName.trim()) {
      Alert.alert('Error', 'Please enter a squad name');
      return;
    }
    if (!selectedAgeGroup) {
      Alert.alert('Error', 'Please select an age group');
      return;
    }
    if (!selectedLevel) {
      Alert.alert('Error', 'Please select a level');
      return;
    }

    setIsSubmitting(true);
    try {
      const newSquad = await squadService.createSquad({
        clubId: clubId!,
        name: squadName.trim(),
        level: `${selectedAgeGroup.label} · ${selectedLevel}`,
        description: selectedTags.length > 0 ? `Focus: ${selectedTags.join(', ')}` : undefined,
        meetingLocation: meetLocation.trim() || undefined,
        ageGroup: selectedAgeGroup.label,
        skillLevel: selectedLevel,
        focusAreas: selectedTags,
      });

      Alert.alert(
        'Squad Created',
        `${newSquad.name} has been created successfully!`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch {
      Alert.alert('Error', 'Failed to create squad. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!club) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={palette.foreground} />
          </Pressable>
          <ThemedText type="defaultSemiBold">Create Group</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContent}>
          <ThemedText style={{ color: palette.error }}>Club not found</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={24} color={palette.foreground} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <ThemedText type="defaultSemiBold">Create Group</ThemedText>
          <ThemedText style={{ color: palette.muted, ...Typography.caption }}>{club.name}</ThemedText>
        </View>
        <Pressable
          onPress={handleCreate}
          disabled={isSubmitting || !squadName.trim() || !selectedAgeGroup || !selectedLevel}
          style={[
            styles.createButton,
            { backgroundColor: (squadName.trim() && selectedAgeGroup && selectedLevel) ? palette.tint : palette.border },
          ]}
        >
          <ThemedText style={{ color: (squadName.trim() && selectedAgeGroup && selectedLevel) ? palette.onPrimary : palette.muted, ...Typography.bodySmallSemiBold }}>
            {isSubmitting ? 'Creating...' : 'Create'}
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Squad Name */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Group Name</ThemedText>
          <TextInput
            value={squadName}
            onChangeText={setSquadName}
            placeholder="e.g., U14 Development Squad"
            placeholderTextColor={palette.muted}
            style={[styles.textInput, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
          />
        </View>

        {/* Age Group */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Age Group</ThemedText>
          <View style={styles.optionsGrid}>
            {AGE_GROUPS.map((age) => (
              <Pressable
                key={age.label}
                style={[
                  styles.optionPill,
                  {
                    backgroundColor: selectedAgeGroup?.label === age.label ? palette.tint : palette.surface,
                    borderColor: selectedAgeGroup?.label === age.label ? palette.tint : palette.border,
                  },
                ]}
                onPress={() => setSelectedAgeGroup(age)}
              >
                <ThemedText
                  style={{
                    color: selectedAgeGroup?.label === age.label ? palette.onPrimary : palette.text,
                    ...Typography.bodySmallSemiBold,
                  }}
                >
                  {age.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Level */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Level</ThemedText>
          <View style={styles.optionsGrid}>
            {SQUAD_LEVELS.map((level) => (
              <Pressable
                key={level}
                style={[
                  styles.optionPill,
                  {
                    backgroundColor: selectedLevel === level ? palette.tint : palette.surface,
                    borderColor: selectedLevel === level ? palette.tint : palette.border,
                  },
                ]}
                onPress={() => setSelectedLevel(level)}
              >
                <ThemedText
                  style={{
                    color: selectedLevel === level ? palette.onPrimary : palette.text,
                    ...Typography.smallSemiBold,
                  }}
                >
                  {level}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Meeting Location */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Meeting Location</ThemedText>
          <TextInput
            value={meetLocation}
            onChangeText={setMeetLocation}
            placeholder="e.g., Main Pitch, Sports Hall"
            placeholderTextColor={palette.muted}
            style={[styles.textInput, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
          />
        </View>

        {/* Skill Tags */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Focus Areas</ThemedText>
            <ThemedText style={{ color: palette.muted, ...Typography.caption }}>Select up to 3</ThemedText>
          </View>
          <View style={styles.tagsGrid}>
            {SKILL_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <Pressable
                  key={tag}
                  style={[
                    styles.tagPill,
                    {
                      backgroundColor: isSelected ? withAlpha(palette.success, 0.09) : palette.surface,
                      borderColor: isSelected ? palette.success : palette.border,
                    },
                  ]}
                  onPress={() => toggleTag(tag)}
                >
                  {isSelected && <Ionicons name="checkmark-circle" size={16} color={palette.success} />}
                  <ThemedText
                    style={{
                      color: isSelected ? palette.success : palette.text,
                      ...Typography.smallSemiBold,
                    }}
                  >
                    {tag}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Preview Card */}
        {squadName && selectedAgeGroup && selectedLevel && (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Preview</ThemedText>
            <SurfaceCard style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <View style={[styles.previewBadge, { backgroundColor: palette.tint }]}>
                  <ThemedText style={{ color: palette.onPrimary, ...Typography.bodySmallSemiBold }}>
                    {squadName.slice(0, 2).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold" style={{ ...Typography.subheading }}>{squadName}</ThemedText>
                  <ThemedText style={{ color: palette.muted, ...Typography.small }}>
                    {selectedAgeGroup.label} · {selectedLevel}
                  </ThemedText>
                </View>
              </View>
              {meetLocation && (
                <View style={styles.previewMeta}>
                  <Ionicons name="location-outline" size={14} color={palette.muted} />
                  <ThemedText style={{ color: palette.muted, ...Typography.small }}>{meetLocation}</ThemedText>
                </View>
              )}
              {selectedTags.length > 0 && (
                <View style={styles.previewTags}>
                  {selectedTags.map((tag) => (
                    <View key={tag} style={[styles.previewTag, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                      <ThemedText style={{ color: palette.tint, ...Typography.caption }}>{tag}</ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </SurfaceCard>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  createButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Typography.subheading,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  previewCard: {
    gap: Spacing.sm,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  previewBadge: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  previewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  previewTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
});
