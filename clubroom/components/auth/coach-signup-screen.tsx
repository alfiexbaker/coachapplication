import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  INVITE_CODES,
  InviteCodeSection,
  CoachFormFields,
  SignupSubmitButton,
} from './coach-signup-sections';

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

export default function CoachSignupScreen({
  onSignupComplete,
  onBackToLogin,
}: CoachSignupScreenProps) {
  const { colors: palette } = useTheme();

  const [inviteCode, setInviteCode] = useState('');
  const [inviteValidated, setInviteValidated] = useState(false);
  const [validatedSchool, setValidatedSchool] = useState<{ id: string; name: string } | null>(null);
  const [inviteError, setInviteError] = useState('');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');

  const validateInviteCode = () => {
    const code = inviteCode.trim().toUpperCase();
    const invite = INVITE_CODES.find((inv) => inv.code === code && inv.status === 'active');

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

  const handleCodeChange = (text: string) => {
    setInviteCode(text);
    setInviteValidated(false);
    setInviteError('');
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
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrapper}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SurfaceCard style={styles.card}>
            <ThemedText type="eyebrow" style={styles.eyebrow}>
              Coach Registration
            </ThemedText>
            <ThemedText type="title" style={styles.title}>
              Join Your School
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Enter your invite code from your school.
            </ThemedText>

            <InviteCodeSection
              inviteCode={inviteCode}
              onChangeCode={handleCodeChange}
              onValidate={validateInviteCode}
              inviteValidated={inviteValidated}
              inviteError={inviteError}
              validatedSchoolName={validatedSchool?.name}
              palette={palette}
            />

            {inviteValidated && (
              <>
                <Divider spacing={Spacing.sm} />
                <CoachFormFields
                  fullName={fullName}
                  email={email}
                  phone={phone}
                  password={password}
                  confirmPassword={confirmPassword}
                  onChangeFullName={setFullName}
                  onChangeEmail={setEmail}
                  onChangePhone={setPhone}
                  onChangePassword={setPassword}
                  onChangeConfirmPassword={setConfirmPassword}
                  onSubmit={handleSubmit}
                  palette={palette}
                />
                {formError ? (
                  <ThemedText style={{ color: palette.error, opacity: 0.9 }}>
                    {formError}
                  </ThemedText>
                ) : null}
                <SignupSubmitButton
                  isValid={!!isFormValid}
                  onPress={handleSubmit}
                  palette={palette}
                />
              </>
            )}
          </SurfaceCard>

          <Clickable onPress={onBackToLogin} style={styles.backButton}>
            <ThemedText style={styles.backButtonText}>Already have an account? Sign in</ThemedText>
          </Clickable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  wrapper: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.lg },
  card: { gap: Spacing.md },
  eyebrow: { opacity: 0.7 },
  title: { textAlign: 'left' },
  subtitle: { opacity: 0.8 },
  backButton: { alignItems: 'center', paddingVertical: Spacing.md },
  backButtonText: { opacity: 0.7 },
});
