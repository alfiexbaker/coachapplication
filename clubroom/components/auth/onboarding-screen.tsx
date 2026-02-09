/**
 * Onboarding Screen
 *
 * Multi-step wizard for user registration covering:
 * 1. Account type selection (Coach, Parent, Athlete)
 * 2. Basic info (name, email, phone, password)
 * 3. Location
 * 4. Role-specific details
 * 5. Completion
 */

import { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import type { AccountType, SkillLevel, OnboardingData } from '@/services/auth-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('Onboarding');

// ============================================================================
// HELPERS
// ============================================================================

const getPasswordStrength = (password: string, palette: { error: string; warning: string; success: string }): { level: number; label: string; color: string } => {
  let score = 0;

  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: 'Weak', color: palette.error };
  if (score === 2) return { level: 2, label: 'Fair', color: palette.warning };
  if (score === 3) return { level: 3, label: 'Good', color: palette.success };
  return { level: 4, label: 'Strong', color: palette.success };
};

// ============================================================================
// TYPES
// ============================================================================

type OnboardingStep =
  | 'account-type'
  | 'basic-info'
  | 'location'
  | 'athlete-details'
  | 'coach-details'
  | 'complete';

interface OnboardingScreenProps {
  onComplete: () => void;
  onBackToLogin: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ACCOUNT_TYPES: {
  type: AccountType;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    type: 'ATHLETE',
    title: 'I\'m an Athlete',
    description: 'Book sessions, track progress, earn badges',
    icon: 'fitness',
  },
  {
    type: 'COACH',
    title: 'I\'m a Coach',
    description: 'Manage athletes, schedule sessions, build roster',
    icon: 'trophy',
  },
];

const SKILL_LEVELS: { value: SkillLevel; label: string; description: string }[] = [
  { value: 'BEGINNER', label: 'Beginner', description: 'Just starting out' },
  { value: 'INTERMEDIATE', label: 'Intermediate', description: '1-3 years experience' },
  { value: 'ADVANCED', label: 'Advanced', description: '3-5 years experience' },
  { value: 'ELITE', label: 'Elite', description: 'Competitive level' },
];

const SPORTS = [
  'Football', 'Basketball', 'Tennis', 'Swimming', 'Athletics',
  'Golf', 'Rugby', 'Cricket', 'Hockey', 'Martial Arts', 'Other'
];

