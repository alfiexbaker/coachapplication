/**
 * Create Squad Screen
 *
 * Form for creating a new squad with name, age group, level,
 * meeting location, and focus tags. Includes live preview.
 */

import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useCreateSquad, AGE_GROUPS, SQUAD_LEVELS, SKILL_TAGS } from '@/hooks/use-create-squad';

export default function CreateSquadScreen() {
  const { status, error, retry, colors } = useScreen<boolean>({
    load: async () => ok(true),
    isEmpty: () => false,
    refetchOnFocus: true,
  });
  const {
    squadName,
    selectedAgeGroup,
    selectedLevel,
    meetLocation,
    selectedTags,
    isSubmitting,
    isValid,
    setSquadName,
    setSelectedAgeGroup,
    setSelectedLevel,
    setMeetLocation,
    toggleTag,
    handleCreate,
  } = useCreateSquad();

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <ErrorState
          message={error?.message || 'Failed to open squad creation flow.'}
          onRetry={retry}
        />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top']}
      >
        <EmptyState
          icon="people-outline"
          title="Creation unavailable"
          message="The squad creation flow is currently unavailable."
          actionLabel="Retry"
          onPressAction={retry}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Row align="center" justify="space-between" style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Clickable>
          <ThemedText type="title" style={Typography.heading}>
            Create Squad
          </ThemedText>
          <View style={{ width: 24 }} />
        </Row>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Squad Name */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">Squad Name *</ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="e.g., U15 Performance"
              placeholderTextColor={colors.muted}
              value={squadName}
              onChangeText={setSquadName}
            />
          </View>

          {/* Age Group */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">Age Group *</ThemedText>
            <Row style={styles.optionsGrid}>
              {AGE_GROUPS.map((option) => (
                <Clickable
                  key={option.label}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor:
                        selectedAgeGroup?.label === option.label ? colors.tint : colors.surface,
                      borderColor:
                        selectedAgeGroup?.label === option.label ? colors.tint : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedAgeGroup(option)}
                >
                  <ThemedText
                    style={[
                      Typography.bodySmallSemiBold,
                      {
                        color:
                          selectedAgeGroup?.label === option.label ? colors.onPrimary : colors.text,
                      },
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                </Clickable>
              ))}
            </Row>
          </View>

          {/* Level */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">Level *</ThemedText>
            <View style={styles.levelOptions}>
              {SQUAD_LEVELS.map((level) => (
                <Clickable
                  key={level}
                  style={[
                    styles.levelOption,
                    {
                      borderColor: selectedLevel === level ? colors.tint : colors.border,
                      backgroundColor:
                        selectedLevel === level ? withAlpha(colors.tint, 0.06) : 'transparent',
                    },
                  ]}
                  onPress={() => setSelectedLevel(level)}
                >
                  <Row gap="md" align="center">
                    <View
                      style={[
                        styles.radio,
                        { borderColor: selectedLevel === level ? colors.tint : colors.border },
                      ]}
                    >
                      {selectedLevel === level && (
                        <View style={[styles.radioInner, { backgroundColor: colors.tint }]} />
                      )}
                    </View>
                    <ThemedText type="defaultSemiBold">{level}</ThemedText>
                  </Row>
                </Clickable>
              ))}
            </View>
          </View>

          {/* Meet Location */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">Default Meeting Location</ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
              ]}
              placeholder="e.g., Pitch 2, Sports Hall"
              placeholderTextColor={colors.muted}
              value={meetLocation}
              onChangeText={setMeetLocation}
            />
          </View>

          {/* Focus Tags */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">Focus Areas (max 3)</ThemedText>
            <Row style={styles.optionsGrid}>
              {SKILL_TAGS.map((tag) => (
                <Clickable
                  key={tag}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: selectedTags.includes(tag)
                        ? withAlpha(colors.tint, 0.12)
                        : colors.surface,
                      borderColor: selectedTags.includes(tag) ? colors.tint : colors.border,
                    },
                  ]}
                  onPress={() => toggleTag(tag)}
                >
                  <ThemedText
                    style={[
                      Typography.bodySmallSemiBold,
                      { color: selectedTags.includes(tag) ? colors.tint : colors.text },
                    ]}
                  >
                    {tag}
                  </ThemedText>
                </Clickable>
              ))}
            </Row>
          </View>

          {/* Preview */}
          <SurfaceCard style={styles.previewCard}>
            <ThemedText
              style={[Typography.caption, { color: colors.muted, textTransform: 'uppercase' }]}
            >
              Preview
            </ThemedText>
            <Row gap="md" align="center">
              <View style={[styles.previewIcon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
                <Ionicons name="people" size={24} color={colors.tint} />
              </View>
              <View style={{ flex: 1, gap: Spacing.xxs }}>
                <ThemedText type="defaultSemiBold">{squadName || 'Squad Name'}</ThemedText>
                <ThemedText style={{ color: colors.muted, ...Typography.small }}>
                  {selectedAgeGroup?.label || 'Age'} · {selectedLevel || 'Level'}
                </ThemedText>
                {selectedTags.length > 0 && (
                  <Row gap="xs" style={{ marginTop: Spacing.xxs }}>
                    {selectedTags.map((tag) => (
                      <View
                        key={tag}
                        style={[
                          styles.previewTag,
                          { backgroundColor: withAlpha(colors.tint, 0.06) },
                        ]}
                      >
                        <ThemedText style={{ color: colors.tint, ...Typography.caption }}>
                          {tag}
                        </ThemedText>
                      </View>
                    ))}
                  </Row>
                )}
              </View>
            </Row>
          </SurfaceCard>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Clickable
            style={[
              styles.createButton,
              { backgroundColor: isValid ? colors.tint : colors.border },
            ]}
            onPress={handleCreate}
            disabled={!isValid || isSubmitting}
          >
            <Row align="center" justify="center" gap="sm">
              {isSubmitting ? (
                <ThemedText style={[Typography.subheading, { color: colors.onPrimary }]}>
                  Creating...
                </ThemedText>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} />
                  <ThemedText style={[Typography.subheading, { color: colors.onPrimary }]}>
                    Create Squad
                  </ThemedText>
                </>
              )}
            </Row>
          </Clickable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 100 },
  section: { gap: Spacing.sm },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.subheading,
  },
  optionsGrid: { flexWrap: 'wrap', gap: Spacing.sm },
  optionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  levelOptions: { gap: Spacing.sm },
  levelOption: { padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1.5 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: Radii.sm },
  previewCard: { gap: Spacing.sm },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
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
  createButton: { paddingVertical: Spacing.md, borderRadius: Radii.lg },
});
