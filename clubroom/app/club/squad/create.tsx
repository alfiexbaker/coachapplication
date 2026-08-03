import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SubmitProgressState,
} from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { AGE_GROUPS, SQUAD_LEVELS, useCreateSquad } from '@/hooks/use-create-squad';
import { useTheme } from '@/hooks/useTheme';

export default function CreateSquadScreen() {
  const { colors } = useTheme();
  const composer = useCreateSquad();
  const isReady = composer.contextStatus === 'ready';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <Row style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerSide}>
          <Clickable
            onPress={() => router.back()}
            accessibilityLabel="Close squad creator"
            accessibilityRole="button"
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Clickable>
        </View>
        <ThemedText type="defaultSemiBold">New squad</ThemedText>
        <View style={[styles.headerSide, styles.headerAction]}>
          {isReady ? (
            <Clickable
              onPress={composer.handleCreate}
              disabled={!composer.canCreate}
              accessibilityLabel={composer.isSubmitting ? 'Creating squad' : 'Create squad'}
              accessibilityRole="button"
              accessibilityState={{ disabled: !composer.canCreate, busy: composer.isSubmitting }}
              style={[
                styles.createButton,
                {
                  backgroundColor: composer.canCreate ? colors.tint : colors.border,
                  opacity: composer.canCreate ? 1 : 0.55,
                },
              ]}
            >
              <ThemedText style={[styles.createButtonText, { color: colors.onPrimary }]}>
                Create
              </ThemedText>
            </Clickable>
          ) : null}
        </View>
      </Row>

      {composer.isSubmitting ? (
        <SubmitProgressState label="Creating squad" style={styles.submitState} />
      ) : null}

      {isReady && composer.submitError ? (
        <Row
          style={[
            styles.errorBanner,
            {
              backgroundColor: withAlpha(colors.error, 0.08),
              borderColor: withAlpha(colors.error, 0.24),
            },
          ]}
          accessibilityRole="alert"
        >
          <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
          <ThemedText style={[styles.errorText, { color: colors.error }]}>
            {composer.submitError}
          </ThemedText>
        </Row>
      ) : null}

      {composer.contextStatus === 'loading' ? (
        <LoadingState
          variant="form"
          accessibilityLabel="Loading squad creator"
          style={styles.stateContainer}
        />
      ) : composer.contextStatus === 'error' ? (
        <ErrorState
          title="Could not load club"
          message={composer.contextMessage ?? 'Could not load your club access.'}
          onRetry={composer.retryContext}
        />
      ) : composer.contextStatus === 'denied' ? (
        <View style={styles.stateContainer}>
          <EmptyState
            context="error"
            title="Squad creation unavailable"
            message={
              composer.contextMessage ??
              'You do not have permission to create squads for this club.'
            }
          />
        </View>
      ) : composer.contextStatus === 'empty' ? (
        <View style={styles.stateContainer}>
          <EmptyState
            icon="shield-outline"
            title="No club selected"
            message={composer.contextMessage ?? 'Choose a club before creating a squad.'}
          />
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.clubContext, { borderBottomColor: colors.border }]}>
              <ThemedText style={[styles.contextLabel, { color: colors.muted }]}>CLUB</ThemedText>
              <ThemedText type="subtitle">{composer.club?.name}</ThemedText>
            </View>

            <View style={styles.section}>
              <ThemedText type="defaultSemiBold">Name</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                accessibilityLabel="Squad name"
                placeholder="U14 Girls"
                placeholderTextColor={colors.muted}
                value={composer.squadName}
                onChangeText={composer.setSquadName}
                maxLength={50}
                returnKeyType="done"
              />
            </View>

            <View style={styles.section}>
              <ThemedText type="defaultSemiBold">Age group</ThemedText>
              <Row style={styles.optionsGrid}>
                {AGE_GROUPS.map((ageGroup) => {
                  const selected = composer.selectedAgeGroup === ageGroup;
                  return (
                    <Clickable
                      key={ageGroup}
                      onPress={() => composer.setSelectedAgeGroup(ageGroup)}
                      accessibilityLabel={`${ageGroup} age group`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      style={[
                        styles.optionChip,
                        {
                          backgroundColor: selected ? colors.tint : colors.surface,
                          borderColor: selected ? colors.tint : colors.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          Typography.bodySmallSemiBold,
                          { color: selected ? colors.onPrimary : colors.text },
                        ]}
                      >
                        {ageGroup}
                      </ThemedText>
                    </Clickable>
                  );
                })}
              </Row>
            </View>

            <View style={styles.section}>
              <ThemedText type="defaultSemiBold">Level</ThemedText>
              <View style={styles.levelOptions}>
                {SQUAD_LEVELS.map((level) => {
                  const selected = composer.selectedLevel === level;
                  return (
                    <Clickable
                      key={level}
                      onPress={() => composer.setSelectedLevel(level)}
                      accessibilityLabel={`${level} level`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      style={[
                        styles.levelOption,
                        {
                          borderColor: selected ? colors.tint : colors.border,
                          backgroundColor: selected ? withAlpha(colors.tint, 0.06) : 'transparent',
                        },
                      ]}
                    >
                      <Row gap="md" align="center">
                        <View
                          style={[
                            styles.radio,
                            { borderColor: selected ? colors.tint : colors.border },
                          ]}
                        >
                          {selected ? (
                            <View style={[styles.radioInner, { backgroundColor: colors.tint }]} />
                          ) : null}
                        </View>
                        <ThemedText type="defaultSemiBold">{level}</ThemedText>
                      </Row>
                    </Clickable>
                  );
                })}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: { width: 88, alignItems: 'flex-start' },
  headerAction: { alignItems: 'flex-end' },
  closeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.full,
  },
  createButtonText: Typography.bodySmallSemiBold,
  submitState: { marginHorizontal: Spacing.lg, marginTop: Spacing.sm },
  errorBanner: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.md,
  },
  errorText: { flex: 1, ...Typography.small },
  stateContainer: { flex: 1 },
  content: { paddingBottom: Spacing.xl },
  clubContext: {
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contextLabel: { ...Typography.caption, letterSpacing: 0.7 },
  section: { gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.subheading,
  },
  optionsGrid: { flexWrap: 'wrap', gap: Spacing.sm },
  optionChip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  levelOptions: { gap: Spacing.sm },
  levelOption: { minHeight: 48, padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
});
