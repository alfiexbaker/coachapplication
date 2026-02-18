/**
 * LoginScreen — Clean, self-contained authentication screen.
 *
 * Deliberately keeps imports minimal to avoid a Hermes lazy-compile
 * SIGABRT that occurs with the full dependency tree on iOS simulator
 * (Expo 54 / Hermes / RN 0.81).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
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

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';

// ─── Types ──────────────────────────────────────────────────────────────────

type ScreenMode = 'login' | 'signup' | 'coach-signup';

// ─── Component ──────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { colors: palette } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { login, registerCoach, error, availableUsers } = useAuth();

  const [screenMode, setScreenMode] = useState<ScreenMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── Animations ────────────────────────────────────────────────────────
  const cardOpacity = useSharedValue(0);
  const cardTranslate = useSharedValue(24);

  useEffect(() => {
    cardOpacity.value = withDelay(100, withTiming(1, { duration: 500 }));
    cardTranslate.value = withDelay(100, withTiming(0, { duration: 500 }));
  }, [cardOpacity, cardTranslate]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslate.value }],
  }));

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleLogin = useCallback(async () => {
    if (!username.trim() || !password.trim()) return;
    setSubmitting(true);
    try {
      await login(username.trim(), password.trim());
    } finally {
      setSubmitting(false);
    }
  }, [username, password, login]);

  const handleDemoSelect = useCallback(
    (user: { username: string; password: string }) => {
      setUsername(user.username);
      setPassword(user.password);
    },
    [],
  );

  const isDesktop = screenWidth >= 980;
  const canSubmit = username.trim().length > 0 && password.trim().length > 0 && !submitting;

  // ── Signup / Coach signup — lazy load to keep this file lean ─────────
  if (screenMode === 'signup') {
    const OnboardingScreen = require('./onboarding-screen').default;
    return (
      <OnboardingScreen
        onComplete={() => {}}
        onBackToLogin={() => setScreenMode('login')}
      />
    );
  }

  if (screenMode === 'coach-signup') {
    const CoachSignupScreen = require('./coach-signup-screen').default;
    return (
      <CoachSignupScreen
        onSignupComplete={(data: { fullName: string; email: string; phone: string; password: string; inviteCode: string; schoolId: string; schoolName: string }) => {
          // registerCoach calls setCurrentUser which makes isAuthenticated=true,
          // triggering RootNavigation to swap LoginScreen for the authenticated Stack.
          registerCoach(data);
        }}
        onBackToLogin={() => setScreenMode('login')}
      />
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: palette.text }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
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

            {/* Username */}
            <View style={styles.fieldWrap}>
              <ThemedText style={[styles.label, { color: palette.muted }]}>Username</ThemedText>
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
                onChangeText={setUsername}
                placeholder="e.g. coach"
                placeholderTextColor={withAlpha(palette.text, 0.35)}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
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
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={withAlpha(palette.text, 0.35)}
                  secureTextEntry={!showPassword}
                  returnKeyType="go"
                  onSubmitEditing={handleLogin}
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
            {error ? (
              <ThemedText style={[styles.hint, { color: palette.error }]}>{error}</ThemedText>
            ) : (
              <ThemedText style={[styles.hint, { color: palette.muted }]}>
                Credentials are case-insensitive.
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

            {/* Demo accounts */}
            <Pressable
              onPress={() => setShowDemo((p) => !p)}
              style={[styles.demoToggle, { borderColor: withAlpha(palette.text, 0.1) }]}
            >
              <ThemedText style={[styles.demoToggleText, { color: palette.muted }]}>
                {showDemo ? 'Hide demo credentials' : 'Show demo credentials'}
              </ThemedText>
            </Pressable>

            {showDemo &&
              availableUsers.slice(0, 4).map((user) => (
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
  passwordInput: { paddingRight: 64 },
  eyeBtn: {
    position: 'absolute',
    right: Spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeText: { ...Typography.bodySmallSemiBold },
  hint: { ...Typography.bodySmall, marginTop: -Spacing.xs },
  // Buttons
  btn: {
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: { ...Typography.bodySemiBold },
  divider: { height: StyleSheet.hairlineWidth },
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
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  roleText: { ...Typography.caption, textTransform: 'uppercase' },
  demoCred: { ...Typography.small, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
});
