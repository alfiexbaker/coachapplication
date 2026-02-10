/**
 * LoginScreen - Authentication entry point using unified form system.
 */

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { FormInput, FormButton } from '@/components/forms';
import { useForm } from '@/hooks/use-form';
import { validators } from '@/utils/validation';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import CoachSignupScreen, { CoachSignupData } from './coach-signup-screen';
import OnboardingScreen from './onboarding-screen';

// Re-export extracted components for backward compat
export { SignupCard, InviteCodeCard, DemoAccountsCard } from './login-screen-sections';
export type { SignupCardProps, InviteCodeCardProps, DemoAccountsCardProps } from './login-screen-sections';

import { SignupCard, InviteCodeCard, DemoAccountsCard } from './login-screen-sections';
import { Row } from '@/components/primitives';

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
  };

  if (screenMode === 'signup') {
    return (
      <OnboardingScreen
        onComplete={handleOnboardingComplete}
        onBackToLogin={() => setScreenMode('login')}
      />
    );
  }

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
            <Row style={styles.labelRow}>
              <View />
              <Clickable onPress={() => setScreenMode('login')}>
                <ThemedText style={[styles.forgotLink, { color: palette.tint }]}>
                  Forgot password?
                </ThemedText>
              </Clickable>
            </Row>
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

        <SignupCard onPress={() => setScreenMode('signup')} palette={palette} />
        <InviteCodeCard onPress={() => setScreenMode('coach-signup')} palette={palette} />
        <DemoAccountsCard users={availableUsers} palette={palette} />
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: -Spacing.sm,
  },
  forgotLink: { ...Typography.bodySmallSemiBold },
  helper: { ...Typography.bodySmall, opacity: 0.9 },
});
