/**
 * Create Squad Modal Screen
 *
 * Form for creating a new squad with age group, level, location, and focus areas.
 * All state/logic in useCreateSquad hook.
 */

import { View, StyleSheet, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCreateSquad, AGE_GROUPS, SQUAD_LEVELS, SKILL_TAGS } from '@/hooks/use-create-squad';

export default function CreateSquadScreen() {
  const { colors: palette } = useTheme();
  const c = useCreateSquad();

  if (!c.club) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <Clickable onPress={() => router.back()} hitSlop={10}><Ionicons name="close" size={24} color={palette.foreground} /></Clickable>
          <ThemedText type="defaultSemiBold">Create Group</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContent}><ThemedText style={{ color: palette.error }}>Club not found</ThemedText></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Clickable onPress={() => router.back()} hitSlop={10}><Ionicons name="close" size={24} color={palette.foreground} /></Clickable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <ThemedText type="defaultSemiBold">Create Group</ThemedText>
          <ThemedText style={{ color: palette.muted, ...Typography.caption }}>{c.club.name}</ThemedText>
        </View>
        <Clickable onPress={c.handleCreate} disabled={c.isSubmitting || !c.isValid}
          style={[styles.createButton, { backgroundColor: c.isValid ? palette.tint : palette.border }]}>
          <ThemedText style={{ color: c.isValid ? palette.onPrimary : palette.muted, ...Typography.bodySmallSemiBold }}>
            {c.isSubmitting ? 'Creating...' : 'Create'}
          </ThemedText>
        </Clickable>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Group Name</ThemedText>
          <TextInput value={c.squadName} onChangeText={c.setSquadName} placeholder="e.g., U14 Development Squad"
            placeholderTextColor={palette.muted} style={[styles.textInput, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]} />
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Age Group</ThemedText>
          <View style={styles.optionsGrid}>
            {AGE_GROUPS.map((age) => (
              <Clickable key={age.label} onPress={() => c.setSelectedAgeGroup(age)}
                style={[styles.optionPill, {
                  backgroundColor: c.selectedAgeGroup?.label === age.label ? palette.tint : palette.surface,
                  borderColor: c.selectedAgeGroup?.label === age.label ? palette.tint : palette.border,
                }]}>
                <ThemedText style={{ color: c.selectedAgeGroup?.label === age.label ? palette.onPrimary : palette.text, ...Typography.bodySmallSemiBold }}>{age.label}</ThemedText>
              </Clickable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Level</ThemedText>
          <View style={styles.optionsGrid}>
            {SQUAD_LEVELS.map((level) => (
              <Clickable key={level} onPress={() => c.setSelectedLevel(level)}
                style={[styles.optionPill, {
                  backgroundColor: c.selectedLevel === level ? palette.tint : palette.surface,
                  borderColor: c.selectedLevel === level ? palette.tint : palette.border,
                }]}>
                <ThemedText style={{ color: c.selectedLevel === level ? palette.onPrimary : palette.text, ...Typography.smallSemiBold }}>{level}</ThemedText>
              </Clickable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Meeting Location</ThemedText>
          <TextInput value={c.meetLocation} onChangeText={c.setMeetLocation} placeholder="e.g., Main Pitch, Sports Hall"
            placeholderTextColor={palette.muted} style={[styles.textInput, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Focus Areas</ThemedText>
            <ThemedText style={{ color: palette.muted, ...Typography.caption }}>Select up to 3</ThemedText>
          </View>
          <View style={styles.tagsGrid}>
            {SKILL_TAGS.map((tag) => {
              const isSelected = c.selectedTags.includes(tag);
              return (
                <Clickable key={tag} onPress={() => c.toggleTag(tag)}
                  style={[styles.tagPill, {
                    backgroundColor: isSelected ? withAlpha(palette.success, 0.09) : palette.surface,
                    borderColor: isSelected ? palette.success : palette.border,
                  }]}>
                  {isSelected && <Ionicons name="checkmark-circle" size={16} color={palette.success} />}
                  <ThemedText style={{ color: isSelected ? palette.success : palette.text, ...Typography.smallSemiBold }}>{tag}</ThemedText>
                </Clickable>
              );
            })}
          </View>
        </View>

        {c.squadName && c.selectedAgeGroup && c.selectedLevel && (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Preview</ThemedText>
            <SurfaceCard style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <View style={[styles.previewBadge, { backgroundColor: palette.tint }]}>
                  <ThemedText style={{ color: palette.onPrimary, ...Typography.bodySmallSemiBold }}>{c.squadName.slice(0, 2).toUpperCase()}</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold" style={{ ...Typography.subheading }}>{c.squadName}</ThemedText>
                  <ThemedText style={{ color: palette.muted, ...Typography.small }}>{c.selectedAgeGroup.label} · {c.selectedLevel}</ThemedText>
                </View>
              </View>
              {c.meetLocation ? (
                <View style={styles.previewMeta}><Ionicons name="location-outline" size={14} color={palette.muted} />
                  <ThemedText style={{ color: palette.muted, ...Typography.small }}>{c.meetLocation}</ThemedText></View>
              ) : null}
              {c.selectedTags.length > 0 && (
                <View style={styles.previewTags}>
                  {c.selectedTags.map((tag) => (
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
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  createButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md },
  content: { flex: 1, padding: Spacing.lg },
  errorContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { marginBottom: Spacing.sm },
  textInput: { borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, ...Typography.subheading },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  optionPill: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.pill, borderWidth: 1 },
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tagPill: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.pill, borderWidth: 1 },
  previewCard: { gap: Spacing.sm },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  previewBadge: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  previewMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  previewTags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  previewTag: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
});
