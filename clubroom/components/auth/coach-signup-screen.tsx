import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { inviteCodes } from '@/constants/mock-data';

interface CoachSignupScreenProps {
  onSignupComplete: (data: CoachSignupData) => void;
  onBackToLogin: () => void;
}

export interface CoachSignupData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  inviteCode: string;
  schoolId: string;
  schoolName: string;
}

export default function CoachSignupScreen({ onSignupComplete, onBackToLogin }: CoachSignupScreenProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [inviteCode, setInviteCode] = useState('');
  const [inviteValidated, setInviteValidated] = useState(false);
  const [validatedSchool, setValidatedSchool] = useState<{ id: string; name: string } | null>(null);
  const [inviteError, setInviteError] = useState('');

  // Coach details
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');

  const validateInviteCode = () => {
    const code = inviteCode.trim().toUpperCase();
    const invite = inviteCodes.find((inv) => inv.code === code && inv.status === 'active');

    if (!invite) {
      setInviteError('Invalid or expired invite code');
      setInviteValidated(false);
      return;
    }

    if (invite.currentUses >= invite.maxUses) {
      setInviteError('This invite code has reached its maximum uses');
      setInviteValidated(false);
      return;
    }

    // Check expiration
    if (new Date(invite.expiresAt) < new Date()) {
      setInviteError('This invite code has expired');
      setInviteValidated(false);
      return;
    }

    setInviteError('');
    setInviteValidated(true);
    setValidatedSchool({ id: invite.schoolId, name: invite.schoolName });
  };

  const handleSubmit = () => {
    setFormError('');

    if (!fullName || !email || !phone || !password || !confirmPassword) {
      setFormError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    if (!inviteValidated || !validatedSchool) {
      setFormError('Please validate your invite code first');
      return;
    }

    onSignupComplete({
      fullName,
      email,
      phone,
      password,
      inviteCode: inviteCode.trim().toUpperCase(),
      schoolId: validatedSchool.id,
      schoolName: validatedSchool.name,
    });
  };

  const isFormValid =
    inviteValidated &&
    fullName &&
    email &&
    phone &&
    password &&
    confirmPassword &&
    password === confirmPassword &&
    password.length >= 6;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrapper}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <SurfaceCard style={styles.card}>
            <ThemedText type="eyebrow" style={styles.eyebrow}>
              Coach Registration
            </ThemedText>
            <ThemedText type="title" style={styles.title}>
              Join Your School
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Enter your invite code from your school to get started.
            </ThemedText>

            {/* Invite Code Section */}
            <View style={styles.inviteSection}>
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.label}>School Invite Code</ThemedText>
                <View style={styles.inviteRow}>
                  <TextInput
                    value={inviteCode}
                    onChangeText={(text) => {
                      setInviteCode(text);
                      setInviteValidated(false);
                      setInviteError('');
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder="HIGHPRESS2024"
                    placeholderTextColor={palette.muted}
                    style={[
                      styles.input,
                      styles.inviteInput,
                      {
                        borderColor: inviteValidated ? palette.success : palette.border,
                        backgroundColor: palette.card,
                      },
                    ]}
                    returnKeyType="go"
                    onSubmitEditing={validateInviteCode}
                    editable={!inviteValidated}
                  />
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.validateButton,
                      {
                        backgroundColor: inviteValidated
                          ? palette.success
                          : pressed
                            ? palette.tintPressed
                            : palette.tint,
                        opacity: pressed || !inviteCode ? 0.7 : 1,
                      },
                    ]}
                    disabled={!inviteCode || inviteValidated}
                    onPress={validateInviteCode}>
                    <ThemedText
                      style={styles.validateButtonText}
                      lightColor="#FFFFFF"
                      darkColor="#000000">
                      {inviteValidated ? '✓' : 'Verify'}
                    </ThemedText>
                  </Pressable>
                </View>
                {inviteError ? (
                  <ThemedText style={[styles.helper, { color: palette.error }]}>{inviteError}</ThemedText>
                ) : inviteValidated && validatedSchool ? (
                  <ThemedText style={[styles.helper, { color: palette.success }]}>
                    ✓ Verified for {validatedSchool.name}
                  </ThemedText>
                ) : null}
              </View>
            </View>

            {/* Coach Details Form (only show after validation) */}
            {inviteValidated && (
              <>
                <View style={styles.divider} />

                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.label}>Full Name</ThemedText>
                  <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="John Smith"
                    placeholderTextColor={palette.muted}
                    style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.label}>Email</ThemedText>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="coach@email.com"
                    placeholderTextColor={palette.muted}
                    style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.label}>Phone</ThemedText>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    placeholder="+1 (555) 123-4567"
                    placeholderTextColor={palette.muted}
                    style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
                    returnKeyType="next"
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
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.label}>Confirm Password</ThemedText>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    placeholder="••••••••"
                    placeholderTextColor={palette.muted}
                    style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
                    returnKeyType="go"
                    onSubmitEditing={handleSubmit}
                  />
                </View>

                {formError ? (
                  <ThemedText style={[styles.helper, { color: palette.error }]}>{formError}</ThemedText>
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.button,
                    {
                      backgroundColor: !isFormValid
                        ? palette.border
                        : pressed
                          ? palette.tintPressed
                          : palette.tint,
                      opacity: pressed || !isFormValid ? 0.9 : 1,
                    },
                  ]}
                  disabled={!isFormValid}
                  onPress={handleSubmit}>
                  <ThemedText style={styles.buttonLabel} lightColor="#FFFFFF" darkColor="#000000">
                    Create Coach Account
                  </ThemedText>
                </Pressable>
              </>
            )}
          </SurfaceCard>

          <Pressable onPress={onBackToLogin} style={styles.backButton}>
            <ThemedText style={styles.backButtonText}>Already have an account? Sign in</ThemedText>
          </Pressable>
        </ScrollView>
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
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  card: {
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
  inviteSection: {
    paddingTop: Spacing.xs,
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
  inviteRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  inviteInput: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
  validateButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  validateButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  helper: {
    fontSize: 14,
    opacity: 0.9,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: Spacing.sm,
  },
  button: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  buttonLabel: {
    fontWeight: '600',
    fontSize: 16,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  backButtonText: {
    opacity: 0.7,
  },
});
