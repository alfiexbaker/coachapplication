/**
 * LoginScreen - Authentication entry point using unified form system.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
// import { useEventListener } from 'expo';
// import { VideoView, useVideoPlayer } from 'expo-video';
import { Clickable } from '@/components/primitives/clickable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { FormInput, FormButton } from '@/components/forms';
import { useForm } from '@/hooks/use-form';
import { validators } from '@/utils/validation';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import CoachSignupScreen, { CoachSignupData } from './coach-signup-screen';
import OnboardingScreen from './onboarding-screen';

import { SignupCard, InviteCodeCard, DemoAccountsCard } from './login-screen-sections';
import { Row } from '@/components/primitives';

// Re-export extracted components for backward compat
export { SignupCard, InviteCodeCard, DemoAccountsCard } from './login-screen-sections';
export type {
  SignupCardProps,
  InviteCodeCardProps,
  DemoAccountsCardProps,
} from './login-screen-sections';

type ScreenMode = 'login' | 'signup' | 'coach-signup';

interface LoginFormValues {
  username: string;
  password: string;
}

const LOGIN_VIDEO_URI = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

export default function LoginScreen() {
  const { colors: palette } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { login, error, availableUsers, registerCoach, forgotPassword } = useAuth();

  const [screenMode, setScreenMode] = useState<ScreenMode>('login');
  const [videoFailed, setVideoFailed] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);
  const heroOpacity = useSharedValue(0);
  const heroTranslate = useSharedValue(20);
  const authOpacity = useSharedValue(0);
  const authTranslate = useSharedValue(24);

  const isDesktop = screenWidth >= 980;
  const cardMaxHeight = Math.max(500, Math.min(760, screenHeight - 72));
  const heroTitle = useMemo(
    () => (isDesktop ? 'JUST TRAIN.\nWE HANDLE THE REST.' : 'JUST TRAIN.'),
    [isDesktop],
  );
  // Video disabled — expo-video crashes Expo Go 54.0.6 on simulator (SIGABRT / memory alloc failure).
  // Re-enable once running via development build or Expo Go is updated.
  // const backgroundPlayer = useVideoPlayer(LOGIN_VIDEO_URI, (player) => {
  //   player.loop = true;
  //   player.muted = true;
  //   player.play();
  // });
  // useEventListener(backgroundPlayer, 'statusChange', ({ status }) => {
  //   if (status === 'error') setVideoFailed(true);
  // });
  const videoDisabled = true;

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

  useEffect(() => {
    // Hero fades in first
    heroOpacity.value = withTiming(1, { duration: 420 });
    heroTranslate.value = withTiming(0, { duration: 420 });
    // Auth card fades in 110ms later (stagger)
    authOpacity.value = withDelay(110, withTiming(1, { duration: 480 }));
    authTranslate.value = withDelay(110, withTiming(0, { duration: 480 }));
  }, [authOpacity, authTranslate, heroOpacity, heroTranslate]);

  const handleSignupComplete = (data: CoachSignupData) => {
    const success = registerCoach(data);
    if (success) {
      setScreenMode('login');
    }
  };

  const handleOnboardingComplete = () => {
    // User is already auto-logged in by registerFromOnboarding
  };

  const handleForgotPassword = async () => {
    const typedIdentity = form.values.username.trim();
    const fallbackIdentity = 'coach';
    const rawIdentity = typedIdentity || fallbackIdentity;
    const email = rawIdentity.includes('@') ? rawIdentity : `${rawIdentity}@demo.clubroom.app`;

    await forgotPassword(email);
    Alert.alert(
      'Reset requested',
      `If ${email} exists, password reset instructions have been sent.`,
    );
  };

  const handleUseDemoUser = (user: { username: string; password: string; role: string }) => {
    form.setFieldValue('username', user.username);
    form.setFieldValue('password', user.password);
    form.clearErrors();
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

  const heroAnimatedStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ translateY: heroTranslate.value }],
  }));

  const authAnimatedStyle = useAnimatedStyle(() => ({
    opacity: authOpacity.value,
    transform: [{ translateY: authTranslate.value }],
  }));

  return (
    <View
      style={[styles.safeArea, { backgroundColor: palette.text }]}
    >
      <View style={styles.root}>
        {!videoFailed && !videoDisabled && (
          <VideoView
            player={backgroundPlayer}
            style={styles.backgroundVideo}
            contentFit="cover"
            nativeControls={false}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
          />
        )}

        <View
          style={[
            styles.backdrop,
            {
              backgroundColor: withAlpha(palette.text, videoFailed ? 0.9 : 0.62),
              pointerEvents: 'none',
            },
          ]}
        />
        <View
          style={[
            styles.edgeGlow,
            {
              backgroundColor: withAlpha(palette.tint, 0.26),
              pointerEvents: 'none',
            },
          ]}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.wrapper}
        >
          <ScrollView
            style={styles.pageScroll}
            contentContainerStyle={[
              styles.pageScrollContent,
              isDesktop ? { minHeight: screenHeight - Spacing.md } : null,
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={[styles.layout, isDesktop ? styles.layoutDesktop : styles.layoutMobile]}>
              <ReAnimated.View
                style={[
                  styles.hero,
                  isDesktop ? styles.heroDesktop : styles.heroMobile,
                  heroAnimatedStyle,
                ]}
              >
                <View
                  style={[styles.badge, { backgroundColor: withAlpha(palette.onPrimary, 0.14) }]}
                >
                  <ThemedText style={[styles.badgeText, { color: palette.onPrimary }]}>
                    Clubroom
                  </ThemedText>
                </View>

                <ThemedText
                  style={[
                    styles.heroTitle,
                    {
                      color: palette.onPrimary,
                      fontSize: isDesktop ? 54 : 40,
                      lineHeight: isDesktop ? 62 : 46,
                    },
                  ]}
                >
                  {heroTitle}
                </ThemedText>
                <ThemedText
                  style={[styles.heroSubtitle, { color: withAlpha(palette.onPrimary, 0.84) }]}
                >
                  Find coaches. Book sessions. Track every rep.
                </ThemedText>

                <View style={styles.statementRow}>
                  {['BOOK', 'TRACK', 'IMPROVE'].map((item) => (
                    <View
                      key={item}
                      style={[
                        styles.statementPill,
                        { backgroundColor: withAlpha(palette.onPrimary, 0.14) },
                      ]}
                    >
                      <ThemedText style={[styles.statementText, { color: palette.onPrimary }]}>
                        {item}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </ReAnimated.View>

              <ReAnimated.View
                style={[
                  styles.authDock,
                  isDesktop ? styles.authDockDesktop : styles.authDockMobile,
                  authAnimatedStyle,
                ]}
              >
                <SurfaceCard
                  style={[
                    styles.authCard,
                    {
                      backgroundColor: withAlpha(palette.surface, isDesktop ? 0.93 : 0.97),
                      borderColor: withAlpha(palette.text, 0.1),
                      maxHeight: isDesktop ? cardMaxHeight : undefined,
                    },
                  ]}
                  animateElevation={false}
                >
                  <View style={styles.authContent}>
                    <View>
                      <ThemedText style={styles.authTitle}>Welcome back</ThemedText>
                      <ThemedText style={[styles.authSubtitle, { color: palette.muted }]}>
                        Sign in or create your account.
                      </ThemedText>
                    </View>

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
                        <Clickable onPress={() => void handleForgotPassword()}>
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
                      <ThemedText style={[styles.helper, { color: palette.error }]}>
                        {error}
                      </ThemedText>
                    ) : (
                      <ThemedText style={[styles.helper, { color: palette.muted }]}>
                        Credentials are case-insensitive.
                      </ThemedText>
                    )}

                    <FormButton
                      label="Log in"
                      onPress={form.handleSubmit}
                      disabled={!form.isDirty}
                      loading={form.isSubmitting}
                      size="lg"
                    />

                    <View
                      style={[styles.separator, { backgroundColor: withAlpha(palette.text, 0.1) }]}
                    />

                    <View style={styles.actionsStack}>
                      <SignupCard onPress={() => setScreenMode('signup')} palette={palette} />
                      <InviteCodeCard
                        onPress={() => setScreenMode('coach-signup')}
                        palette={palette}
                      />
                    </View>

                    <Clickable
                      style={[
                        styles.demoToggle,
                        {
                          backgroundColor: withAlpha(palette.text, 0.03),
                          borderColor: withAlpha(palette.text, 0.1),
                        },
                      ]}
                      onPress={() => setShowDemoAccounts((prev) => !prev)}
                    >
                      <ThemedText style={styles.demoToggleLabel}>Demo credentials</ThemedText>
                      <Ionicons
                        name={showDemoAccounts ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={palette.muted}
                      />
                    </Clickable>

                    {showDemoAccounts ? (
                      <DemoAccountsCard
                        users={availableUsers}
                        palette={palette}
                        onSelectUser={handleUseDemoUser}
                      />
                    ) : null}
                  </View>
                </SurfaceCard>
              </ReAnimated.View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
  backgroundVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  edgeGlow: {
    position: 'absolute',
    top: -120,
    right: -120,
    width: '72%',
    maxWidth: 360,
    aspectRatio: 1,
    borderRadius: Radii.full,
    opacity: 0.45,
  },
  wrapper: {
    flex: 1,
  },
  pageScroll: {
    flex: 1,
  },
  pageScrollContent: {
    flexGrow: 1,
    width: '100%',
  },
  layout: {
    flexGrow: 1,
    width: '100%',
    gap: Spacing.lg,
  },
  layoutDesktop: {
    flexDirection: 'row',
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.xl,
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },
  layoutMobile: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    justifyContent: 'flex-start',
  },
  hero: {
    gap: Spacing.md,
  },
  heroDesktop: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 640,
  },
  heroMobile: {
    paddingTop: Spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  badgeText: {
    ...Typography.caption,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  heroTitle: {
    ...Typography.display,
    fontWeight: '700',
    maxWidth: 700,
  },
  heroSubtitle: {
    ...Typography.subheading,
    maxWidth: 500,
  },
  statementRow: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statementPill: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statementText: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 1,
  },
  authDock: {
    width: '100%',
  },
  authDockDesktop: {
    width: '100%',
    maxWidth: 470,
    justifyContent: 'center',
  },
  authDockMobile: {
    width: '100%',
    marginTop: Spacing.md,
  },
  authCard: {
    borderWidth: 1,
    borderRadius: Radii['2xl'],
    padding: Spacing.md,
    minHeight: 0,
  },
  authContent: {
    gap: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  authTitle: {
    ...Typography.title,
  },
  authSubtitle: {
    ...Typography.bodySmall,
    marginTop: Spacing.xxs,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  labelRow: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: -Spacing.sm,
  },
  forgotLink: {
    ...Typography.bodySmallSemiBold,
  },
  helper: {
    ...Typography.bodySmall,
    marginTop: -Spacing.xs,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  actionsStack: {
    gap: Spacing.sm,
  },
  demoToggle: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  demoToggleLabel: {
    ...Typography.bodySmallSemiBold,
  },
});
