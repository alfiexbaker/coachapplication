import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import CoachSignupScreen, { CoachSignupData } from './coach-signup-screen';
import OnboardingScreen from './onboarding-screen';

type ScreenMode = 'login' | 'signup' | 'coach-signup';

export default function LoginScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { login, error, availableUsers, registerCoach } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [screenMode, setScreenMode] = useState<ScreenMode>('login');

  const handleSubmit = () => {
    if (!username || !password) {
      return;
    }

    login(username, password);
  };

  const handleSignupComplete = (data: CoachSignupData) => {
    const success = registerCoach(data);
    if (success) {
      setScreenMode('login');
    }
  };

  const handleOnboardingComplete = () => {
    // For now, just go back to login
    // In production, this would auto-login the new user
    setScreenMode('login');
  };

  const disabled = !username || !password;

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
          <View style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Username</ThemedText>
            <TextInput
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="e.g. coach"
              placeholderTextColor={palette.muted}
              style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
              returnKeyType="next"
              onSubmitEditing={() => handleSubmit()}
            />
          </View>
          <View style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Password</ThemedText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={palette.muted}
              style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
          </View>
          {error ? (
            <ThemedText style={[styles.helper, { color: Colors[scheme].error }]}>{error}</ThemedText>
          ) : (
            <ThemedText style={styles.helper}>Credentials are case-insensitive.</ThemedText>
          )}
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: disabled
                  ? palette.border
                  : pressed
                    ? palette.tintPressed
                    : palette.tint,
                opacity: pressed || disabled ? 0.9 : 1,
              },
            ]}
            disabled={disabled}
            onPress={handleSubmit}>
            <ThemedText style={styles.buttonLabel} lightColor="#FFFFFF" darkColor="#000000">
              Continue
            </ThemedText>
          </Pressable>
        </SurfaceCard>

        {/* Create Account Card */}
        <Pressable
          style={[styles.signupCard, { backgroundColor: palette.tint }]}
          onPress={() => setScreenMode('signup')}>
          <View style={styles.signupCardContent}>
            <Ionicons name="person-add" size={24} color="#fff" />
            <View style={styles.signupCardText}>
              <ThemedText style={styles.signupTitle}>New to Clubroom?</ThemedText>
              <ThemedText style={styles.signupSubtitle}>Create your free account</ThemedText>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
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
  label: {
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  helper: {
    fontSize: 14,
    opacity: 0.9,
  },
  button: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  buttonLabel: {
    fontWeight: '600',
  },
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
    gap: 2,
  },
  signupTitle: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  signupSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
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
    paddingVertical: 2,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(99,102,241,0.15)',
  },
  roleBadgeText: {
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  credentialValue: {
    fontFamily: 'monospace',
  },
});
