/**
 * Create Club Screen
 *
 * Form for creating a new club with name, tagline, city,
 * country, badge, commercial model, and optional first staff invite.
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
import { Column } from '@/components/primitives/column';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCreateClub } from '@/hooks/use-create-club';
import { COMMERCIAL_MODE_CHOICES } from '@/utils/organization-commercial-mode';
import { ORGANIZATION_ROLE_LABELS } from '@/contracts/club-governance';

const FIRST_STAFF_ROLE_OPTIONS = [
  {
    value: 'COACH' as const,
    label: ORGANIZATION_ROLE_LABELS.COACH,
    note: 'Invite your first delivery coach',
  },
  {
    value: 'HEAD_COACH' as const,
    label: ORGANIZATION_ROLE_LABELS.HEAD_COACH,
    note: 'Invite someone to oversee standards and staffing',
  },
  {
    value: 'ADMIN' as const,
    label: ORGANIZATION_ROLE_LABELS.ADMIN,
    note: 'Invite someone to help run operations',
  },
  {
    value: 'NONE' as const,
    label: 'Skip for now',
    note: 'Create the club first and invite staff later',
  },
] as const;

export default function CreateClubScreen() {
  const { colors: palette } = useTheme();
  const {
    name,
    setName,
    handleNameBlur,
    nameError,
    tagline,
    setTagline,
    city,
    setCity,
    handleCityBlur,
    cityError,
    country,
    setCountry,
    badge,
    handleBadgeChange,
    commercialMode,
    setCommercialMode,
    firstStaffRole,
    setFirstStaffRole,
    isSubmitting,
    isValid,
    handleCreate,
  } = useCreateClub();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <PageHeader
          title="Create Club"
          showBack
          backIcon="close"
          onBackPress={() => router.back()}
          centerTitle
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formSection}>
            <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
              Club
            </ThemedText>
            <FormInput
              label="Club Name *"
              placeholder="e.g., Lions FC Academy"
              value={name}
              onChangeText={setName}
              onBlur={handleNameBlur}
              palette={palette}
              autoCapitalize="words"
              errorText={nameError}
            />
            <FormInput
              label="Tagline (optional)"
              placeholder="e.g., Developing champions since 2015"
              value={tagline}
              onChangeText={setTagline}
              palette={palette}
            />
            <Row gap="md">
              <View style={{ flex: 2 }}>
                <FormInput
                  label="City *"
                  placeholder="e.g., London"
                  value={city}
                  onChangeText={setCity}
                  onBlur={handleCityBlur}
                  palette={palette}
                  autoCapitalize="words"
                  errorText={cityError}
                />
              </View>
              <Column flex>
                <FormInput
                  label="Country"
                  placeholder="UK"
                  value={country}
                  onChangeText={setCountry}
                  palette={palette}
                  autoCapitalize="characters"
                />
              </Column>
            </Row>
            <FormInput
              label="Badge/Abbreviation (3-4 letters)"
              placeholder="LFC"
              value={badge}
              onChangeText={handleBadgeChange}
              palette={palette}
              autoCapitalize="characters"
              maxLength={4}
              inputStyle={{ width: 120 }}
            />
          </View>

          <SurfaceCard style={styles.setupCard}>
            <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
              Commercial model
            </ThemedText>
            <ThemedText style={[Typography.small, { color: palette.muted }]}>
              Choose who families book and pay through for club sessions.
            </ThemedText>
            <View style={styles.choiceList}>
              {COMMERCIAL_MODE_CHOICES.map((option) => {
                const isSelected = option.value === commercialMode;
                return (
                  <Clickable
                    key={option.value}
                    style={[
                      styles.choiceCard,
                      {
                        borderColor: isSelected ? palette.tint : palette.border,
                        backgroundColor: isSelected
                          ? withAlpha(palette.tint, 0.08)
                          : palette.surface,
                      },
                    ]}
                    onPress={() => setCommercialMode(option.value)}
                  >
                    <Row align="center" justify="between" gap="sm">
                      <View style={styles.choiceCopy}>
                        <ThemedText type="defaultSemiBold">{option.title}</ThemedText>
                        <ThemedText style={[Typography.small, { color: palette.muted }]}>
                          {option.summary}
                        </ThemedText>
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color={palette.tint} />
                      ) : null}
                    </Row>
                  </Clickable>
                );
              })}
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.setupCard}>
            <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
              First staff invite
            </ThemedText>
            <ThemedText style={[Typography.small, { color: palette.muted }]}>
              Create an invite code now, or do it later from club settings.
            </ThemedText>
            <View style={styles.choiceList}>
              {FIRST_STAFF_ROLE_OPTIONS.map((option) => {
                const isSelected = option.value === firstStaffRole;
                return (
                  <Clickable
                    key={option.value}
                    style={[
                      styles.choiceCard,
                      {
                        borderColor: isSelected ? palette.tint : palette.border,
                        backgroundColor: isSelected
                          ? withAlpha(palette.tint, 0.08)
                          : palette.surface,
                      },
                    ]}
                    onPress={() => setFirstStaffRole(option.value)}
                  >
                    <Row align="center" justify="between" gap="sm">
                      <View style={styles.choiceCopy}>
                        <ThemedText type="defaultSemiBold">{option.label}</ThemedText>
                        <ThemedText style={[Typography.small, { color: palette.muted }]}>
                          {option.note}
                        </ThemedText>
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color={palette.tint} />
                      ) : null}
                    </Row>
                  </Clickable>
                );
              })}
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
            <Row align="center" justify="center" gap="sm">
              {isSubmitting ? (
                <ThemedText style={[Typography.subheading, { color: palette.onPrimary }]}>
                  Creating…
                </ThemedText>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={palette.onPrimary} />
                  <ThemedText style={[Typography.subheading, { color: palette.onPrimary }]}>
                    Create Club
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

function FormInput({
  label,
  palette,
  inputStyle,
  errorText,
  ...inputProps
}: {
  label: string;
  palette: { surface: string; border: string; text: string; muted: string; error: string };
  inputStyle?: object;
  errorText?: string | null;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.inputGroup}>
      <ThemedText style={[Typography.smallSemiBold, { color: palette.muted }]}>{label}</ThemedText>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: palette.surface,
            borderColor: errorText ? palette.error : palette.border,
            color: palette.text,
          },
          inputStyle,
        ]}
        placeholderTextColor={palette.muted}
        maxLength={100}
        accessibilityLabel={label.replace('*', '').trim()}
        {...inputProps}
      />
      {errorText ? (
        <ThemedText style={[Typography.caption, { color: palette.error }]}>{errorText}</ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.lg },
  formSection: { gap: Spacing.md },
  setupCard: { gap: Spacing.sm },
  sectionLabel: { ...Typography.subheading, marginBottom: Spacing.xs },
  choiceList: { gap: Spacing.sm },
  choiceCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
  },
  choiceCopy: { flex: 1, gap: Spacing.xxs },
  inputGroup: { gap: Spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.subheading,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  createButton: { paddingVertical: Spacing.md, borderRadius: Radii.lg },
});
