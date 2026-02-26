/**
 * Create Squad Modal Screen
 *
 * Form for creating a new squad with age group, level, location, and focus areas.
 * All state/logic in useCreateSquad hook.
 */

import { useRef } from 'react';
import { View, StyleSheet, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Clickable } from '@/components/primitives/clickable';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCreateSquad, AGE_GROUPS, SQUAD_LEVELS, SKILL_TAGS } from '@/hooks/use-create-squad';
import { useFocusTrap } from '@/hooks/use-focus-trap';

export default function CreateSquadScreen() {
  const { colors: palette } = useTheme();
  const c = useCreateSquad();
  const modalRef = useRef<View>(null);
  useFocusTrap(modalRef, 'Create group modal');

  if (!c.club) {
    return (
      <SafeAreaView
        ref={modalRef}
        accessible
        accessibilityViewIsModal
        accessibilityRole="dialog"
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader
          title="Create Group"
          showBack
          backIcon="close"
          onBackPress={() => router.back()}
          centerTitle
          containerStyle={[styles.header, { borderBottomColor: palette.border }]}
        />
        <View style={styles.errorContent}>
          <ThemedText style={{ color: palette.error }}>Club not found</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      ref={modalRef}
      accessible
      accessibilityViewIsModal
      accessibilityRole="dialog"
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader
        title="Create Group"
        subtitle={c.club.name}
        showBack
        backIcon="close"
        onBackPress={() => router.back()}
        centerTitle
        containerStyle={[styles.header, { borderBottomColor: palette.border }]}
        right={
          <Clickable
            onPress={c.handleCreate}
            disabled={c.isSubmitting || !c.isValid}
            style={[
              styles.createButton,
              { backgroundColor: c.isValid ? palette.tint : palette.border },
            ]}
          >
            <ThemedText
              style={{
                color: c.isValid ? palette.onPrimary : palette.muted,
                ...Typography.bodySmallSemiBold,
              }}
            >
              {c.isSubmitting ? 'Creating...' : 'Create'}
            </ThemedText>
          </Clickable>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Group Name
          </ThemedText>
          <TextInput
            value={c.squadName}
            onChangeText={c.setSquadName}
            placeholder="e.g., U14 Development Squad"
            placeholderTextColor={palette.muted}
            style={[
              styles.textInput,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Age Group
          </ThemedText>
          <Row wrap gap="sm" style={styles.optionsGrid}>
            {AGE_GROUPS.map((age) => (
              <Clickable
                key={age.label}
                onPress={() => c.setSelectedAgeGroup(age)}
                style={[
                  styles.optionPill,
                  {
                    backgroundColor:
                      c.selectedAgeGroup?.label === age.label ? palette.tint : palette.surface,
                    borderColor:
                      c.selectedAgeGroup?.label === age.label ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={{
                    color:
                      c.selectedAgeGroup?.label === age.label ? palette.onPrimary : palette.text,
                    ...Typography.bodySmallSemiBold,
                  }}
                >
                  {age.label}
                </ThemedText>
              </Clickable>
            ))}
          </Row>
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Level
          </ThemedText>
          <Row wrap gap="sm" style={styles.optionsGrid}>
            {SQUAD_LEVELS.map((level) => (
              <Clickable
                key={level}
                onPress={() => c.setSelectedLevel(level)}
                style={[
                  styles.optionPill,
                  {
                    backgroundColor: c.selectedLevel === level ? palette.tint : palette.surface,
                    borderColor: c.selectedLevel === level ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={{
                    color: c.selectedLevel === level ? palette.onPrimary : palette.text,
                    ...Typography.smallSemiBold,
                  }}
                >
                  {level}
                </ThemedText>
              </Clickable>
            ))}
          </Row>
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Meeting Location
          </ThemedText>
          <TextInput
            value={c.meetLocation}
            onChangeText={c.setMeetLocation}
            placeholder="e.g., Main Pitch, Sports Hall"
            placeholderTextColor={palette.muted}
            style={[
              styles.textInput,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
          />
        </View>

        <View style={styles.section}>
          <Row justify="between" align="center" style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Focus Areas
            </ThemedText>
            <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
              Select up to 3
            </ThemedText>
          </Row>
          <Row wrap gap="sm" style={styles.tagsGrid}>
            {SKILL_TAGS.map((tag) => {
              const isSelected = c.selectedTags.includes(tag);
              return (
                <Clickable
                  key={tag}
                  onPress={() => c.toggleTag(tag)}
                  style={[
                    styles.tagPill,
                    {
                      backgroundColor: isSelected
                        ? withAlpha(palette.success, 0.09)
                        : palette.surface,
                      borderColor: isSelected ? palette.success : palette.border,
                    },
                  ]}
                >
                  <Row align="center" gap="xs">
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={16} color={palette.success} />
                    )}
                    <ThemedText
                      style={{
                        color: isSelected ? palette.success : palette.text,
                        ...Typography.smallSemiBold,
                      }}
                    >
                      {tag}
                    </ThemedText>
                  </Row>
                </Clickable>
              );
            })}
          </Row>
        </View>

        {c.squadName && c.selectedAgeGroup && c.selectedLevel && (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Preview
            </ThemedText>
            <SurfaceCard style={styles.previewCard}>
              <Row align="center" gap="md" style={styles.previewHeader}>
                <View style={[styles.previewBadge, { backgroundColor: palette.tint }]}>
                  <ThemedText style={{ color: palette.onPrimary, ...Typography.bodySmallSemiBold }}>
                    {c.squadName.slice(0, 2).toUpperCase()}
                  </ThemedText>
                </View>
                <Column flex>
                  <ThemedText type="defaultSemiBold" style={{ ...Typography.subheading }}>
                    {c.squadName}
                  </ThemedText>
                  <ThemedText style={{ color: palette.muted, ...Typography.small }}>
                    {c.selectedAgeGroup.label} · {c.selectedLevel}
                  </ThemedText>
                </Column>
              </Row>
              {c.meetLocation ? (
                <Row align="center" gap="xs" style={styles.previewMeta}>
                  <Ionicons name="location-outline" size={14} color={palette.muted} />
                  <ThemedText style={{ color: palette.muted, ...Typography.small }}>
                    {c.meetLocation}
                  </ThemedText>
                </Row>
              ) : null}
              {c.selectedTags.length > 0 && (
                <Row wrap gap="xs" style={styles.previewTags}>
                  {c.selectedTags.map((tag) => (
                    <View
                      key={tag}
                      style={[
                        styles.previewTag,
                        { backgroundColor: withAlpha(palette.tint, 0.09) },
                      ]}
                    >
                      <ThemedText style={{ color: palette.tint, ...Typography.caption }}>
                        {tag}
                      </ThemedText>
                    </View>
                  ))}
                </Row>
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
  header: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  createButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  content: { flex: 1, padding: Spacing.lg },
  errorContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { marginBottom: Spacing.lg },
  sectionHeader: {},
  sectionTitle: { marginBottom: Spacing.sm },
  textInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Typography.subheading,
  },
  optionsGrid: {},
  optionPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  tagsGrid: {},
  tagPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  previewCard: { gap: Spacing.sm },
  previewHeader: {},
  previewBadge: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewMeta: {},
  previewTags: {},
  previewTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
});