const COACH_SPECIALIZATIONS = [
  'Youth Development', 'Elite Performance', 'Technical Skills',
  'Fitness & Conditioning', 'Goalkeeping', 'Striker Training',
  'Mental Coaching', 'Group Sessions', 'Private 1-on-1'
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function OnboardingScreen({ onComplete, onBackToLogin }: OnboardingScreenProps) {
  const { colors: palette } = useTheme();
  const { registerFromOnboarding, error: authError } = useAuth();

  // Current step
  const [step, setStep] = useState<OnboardingStep>('account-type');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [accountType, setAccountType] = useState<AccountType | null>(null);

  // Basic info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Location
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');
  const [country, setCountry] = useState('UK');

  // Athlete specific
  const [skillLevel, setSkillLevel] = useState<SkillLevel | null>(null);
  const [position, setPosition] = useState('');
  const [sport, setSport] = useState('');
  const [goals] = useState<string[]>([]);
  const [hasChildren, setHasChildren] = useState(false);

  // Coach specific
  const [isOrganization, setIsOrganization] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');

  // Animation
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = (callback: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      callback();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const getNextStep = (): OnboardingStep => {
    switch (step) {
      case 'account-type':
        return 'basic-info';
      case 'basic-info':
        return 'location';
      case 'location':
        if (accountType === 'ATHLETE') return 'athlete-details';
        if (accountType === 'COACH') return 'coach-details';
        return 'complete';
      case 'athlete-details':
      case 'coach-details':
        return 'complete';
      default:
        return 'complete';
    }
  };

  const getPrevStep = (): OnboardingStep | null => {
    switch (step) {
      case 'basic-info':
        return 'account-type';
      case 'location':
        return 'basic-info';
      case 'athlete-details':
      case 'coach-details':
        return 'location';
      default:
        return null;
    }
  };

  const getStepNumber = (): number => {
    const steps: OnboardingStep[] = ['account-type', 'basic-info', 'location'];
    if (accountType === 'ATHLETE') steps.push('athlete-details');
    if (accountType === 'COACH') steps.push('coach-details');
    steps.push('complete');
    return steps.indexOf(step) + 1;
  };

  const getTotalSteps = (): number => {
    return 5; // account-type, basic-info, location, role-specific, complete
  };

  const handleNext = () => {
    setError(null);

    // Validate current step
    if (!validateCurrentStep()) return;

    const nextStep = getNextStep();

    if (nextStep === 'complete') {
      handleComplete();
    } else {
      animateTransition(() => setStep(nextStep));
    }
  };

  const handleBack = () => {
    const prevStep = getPrevStep();
    if (prevStep) {
      animateTransition(() => setStep(prevStep));
    } else {
      onBackToLogin();
    }
  };

  const validateCurrentStep = (): boolean => {
    switch (step) {
      case 'account-type':
        if (!accountType) {
          setError('Please select an account type');
          return false;
        }
        return true;

      case 'basic-info':
        if (!firstName.trim()) {
          setError('First name is required');
          return false;
        }
        if (!lastName.trim()) {
          setError('Last name is required');
          return false;
        }
        if (!email.trim() || !email.includes('@')) {
          setError('Valid email is required');
          return false;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          return false;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        return true;

      case 'location':
        // Location is optional
        return true;

      case 'athlete-details':
        if (!skillLevel) {
          setError('Please select your skill level');
          return false;
        }
        if (!sport) {
          setError('Please select your sport');
          return false;
        }
        return true;

      case 'coach-details':
        if (isOrganization && !organizationName.trim()) {
          setError('Organization name is required');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleComplete = () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const data: OnboardingData = {
        accountType: accountType!,
        firstName,
        lastName,
        email,
        phone,
        password,
        dateOfBirth: dateOfBirth || undefined,
        city: city || undefined,
        postcode: postcode || undefined,
        country: country || undefined,
        skillLevel: skillLevel || undefined,
        position: position || undefined,
        sport: sport || undefined,
        goals: goals.length > 0 ? goals : undefined,
        hasChildren: accountType === 'ATHLETE' ? hasChildren : undefined,
        isOrganization,
        organizationName: organizationName || undefined,
        yearsExperience: yearsExperience ? parseInt(yearsExperience) : undefined,
        specializations: specializations.length > 0 ? specializations : undefined,
        bio: bio || undefined,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
      };

      const success = registerFromOnboarding(data);

      if (success) {
        logger.success('Onboarding complete');
        animateTransition(() => setStep('complete'));
        // User is now auto-logged in, trigger onComplete after showing success
        setTimeout(() => onComplete(), 1500);
      } else {
        setError(authError || 'Something went wrong');
      }
    } catch (err) {
      logger.error('Onboarding failed', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSpecialization = (spec: string) => {
    setSpecializations(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: palette.tint,
              width: `${(getStepNumber() / getTotalSteps()) * 100}%`,
            },
          ]}
        />
      </View>
      <ThemedText style={[styles.progressText, { color: palette.muted }]}>
        Step {getStepNumber()} of {getTotalSteps()}
      </ThemedText>
    </View>
  );

  const renderAccountTypeStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>
        How will you use Clubroom?
      </ThemedText>
      <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>
        Choose your account type. You can always change this later.
      </ThemedText>

      <View style={styles.accountTypeGrid}>
        {ACCOUNT_TYPES.map((type) => (
          <Pressable
            key={type.type}
            onPress={() => setAccountType(type.type)}
            style={[
              styles.accountTypeCard,
              {
                backgroundColor: accountType === type.type ? withAlpha(palette.tint, 0.06) : palette.card,
                borderColor: accountType === type.type ? palette.tint : palette.border,
              },
            ]}
          >
            <View style={[
              styles.accountTypeIcon,
              { backgroundColor: accountType === type.type ? palette.tint : withAlpha(palette.muted, 0.12) }
            ]}>
              <Ionicons
                name={type.icon}
                size={Components.icon.lg}
                color={accountType === type.type ? palette.onPrimary : palette.muted}
              />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.accountTypeTitle}>
              {type.title}
            </ThemedText>
            <ThemedText style={[styles.accountTypeDesc, { color: palette.muted }]}>
              {type.description}
            </ThemedText>
            {accountType === type.type && (
              <View style={[styles.checkBadge, { backgroundColor: palette.tint }]}>
                <Ionicons name="checkmark" size={14} color={palette.onPrimary} />
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderBasicInfoStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>
        Create your account
      </ThemedText>
      <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>
        Enter your details to get started.
      </ThemedText>

      <View style={styles.formRow}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <ThemedText style={styles.label}>First Name *</ThemedText>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="John"
            placeholderTextColor={palette.muted}
            style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
          />
        </View>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <ThemedText style={styles.label}>Last Name *</ThemedText>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Smith"
            placeholderTextColor={palette.muted}
            style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Email *</ThemedText>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="john@email.com"
          placeholderTextColor={palette.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Phone</ThemedText>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="+44 7700 900000"
          placeholderTextColor={palette.muted}
          keyboardType="phone-pad"
          style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Password *</ThemedText>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Min 6 characters"
          placeholderTextColor={palette.muted}
          secureTextEntry
          style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
        />
        {/* Password Strength Meter */}
        {password.length > 0 && (
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBars}>
              {[1, 2, 3, 4].map((level) => {
                const strength = getPasswordStrength(password, palette);
                const isActive = level <= strength.level;
                return (
                  <View
                    key={level}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor: isActive
                          ? strength.color
                          : palette.border,
                      },
                    ]}
                  />
                );
              })}
            </View>
            <ThemedText style={[styles.strengthLabel, { color: getPasswordStrength(password, palette).color }]}>
              {getPasswordStrength(password, palette).label}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Confirm Password *</ThemedText>
        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repeat password"
          placeholderTextColor={palette.muted}
          secureTextEntry
          style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
        />
      </View>

      {accountType === 'ATHLETE' && (
        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Date of Birth</ThemedText>
          <TextInput
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={palette.muted}
            style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
          />
        </View>
      )}
    </View>
  );

  const renderLocationStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>
        Where are you based?
      </ThemedText>
      <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>
        This helps us find {accountType === 'COACH' ? 'athletes' : 'coaches'} near you.
      </ThemedText>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>City</ThemedText>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="London"
          placeholderTextColor={palette.muted}
          style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Postcode</ThemedText>
        <TextInput
          value={postcode}
          onChangeText={setPostcode}
          placeholder="SW1A 1AA"
          placeholderTextColor={palette.muted}
          autoCapitalize="characters"
          style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Country</ThemedText>
        <TextInput
          value={country}
          onChangeText={setCountry}
          placeholder="UK"
          placeholderTextColor={palette.muted}
          style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
        />
      </View>
    </View>
  );

  const renderAthleteDetailsStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>
        Tell us about yourself
      </ThemedText>
      <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>
        Help coaches understand your level and goals.
      </ThemedText>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Sport *</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <View style={styles.chipRow}>
            {SPORTS.map((s) => (
              <Pressable
                key={s}
                onPress={() => setSport(s)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: sport === s ? palette.tint : palette.card,
                    borderColor: sport === s ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText style={[styles.chipText, { color: sport === s ? palette.onPrimary : palette.foreground }]}>
                  {s}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Skill Level *</ThemedText>
        <View style={styles.skillGrid}>
          {SKILL_LEVELS.map((level) => (
            <Pressable
              key={level.value}
              onPress={() => setSkillLevel(level.value)}
              style={[
                styles.skillCard,
                {
                  backgroundColor: skillLevel === level.value ? withAlpha(palette.tint, 0.06) : palette.card,
                  borderColor: skillLevel === level.value ? palette.tint : palette.border,
                },
              ]}
            >
              <ThemedText type="defaultSemiBold">{level.label}</ThemedText>
              <ThemedText style={[styles.skillDesc, { color: palette.muted }]}>
                {level.description}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Position (Optional)</ThemedText>
        <TextInput
          value={position}
          onChangeText={setPosition}
          placeholder="e.g. Midfielder, Point Guard"
          placeholderTextColor={palette.muted}
          style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
        />
      </View>

      {/* Children toggle */}
      <View style={styles.fieldGroup}>
        <Pressable
          onPress={() => setHasChildren(!hasChildren)}
          style={[
            styles.toggleCard,
            {
              backgroundColor: hasChildren ? withAlpha(palette.tint, 0.06) : palette.card,
              borderColor: hasChildren ? palette.tint : palette.border,
            },
          ]}
        >
          <View style={styles.toggleContent}>
            <ThemedText type="defaultSemiBold">I have children who train</ThemedText>
            <ThemedText style={[styles.toggleDesc, { color: palette.muted }]}>
              You can add child profiles after signup
            </ThemedText>
          </View>
          <View style={[
            styles.toggleSwitch,
            { backgroundColor: hasChildren ? palette.tint : palette.border }
          ]}>
            <Animated.View style={[
              styles.toggleKnob,
              { backgroundColor: palette.surface, transform: [{ translateX: hasChildren ? 20 : 0 }] }
            ]} />
          </View>
        </Pressable>
      </View>
    </View>
  );

  const renderCoachDetailsStep = () => (
    <View style={styles.stepContent}>
      <ThemedText type="title" style={styles.stepTitle}>
        Set up your coaching profile
      </ThemedText>
      <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>
        Help athletes find and trust you.
      </ThemedText>

      <View style={styles.fieldGroup}>
        <Pressable
          onPress={() => setIsOrganization(!isOrganization)}
          style={[
            styles.toggleCard,
            {
              backgroundColor: isOrganization ? withAlpha(palette.tint, 0.06) : palette.card,
              borderColor: isOrganization ? palette.tint : palette.border,
            },
          ]}
        >
          <View style={styles.toggleContent}>
            <ThemedText type="defaultSemiBold">I represent an organization</ThemedText>
            <ThemedText style={[styles.toggleDesc, { color: palette.muted }]}>
              Academy, club, or coaching business
            </ThemedText>
          </View>
          <View style={[
            styles.toggleSwitch,
            { backgroundColor: isOrganization ? palette.tint : palette.border }
          ]}>
            <Animated.View style={[
              styles.toggleKnob,
              { backgroundColor: palette.surface, transform: [{ translateX: isOrganization ? 20 : 0 }] }
            ]} />
          </View>
        </Pressable>
      </View>

      {isOrganization && (
        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Organization Name *</ThemedText>
          <TextInput
            value={organizationName}
            onChangeText={setOrganizationName}
            placeholder="Elite Sports Academy"
            placeholderTextColor={palette.muted}
            style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
          />
        </View>
      )}

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Years of Experience</ThemedText>
        <TextInput
          value={yearsExperience}
          onChangeText={setYearsExperience}
          placeholder="5"
          placeholderTextColor={palette.muted}
          keyboardType="number-pad"
          style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Hourly Rate (GBP)</ThemedText>
        <TextInput
          value={hourlyRate}
          onChangeText={setHourlyRate}
          placeholder="50"
          placeholderTextColor={palette.muted}
          keyboardType="decimal-pad"
          style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Specializations</ThemedText>
        <View style={styles.specGrid}>
          {COACH_SPECIALIZATIONS.map((spec) => (
            <Pressable
              key={spec}
              onPress={() => toggleSpecialization(spec)}
              style={[
                styles.specChip,
                {
                  backgroundColor: specializations.includes(spec) ? palette.tint : palette.card,
                  borderColor: specializations.includes(spec) ? palette.tint : palette.border,
                },
              ]}
            >
              <ThemedText style={[
                styles.specChipText,
                { color: specializations.includes(spec) ? palette.onPrimary : palette.foreground }
              ]}>
                {spec}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Bio</ThemedText>
        <TextInput
          value={bio}
          onChangeText={setBio}
          placeholder="Tell athletes about your coaching philosophy..."
          placeholderTextColor={palette.muted}
          multiline
          numberOfLines={4}
          style={[styles.textArea, { borderColor: palette.border, backgroundColor: palette.card }]}
        />
      </View>
    </View>
  );

  const renderCompleteStep = () => (
    <View style={[styles.stepContent, styles.completeContent]}>
      <View style={[styles.completeIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
        <Ionicons name="checkmark-circle" size={64} color={palette.success} />
      </View>
      <ThemedText type="title" style={styles.completeTitle}>
        Welcome to Clubroom!
      </ThemedText>
      <ThemedText style={[styles.completeSubtitle, { color: palette.muted }]}>
        Your account has been created successfully.
        {accountType === 'COACH' && ' Complete your profile to start accepting bookings.'}
        {accountType === 'PARENT' && ' Add your children to start booking sessions.'}
        {accountType === 'ATHLETE' && ' Start exploring coaches near you.'}
      </ThemedText>
    </View>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 'account-type':
        return renderAccountTypeStep();
      case 'basic-info':
        return renderBasicInfoStep();
      case 'location':
        return renderLocationStep();
      case 'athlete-details':
        return renderAthleteDetailsStep();
      case 'coach-details':
        return renderCoachDetailsStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return null;
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrapper}
      >
        {/* Header */}
        {step !== 'complete' && (
          <View style={styles.header}>
            <Pressable onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={palette.foreground} />
            </Pressable>
            {renderProgressBar()}
          </View>
        )}

        {/* Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim }}>
            {renderCurrentStep()}
          </Animated.View>

          {/* Error */}
          {error && (
            <View style={[styles.errorCard, { backgroundColor: withAlpha(palette.error, 0.06) }]}>
              <Ionicons name="alert-circle" size={20} color={palette.error} />
              <ThemedText style={[styles.errorText, { color: palette.error }]}>{error}</ThemedText>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        {step !== 'complete' && (
          <View style={[styles.footer, { borderTopColor: palette.border }]}>
            <Pressable
              onPress={handleNext}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.nextButton,
                {
                  backgroundColor: pressed ? palette.tintPressed : palette.tint,
                  opacity: isSubmitting ? 0.7 : 1,
                },
              ]}
            >
              <ThemedText style={[styles.nextButtonText, { color: palette.onPrimary }]}>
                {step === 'coach-details' || step === 'athlete-details'
                  ? 'Create Account'
                  : 'Continue'}
              </ThemedText>
              <Ionicons name="arrow-forward" size={20} color={palette.onPrimary} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  progressContainer: {
    flex: 1,
    gap: Spacing.xs,
  },
  progressTrack: {
    height: Spacing.xs,
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.sm,
  },
  progressText: {
    ...Typography.caption,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  stepContent: {
    gap: Spacing.lg,
  },
  stepTitle: {
    ...Typography.title,
  },
  stepSubtitle: {
    ...Typography.body,
    marginTop: -Spacing.xs,
  },

  // Account type
  accountTypeGrid: {
    gap: Spacing.sm,
  },
  accountTypeCard: {
    padding: Spacing.md,
    borderRadius: Radii.card,
    borderWidth: 2,
    gap: Spacing.xs,
    position: 'relative',
  },
  accountTypeIcon: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Components.avatar.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  accountTypeTitle: {
    ...Typography.body,
  },
  accountTypeDesc: {
    ...Typography.small,
  },
  checkBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Form
  fieldGroup: {
    gap: Spacing.xs,
  },
  formRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: Spacing.xxs,
    flex: 1,
  },
  strengthBar: {
    height: 4,
    flex: 1,
    borderRadius: Radii.xs,
  },
  strengthLabel: { ...Typography.caption },
  textArea: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
    minHeight: 100,
    textAlignVertical: 'top',
  },

  // Chips
  chipScroll: {
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  chipText: {
    ...Typography.small,
    fontWeight: '500',
  },

  // Skill grid
  skillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  skillCard: {
    width: '48%',
    padding: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  skillDesc: {
    ...Typography.caption,
  },

  // Toggle
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.card,
    borderWidth: 1,
  },
  toggleContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  toggleDesc: {
    ...Typography.caption,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: Radii.lg,
    padding: Spacing.xxs,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: Radii.md,
  },

  // Specializations
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  specChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  specChipText: {
    ...Typography.caption,
  },

  // Info cards
  infoCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  infoIcon: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Components.avatar.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  infoText: {
    ...Typography.small,
  },

  // Complete
  completeContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xl,
  },
  completeIcon: {
    width: 120,
    height: 120,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  completeTitle: {
    textAlign: 'center',
  },
  completeSubtitle: {
    textAlign: 'center',
    ...Typography.body,
  },

  // Error
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.md,
  },
  errorText: {
    ...Typography.small,
    flex: 1,
  },

  // Footer
  footer: {
    padding: Spacing.md,
    borderTopWidth: 1,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  nextButtonText: {
    ...Typography.bodySemiBold,
  },
});
