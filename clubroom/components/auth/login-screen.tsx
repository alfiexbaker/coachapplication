/**
 * LoginScreen - Authentication entry point using unified form system.
 *
 * Uses useForm for credential state and validation.
 * Uses FormInput for consistent input styling.
 * Uses FormButton for consistent button styling.
 */

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { FormInput, FormButton } from '@/components/forms';
import { useForm } from '@/hooks/use-form';
import { validators } from '@/utils/validation';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import CoachSignupScreen, { CoachSignupData } from './coach-signup-screen';
import OnboardingScreen from './onboarding-screen';

type ScreenMode = 'login' | 'signup' | 'coach-signup';

interface LoginFormValues {
  username: string;
  password: string;
}

export default function LoginScreen() {
  const { colors: palette } = useTheme();
  const { login, error, availableUsers, registerCoach } = useAuth();

  const [screenMode, setScreenMode] = useState<ScreenMode>('login');

  const form = useForm<LoginFormValues>({
    initialValues: {
      username: '',
      password: '',
    },
    validators: {
      username: validators.required('Username is required'),
      password: validators.required('Password is required'),
    },
    onSubmit: async (values) => {
      login(values.username, values.password);
    },
  });

  const handleSignupComplete = (data: CoachSignupData) => {
    const success = registerCoach(data);
    if (success) {
      setScreenMode('login');
    }
  };

  const handleOnboardingComplete = () => {
    // User is already auto-logged in by registerFromOnboarding
    // The auth gate will automatically redirect to the main app
    // No action needed here - the AuthProvider has already set currentUser
  };

  // Show onboarding screen for new signups
  if (screenMode === 'signup') {
    return (
      <OnboardingScreen
        onComplete={handleOnboardingComplete}
        onBackToLogin={() => setScreenMode('login')}
      />
    );
  }

  // Show legacy coach signup screen
  if (screenMode === 'coach-signup') {
    return (
      <CoachSignupScreen
        onSignupComplete={handleSignupComplete}
        onBackToLogin={() => setScreenMode('login')}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrapper}>
        <SurfaceCard style={styles.loginCard}>
          <ThemedText type="eyebrow" style={styles.eyebrow}>
            Demo build · Auth gate
          </ThemedText>
          <ThemedText type="title" style={styles.title}>
            Sign in to Clubroom
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Use one of the preloaded accounts below to explore every screen from a specific
            perspective.
          </ThemedText>
          <FormInput
            label="Username"
            placeholder="e.g. coach"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            {...form.getFieldProps('username')}
          />

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <View />
              <Pressable onPress={() => setScreenMode('login')}>
                <ThemedText style={[styles.forgotLink, { color: palette.tint }]}>
                  Forgot password?
                </ThemedText>
              </Pressable>
            </View>
            <FormInput
              label="Password"
              placeholder="••••••••"
              type="password"
              returnKeyType="go"
              {...form.getFieldProps('password')}
            />
          </View>

          {error ? (
            <ThemedText style={[styles.helper, { color: palette.error }]}>{error}</ThemedText>
          ) : (
            <ThemedText style={styles.helper}>Credentials are case-insensitive.</ThemedText>
          )}

          <FormButton
            label="Continue"
            onPress={form.handleSubmit}
            disabled={!form.isDirty}
            loading={form.isSubmitting}
          />
        </SurfaceCard>

        {/* Create Account Card */}
        <Pressable
          style={[styles.signupCard, { backgroundColor: palette.tint }]}
          onPress={() => setScreenMode('signup')}>
          <View style={styles.signupCardContent}>
            <Ionicons name="person-add" size={24} color={palette.onPrimary} />
            <View style={styles.signupCardText}>
              <ThemedText style={[styles.signupTitle, { color: palette.onPrimary }]}>New to Clubroom?</ThemedText>
              <ThemedText style={styles.signupSubtitle}>Create your free account</ThemedText>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={20} color={palette.onPrimary} />
        </Pressable>

        {/* Legacy Coach Signup (with invite code) */}
        <Pressable
          style={[styles.coachSignupCard, { backgroundColor: palette.card }]}
          onPress={() => setScreenMode('coach-signup')}>
          <ThemedText type="subtitle" style={styles.coachSignupTitle}>
            Have an invite code?
          </ThemedText>
          <ThemedText style={styles.coachSignupText}>
            Join your school or academy
          </ThemedText>
          <ThemedText style={[styles.coachSignupCTA, { color: palette.tint }]}>
            Use Invite Code →
          </ThemedText>
        </Pressable>

        <SurfaceCard style={styles.credentialsCard}>
          <ThemedText type="subtitle" style={styles.credentialsTitle}>
            Preloaded accounts
          </ThemedText>
          {availableUsers.slice(0, 4).map((user) => (
            <View key={user.username} style={styles.credentialsRow}>
              <View style={styles.roleBadge}>
                <ThemedText style={styles.roleBadgeText}>{user.role}</ThemedText>
              </View>
              <ThemedText style={styles.credentialValue}>
                {user.username} / {user.password}
              </ThemedText>
            </View>
          ))}
        </SurfaceCard>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.lg,
    justifyContent: 'center',
  },
  loginCard: {
    gap: Spacing.md,
  },
  eyebrow: {
    opacity: 0.7,
  },
  title: {
    textAlign: 'left',
  },
  subtitle: {
    opacity: 0.8,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: -Spacing.sm,
  },
  forgotLink: { ...Typography.bodySmallSemiBold },
  helper: { ...Typography.bodySmall, opacity: 0.9 },
  signupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: Radii.lg,
  },
  signupCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  signupCardText: {
    gap: Spacing.micro,
  },
  signupTitle: { ...Typography.subheading },
  signupSubtitle: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.8)' },
  coachSignupCard: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    gap: Spacing.xs,
  },
  coachSignupTitle: {
    textAlign: 'left',
  },
  coachSignupText: {
    opacity: 0.8,
  },
  coachSignupCTA: {
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  credentialsCard: {
    gap: Spacing.sm,
  },
  credentialsTitle: {
    textAlign: 'left',
  },
  credentialsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(99,102,241,0.15)',
  },
  roleBadgeText: { ...Typography.caption, textTransform: 'uppercase' },
  credentialValue: {
    fontFamily: 'monospace',
  },
});
