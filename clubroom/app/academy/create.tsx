import { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { createLogger } from '@/utils/logger';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { academyService, CreateAcademyInput } from '@/services/academy-service';
import type { FootballObjective } from '@/constants/types';

const logger = createLogger('CreateAcademyScreen');

const SPECIALTY_OPTIONS: FootballObjective[] = [
  'Dribbling',
  'Passing',
  'Finishing',
  'Defending',
  'Goalkeeping',
  'Conditioning',
];

type WizardStep = 'basics' | 'details' | 'specialties' | 'review';

export default function CreateAcademyScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [step, setStep] = useState<WizardStep>('basics');
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [specialties, setSpecialties] = useState<FootballObjective[]>([]);

  const steps: WizardStep[] = ['basics', 'details', 'specialties', 'review'];
  const currentStepIndex = steps.indexOf(step);

  const canProceed = () => {
    switch (step) {
      case 'basics':
        return name.trim().length > 0 && city.trim().length > 0 && postcode.trim().length > 0;
      case 'details':
        return true;
      case 'specialties':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      setStep(steps[currentStepIndex - 1]);
    } else {
      router.back();
    }
  };

  const toggleSpecialty = (s: FootballObjective) => {
    if (specialties.includes(s)) {
      setSpecialties(specialties.filter((x) => x !== s));
    } else {
      setSpecialties([...specialties, s]);
    }
  };

  const handleCreate = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const input: CreateAcademyInput = {
        name,
        description,
        city,
        postcode,
        ownerId: currentUser.id,
        ownerName: currentUser.name || 'Coach',
        sports: ['Football'],
        specialties,
      };

      const academy = await academyService.createAcademy(input);

      // Update branding if contact info provided
      if (email || phone || website) {
        await academyService.updateBranding(academy.id, {
          email: email || undefined,
          phone: phone || undefined,
          website: website || undefined,
        });
      }

      router.replace(Routes.academy(academy.id));
    } catch (error) {
      logger.error('Failed to create academy:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'basics':
        return (
          <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepIcon, { backgroundColor: palette.tint }]}>
                <Ionicons name="people" size={28} color={palette.onPrimary} />
              </View>
              <ThemedText type="title" style={styles.stepTitle}>
                Create Your Team
              </ThemedText>
              <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>
                Set up a team to manage coaches, athletes, and training
              </ThemedText>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Team Name *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                placeholder="e.g., Under 12s, Girls Academy, First Team"
                placeholderTextColor={palette.muted}
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>City *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                placeholder="e.g., London"
                placeholderTextColor={palette.muted}
                value={city}
                onChangeText={setCity}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Postcode *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                placeholder="e.g., E8 1AB"
                placeholderTextColor={palette.muted}
                value={postcode}
                onChangeText={setPostcode}
                autoCapitalize="characters"
              />
            </View>
          </Animated.View>
        );

      case 'details':
        return (
          <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
            <ThemedText type="title" style={styles.stepTitle}>
              Tell us more
            </ThemedText>
            <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>
              Help parents discover your team
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Description</ThemedText>
              <TextInput
                style={[styles.textArea, { backgroundColor: palette.surface, color: palette.text }]}
                placeholder="Describe your team, training philosophy, and what makes you unique..."
                placeholderTextColor={palette.muted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Email</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                placeholder="info@academy.com"
                placeholderTextColor={palette.muted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Phone</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                placeholder="+44 20 1234 5678"
                placeholderTextColor={palette.muted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Website</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                placeholder="https://academy.com"
                placeholderTextColor={palette.muted}
                value={website}
                onChangeText={setWebsite}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          </Animated.View>
        );

      case 'specialties':
        return (
          <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
            <ThemedText type="title" style={styles.stepTitle}>
              Your Specialties
            </ThemedText>
            <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>
              What areas do you focus on?
            </ThemedText>

            <View style={styles.specialtiesGrid}>
              {SPECIALTY_OPTIONS.map((specialty) => (
                <Clickable
                  key={specialty}
                  onPress={() => toggleSpecialty(specialty)}
                  style={[
                    styles.specialtyCard,
                    {
                      backgroundColor: specialties.includes(specialty)
                        ? withAlpha(palette.tint, 0.09)
                        : palette.surface,
                      borderColor: specialties.includes(specialty) ? palette.tint : palette.border,
                    },
                  ]}
                >
                  {specialties.includes(specialty) && (
                    <View style={[styles.checkIcon, { backgroundColor: palette.tint }]}>
                      <Ionicons name="checkmark" size={12} color={palette.onPrimary} />
                    </View>
                  )}
                  <ThemedText
                    style={[
                      styles.specialtyText,
                      { color: specialties.includes(specialty) ? palette.tint : palette.text },
                    ]}
                  >
                    {specialty}
                  </ThemedText>
                </Clickable>
              ))}
            </View>
          </Animated.View>
        );

      case 'review':
        return (
          <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
            <ThemedText type="title" style={styles.stepTitle}>
              Review & Create
            </ThemedText>

            <SurfaceCard style={styles.reviewCard}>
              <View style={styles.reviewRow}>
                <ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Name</ThemedText>
                <ThemedText type="defaultSemiBold">{name}</ThemedText>
              </View>
              <View style={styles.reviewRow}>
                <ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Location</ThemedText>
                <ThemedText>{city}, {postcode}</ThemedText>
              </View>
              {description && (
                <View style={styles.reviewRow}>
                  <ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Description</ThemedText>
                  <ThemedText numberOfLines={2}>{description}</ThemedText>
                </View>
              )}
              {email && (
                <View style={styles.reviewRow}>
                  <ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Email</ThemedText>
                  <ThemedText>{email}</ThemedText>
                </View>
              )}
              {specialties.length > 0 && (
                <View style={styles.reviewRow}>
                  <ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Specialties</ThemedText>
                  <ThemedText>{specialties.join(', ')}</ThemedText>
                </View>
              )}
            </SurfaceCard>

            <View style={[styles.infoBox, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
              <Ionicons name="information-circle" size={20} color={palette.tint} />
              <ThemedText style={[styles.infoText, { color: palette.muted }]}>
                You can customize your branding (logo, colors) after creating your academy.
              </ThemedText>
            </View>
          </Animated.View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Clickable onPress={goBack} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="subtitle" style={{ flex: 1, textAlign: 'center' }}>
            Create Academy
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          {steps.map((s, i) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                {
                  backgroundColor: i <= currentStepIndex ? palette.tint : palette.border,
                },
              ]}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>

        {/* Footer buttons */}
        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          {step === 'review' ? (
            <Button onPress={handleCreate} disabled={loading}>
              {loading ? 'Creating...' : 'Create Academy'}
            </Button>
          ) : (
            <Button onPress={goNext} disabled={!canProceed()}>
              Continue
            </Button>
          )}
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  stepContent: {
    gap: Spacing.lg,
  },
  stepHeader: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  stepIcon: {
    width: 64,
    height: 64,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    textAlign: 'center',
  },
  stepSubtitle: {
    textAlign: 'center',
    ...Typography.bodySmall,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    ...Typography.smallSemiBold,
  },
  input: {
    height: 48,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  textArea: {
    minHeight: 100,
    borderRadius: Radii.md,
    padding: Spacing.md,
    ...Typography.body,
    textAlignVertical: 'top',
  },
  specialtiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  specialtyCard: {
    width: '47%',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 2,
    position: 'relative',
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specialtyText: {
    ...Typography.bodySmallSemiBold,
    textAlign: 'center',
  },
  reviewCard: {
    gap: Spacing.sm,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  reviewLabel: {
    ...Typography.small,
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  infoText: {
    flex: 1,
    ...Typography.small,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
});
