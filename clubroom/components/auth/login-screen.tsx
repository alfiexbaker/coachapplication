/**
 * LoginScreen — Clean, self-contained authentication screen.
 *
 * Deliberately keeps imports minimal to avoid a Hermes lazy-compile
 * SIGABRT that occurs with the full dependency tree on iOS simulator
 * (Expo 54 / Hermes / RN 0.81).
 */

import { Suspense, lazy, useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';

import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { api as apiConfig } from '@/constants/config';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { buildDemoCredentialRows, buildDemoRoleEntries } from '@/utils/demo-role-entry';
import { DemoRoleEntryCard } from './login-screen-sections';

import { runAsyncFinally } from '@/utils/async-control';

// ─── Types ──────────────────────────────────────────────────────────────────

type ScreenMode = 'login' | 'signup' | 'coach-signup';

const LazyOnboardingScreen = lazy(() => import('./onboarding-screen'));
const LazyCoachSignupScreen = lazy(() => import('./coach-signup-screen'));
const MOCK_API_MODE = apiConfig.useMock;

// ─── Component ──────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { colors: palette } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { login, registerCoach, error, availableUsers } = useAuth();

  const [screenMode, setScreenMode] = useState<ScreenMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const displayError = error || localError;

  // ── Animations ────────────────────────────────────────────────────────
  const cardOpacity = useSharedValue(0);
  const cardTranslate = useSharedValue(24);

  useEffect(() => {
    cardOpacity.set(withDelay(100, withTiming(1, { duration: 500 })));
    cardTranslate.set(withDelay(100, withTiming(0, { duration: 500 })));
  }, [cardOpacity, cardTranslate]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslate.value }],
  }));

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setLocalError(null);
    if (!username.trim() || !password.trim()) {
      setLocalError('Please enter your email or username and password');
      return;
    }
    setSubmitting(true);

    await runAsyncFinally(async () => {
      await login(username.trim(), password.trim());
    }, () => {
      setSubmitting(false);
    });
  };

  const handleUsernameChange = (text: string) => {
    setUsername(text);
    if (displayError) setLocalError(null);
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (displayError) setLocalError(null);
  };

  const handleDemoSelect = (user: { username: string; password: string }) => {
    setUsername(user.username);
    setPassword(user.password);
  };

  const handleRoleEntry = async (entry: { username: string; password: string; initialRoute?: unknown }) => {
    if (submitting) return;
    setLocalError(null);
    setUsername(entry.username);
    setPassword(entry.password);
    setSubmitting(true);

    await runAsyncFinally(async () => {
      const success = await login(entry.username, entry.password);
      if (success && entry.initialRoute) {
        router.replace(entry.initialRoute as never);
      }
    }, () => {
      setSubmitting(false);
    });
  };

  const isDesktop = screenWidth >= 980;
  const canSubmit = username.trim().length > 0 && password.trim().length > 0 && !submitting;
  const demoRoleEntries = buildDemoRoleEntries(availableUsers);
  const demoCredentialRows = buildDemoCredentialRows(availableUsers);
  const showRoleEntry = __DEV__ || availableUsers.length > 0;
  const loginHint = MOCK_API_MODE
    ? 'e.g. coach1 or user1'
    : 'e.g. coach1 or amelia.shaw@clubroom.demo';
  const lazyFallback = (
    <View style={[styles.lazyFallback, { backgroundColor: palette.surface }]}>
      <ThemedText style={[styles.hint, { color: palette.muted }]}>Loading…</ThemedText>
    </View>
  );

  // ── Signup / Coach signup — lazy load to keep this file lean ─────────
  if (screenMode === 'signup') {
    return (
      <Suspense fallback={lazyFallback}>
        <LazyOnboardingScreen
          onComplete={() => {}}
          onBackToLogin={() => setScreenMode('login')}
        />
      </Suspense>
    );
  }

  if (screenMode === 'coach-signup') {
    return (
      <Suspense fallback={lazyFallback}>
        <LazyCoachSignupScreen
          signupError={error}
          onSignupComplete={async (data: { fullName: string; email: string; phone: string; password: string; inviteCode: string; schoolId: string; schoolName: string }) => {
            // registerCoach calls setCurrentUser which makes isAuthenticated=true,
            // triggering RootNavigation to swap LoginScreen for the authenticated Stack.
            await registerCoach(data);
          }}
          onBackToLogin={() => setScreenMode('login')}
        />
      </Suspense>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: palette.text }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces
        >
          {/* ── Hero ──────────────────────────────────────────────── */}
          <View style={styles.hero}>
            <View style={[styles.badge, { backgroundColor: withAlpha(palette.onPrimary, 0.14) }]}>
              <ThemedText style={[styles.badgeLabel, { color: palette.onPrimary }]}>
                Clubroom
              </ThemedText>
            </View>
            <ThemedText style={[styles.heroTitle, { color: palette.onPrimary }]}>
              JUST TRAIN.
            </ThemedText>
            <ThemedText style={[styles.heroSub, { color: withAlpha(palette.onPrimary, 0.8) }]}>
              Find coaches. Book sessions. Track every rep.
            </ThemedText>
          </View>

          {/* ── Auth Card ─────────────────────────────────────────── */}
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: palette.surface,
                borderColor: withAlpha(palette.text, 0.08),
                maxWidth: isDesktop ? 440 : undefined,
              },
              cardStyle,
            ]}
          >
            <ThemedText style={styles.cardTitle}>Welcome back</ThemedText>
            <ThemedText style={[styles.cardSub, { color: palette.muted }]}>
              Sign in or create your account.
            </ThemedText>

            {/* Email / username */}
            <View style={styles.fieldWrap}>
              <ThemedText style={[styles.label, { color: palette.muted }]}>Email or username</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: withAlpha(palette.text, 0.04),
                    borderColor: withAlpha(palette.text, 0.12),
                    color: palette.text,
                  },
                ]}
                value={username}
                onChangeText={handleUsernameChange}
                placeholder={loginHint}
                placeholderTextColor={withAlpha(palette.text, 0.35)}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                maxLength={80}
              />
            </View>

            {/* Password */}
            <View style={styles.fieldWrap}>
              <ThemedText style={[styles.label, { color: palette.muted }]}>Password</ThemedText>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    {
                      backgroundColor: withAlpha(palette.text, 0.04),
                      borderColor: withAlpha(palette.text, 0.12),
                      color: palette.text,
                    },
                  ]}
                  value={password}
                  onChangeText={handlePasswordChange}
                  placeholder="••••••••"
                  placeholderTextColor={withAlpha(palette.text, 0.35)}
                  secureTextEntry={!showPassword}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
                  maxLength={100}
                />
                <Pressable
                  onPress={() => setShowPassword((p) => !p)}
                  style={styles.eyeBtn}
                  hitSlop={12}
                >
                  <ThemedText style={[styles.eyeText, { color: palette.muted }]}>
                    {showPassword ? 'Hide' : 'Show'}
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            {/* Error / hint */}
            {displayError ? (
              <View style={[styles.errorCard, { backgroundColor: withAlpha(palette.error, 0.08) }]}>
                <Ionicons name="alert-circle" size={18} color={palette.error} />
                <ThemedText style={[styles.hint, { color: palette.error, flex: 1 }]}>{displayError}</ThemedText>
              </View>
            ) : (
              <ThemedText style={[styles.hint, { color: palette.muted }]}>
                {MOCK_API_MODE
                  ? 'Mock mode accepts the seeded username for the active story.'
                  : 'API mode accepts the seeded username or the seeded email.'}
              </ThemedText>
            )}

            {/* Login button */}
            <Pressable
              onPress={handleLogin}
              disabled={!canSubmit}
              style={[
                styles.btn,
                {
                  backgroundColor: canSubmit ? palette.tint : withAlpha(palette.tint, 0.4),
                },
              ]}
            >
              <ThemedText style={[styles.btnLabel, { color: palette.onPrimary }]}>
                {submitting ? 'Signing in...' : 'Log in'}
              </ThemedText>
            </Pressable>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: withAlpha(palette.text, 0.08) }]} />

            {showRoleEntry && demoRoleEntries.length > 0 ? (
              <View style={styles.roleEntrySection}>
                <ThemedText style={styles.sectionTitle}>Demo role entry</ThemedText>
                <ThemedText style={[styles.hint, { color: palette.muted }]}>
                  Start from a named seeded story instead of remembering credentials.
                </ThemedText>
                <View style={styles.roleEntryGrid}>
                  {demoRoleEntries.map((entry) => (
                    <DemoRoleEntryCard
                      key={entry.id}
                      entry={entry}
                      palette={palette}
                      onPress={() => void handleRoleEntry(entry)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {/* Create account / Invite code */}
            <Pressable
              onPress={() => setScreenMode('signup')}
              style={[styles.secondaryBtn, { borderColor: withAlpha(palette.tint, 0.2) }]}
            >
              <ThemedText style={[styles.secondaryLabel, { color: palette.tint }]}>
                Create account
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setScreenMode('coach-signup')}
              style={[styles.secondaryBtn, { borderColor: withAlpha(palette.text, 0.12) }]}
            >
              <ThemedText style={[styles.secondaryLabel, { color: palette.text }]}>
                Use invite code
              </ThemedText>
            </Pressable>

            {/* Demo accounts — DEV builds only */}
            {__DEV__ && (
              <>
                <Pressable
                  onPress={() => setShowDemo((p) => !p)}
                  style={[styles.demoToggle, { borderColor: withAlpha(palette.text, 0.1) }]}
                >
                  <ThemedText style={[styles.demoToggleText, { color: palette.muted }]}>
                    {showDemo ? 'Hide demo credentials' : 'Show demo credentials (DEV ONLY)'}
                  </ThemedText>
                </Pressable>

                {showDemo &&
                  demoCredentialRows.map((user) => (
                    <Pressable
                      key={user.username}
                      onPress={() => handleDemoSelect(user)}
                      style={[styles.demoRow, { borderBottomColor: withAlpha(palette.text, 0.06) }]}
                    >
                      <View style={[styles.rolePill, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                        <ThemedText style={[styles.roleText, { color: palette.tint }]}>
                          {user.role}
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.demoCred, { color: palette.text }]}>
                        {user.username} / {user.password}
                      </ThemedText>
                    </Pressable>
                  ))}
              </>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Re-exports for backward compat (used by other files)
export { SignupCard, InviteCodeCard, DemoAccountsCard } from './login-screen-sections';
export type {
  SignupCardProps,
  InviteCodeCardProps,
  DemoAccountsCardProps,
} from './login-screen-sections';

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  lazyFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  // Hero
  hero: {
    paddingTop: Spacing['3xl'],
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  badgeLabel: {
    ...Typography.caption,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  heroTitle: {
    ...Typography.display,
    fontWeight: '700',
  },
  heroSub: {
    ...Typography.subheading,
  },
  // Card
  card: {
    borderRadius: Radii['2xl'],
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  cardTitle: {
    ...Typography.title,
  },
  cardSub: {
    ...Typography.bodySmall,
    marginTop: -Spacing.xs,
  },
  // Fields
  fieldWrap: { gap: Spacing.xxs },
  label: { ...Typography.caption },
  input: {
    height: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    ...Typography.body,
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: Spacing['3xl'] },
  eyeBtn: {
    position: 'absolute',
    right: Spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeText: { ...Typography.bodySmallSemiBold },
  hint: { ...Typography.bodySmall, marginTop: -Spacing.xs },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: -Spacing.xs,
  },
  // Buttons
  btn: {
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: { ...Typography.bodySemiBold },
  divider: { height: StyleSheet.hairlineWidth },
  roleEntrySection: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.bodySemiBold,
  },
  roleEntryGrid: {
    gap: Spacing.sm,
  },
  secondaryBtn: {
    height: 44,
    borderRadius: Radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: { ...Typography.bodySemiBold },
  // Demo
  demoToggle: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  demoToggleText: { ...Typography.bodySmallSemiBold },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rolePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  roleText: { ...Typography.caption, textTransform: 'uppercase' },
  demoCred: { ...Typography.small, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
});
