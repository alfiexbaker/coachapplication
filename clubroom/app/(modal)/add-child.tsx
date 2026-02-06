/**
 * Add Child Flow
 *
 * Multi-step wizard for adding a child profile:
 * 1. Basic Info (name, DOB, gender, relationship, optional photo)
 * 2. Special Needs & Disabilities (optional but asked once)
 * 3. Medical & Allergies
 * 4. Emergency Contact
 * 5. Consents
 */

import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  childService,
  type Gender,
  type Relationship,
  type Disability,
  type SpecialNeed,
} from '@/services/child-service';

import { AddChildBasicStep } from '@/components/family/add-child-basic-step';
import { AddChildMedicalStep } from '@/components/family/add-child-medical-step';
import {
  AddChildEmergencyStep,
  AddChildConsentsStep,
} from '@/components/family/add-child-emergency-step';

type Step = 'basic' | 'special_needs' | 'medical' | 'emergency' | 'consents';

const STEPS: Step[] = ['basic', 'special_needs', 'medical', 'emergency', 'consents'];

const STEP_TITLES: Record<Step, string> = {
  basic: 'Basic Information',
  special_needs: 'Special Needs & Disabilities',
  medical: 'Medical Information',
  emergency: 'Emergency Contacts',
  consents: 'Permissions & Consents',
};

export default function AddChildScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Step 1: Basic Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Step 2: Special Needs
  const [hasSpecialNeeds, setHasSpecialNeeds] = useState<boolean | null>(null);
  const [disabilities, setDisabilities] = useState<Disability[]>([]);
  const [specialNeeds, setSpecialNeeds] = useState<SpecialNeed[]>([]);
  void setSpecialNeeds;
  const [selectedDisabilityType, setSelectedDisabilityType] = useState<string | null>(null);
  const [disabilityDescription, setDisabilityDescription] = useState('');
  const [communicationNotes, setCommunicationNotes] = useState('');
  const [behavioralNotes, setBehavioralNotes] = useState('');

  // Step 3: Medical
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState('');
  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);
  const [conditionInput, setConditionInput] = useState('');
  const [medications, setMedications] = useState<string[]>([]);
  const [medicationInput, setMedicationInput] = useState('');

  // Step 4: Emergency
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [secondaryName, setSecondaryName] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');

  // Step 5: Consents
  const [photoConsent, setPhotoConsent] = useState(true);
  const [videoConsent, setVideoConsent] = useState(true);
  const [socialMediaConsent, setSocialMediaConsent] = useState(false);
  const [emergencyTreatmentConsent, setEmergencyTreatmentConsent] = useState(true);

  const stepIndex = STEPS.indexOf(currentStep);
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEPS.length - 1;

  // ── Helpers ──
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const addAllergy = () => {
    if (allergyInput.trim()) {
      setAllergies([...allergies, allergyInput.trim()]);
      setAllergyInput('');
    }
  };

  const addCondition = () => {
    if (conditionInput.trim()) {
      setMedicalConditions([...medicalConditions, conditionInput.trim()]);
      setConditionInput('');
    }
  };

  const addMedication = () => {
    if (medicationInput.trim()) {
      setMedications([...medications, medicationInput.trim()]);
      setMedicationInput('');
    }
  };

  const addDisability = () => {
    if (selectedDisabilityType) {
      const newDisability: Disability = {
        id: `dis-${Date.now()}`,
        type: selectedDisabilityType,
        description: disabilityDescription || undefined,
      };
      setDisabilities([...disabilities, newDisability]);
      setSelectedDisabilityType(null);
      setDisabilityDescription('');
    }
  };

  const validateStep = (): boolean => {
    switch (currentStep) {
      case 'basic':
        if (!firstName.trim() || !lastName.trim() || !gender || !relationship) {
          Alert.alert('Required Fields', 'Please fill in name, gender, and relationship');
          return false;
        }
        return true;
      case 'special_needs':
        if (hasSpecialNeeds === null) {
          Alert.alert(
            'Required',
            'Please indicate if your child has any special needs or disabilities',
          );
          return false;
        }
        return true;
      case 'medical':
        return true;
      case 'emergency':
        if (!emergencyName.trim() || !emergencyPhone.trim() || !emergencyRelation.trim()) {
          Alert.alert('Required Fields', 'Please provide at least one emergency contact');
          return false;
        }
        return true;
      case 'consents':
        return true;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (!validateStep()) return;
    if (!isLastStep) setCurrentStep(STEPS[stepIndex + 1]);
  };

  const goBack = () => {
    if (!isFirstStep) {
      setCurrentStep(STEPS[stepIndex - 1]);
    } else {
      router.back();
    }
  };

  const handleSave = async () => {
    if (!validateStep()) return;
    if (!currentUser?.id) return;

    setSaving(true);
    try {
      await childService.createChild(currentUser.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        nickname: nickname.trim() || undefined,
        dateOfBirth: dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : undefined,
        gender: gender!,
        relationship: relationship!,
        photoUrl: photoUri || undefined,
        disabilities,
        specialNeeds,
        allergies,
        medicalConditions,
        medications,
        communicationNotes: communicationNotes.trim() || undefined,
        behavioralNotes: behavioralNotes.trim() || undefined,
        emergencyContactName: emergencyName.trim(),
        emergencyContactPhone: emergencyPhone.trim(),
        emergencyContactRelation: emergencyRelation.trim(),
        secondaryEmergencyName: secondaryName.trim() || undefined,
        secondaryEmergencyPhone: secondaryPhone.trim() || undefined,
        photoConsent,
        videoConsent,
        socialMediaConsent,
        emergencyTreatmentConsent,
      });
      Alert.alert('Success', `${firstName}'s profile has been created!`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to create child profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Step router ──
  const renderStep = () => {
    switch (currentStep) {
      case 'basic':
        return (
          <AddChildBasicStep
            firstName={firstName}
            lastName={lastName}
            nickname={nickname}
            dateOfBirth={dateOfBirth}
            gender={gender}
            relationship={relationship}
            photoUri={photoUri}
            showDatePicker={showDatePicker}
            onFirstNameChange={setFirstName}
            onLastNameChange={setLastName}
            onNicknameChange={setNickname}
            onDateOfBirthChange={setDateOfBirth}
            onGenderChange={setGender}
            onRelationshipChange={setRelationship}
            onPickImage={pickImage}
            onShowDatePicker={setShowDatePicker}
          />
        );
      case 'special_needs':
        return (
          <AddChildMedicalStep
            variant="special_needs"
            firstName={firstName}
            hasSpecialNeeds={hasSpecialNeeds}
            disabilities={disabilities}
            selectedDisabilityType={selectedDisabilityType}
            disabilityDescription={disabilityDescription}
            communicationNotes={communicationNotes}
            behavioralNotes={behavioralNotes}
            onHasSpecialNeedsChange={setHasSpecialNeeds}
            onDisabilitiesChange={setDisabilities}
            onSelectedDisabilityTypeChange={setSelectedDisabilityType}
            onDisabilityDescriptionChange={setDisabilityDescription}
            onCommunicationNotesChange={setCommunicationNotes}
            onBehavioralNotesChange={setBehavioralNotes}
            onAddDisability={addDisability}
            allergies={allergies}
            allergyInput={allergyInput}
            medicalConditions={medicalConditions}
            conditionInput={conditionInput}
            medications={medications}
            medicationInput={medicationInput}
            onAllergiesChange={setAllergies}
            onAllergyInputChange={setAllergyInput}
            onAddAllergy={addAllergy}
            onMedicalConditionsChange={setMedicalConditions}
            onConditionInputChange={setConditionInput}
            onAddCondition={addCondition}
            onMedicationsChange={setMedications}
            onMedicationInputChange={setMedicationInput}
            onAddMedication={addMedication}
          />
        );
      case 'medical':
        return (
          <AddChildMedicalStep
            variant="medical"
            firstName={firstName}
            hasSpecialNeeds={hasSpecialNeeds}
            disabilities={disabilities}
            selectedDisabilityType={selectedDisabilityType}
            disabilityDescription={disabilityDescription}
            communicationNotes={communicationNotes}
            behavioralNotes={behavioralNotes}
            onHasSpecialNeedsChange={setHasSpecialNeeds}
            onDisabilitiesChange={setDisabilities}
            onSelectedDisabilityTypeChange={setSelectedDisabilityType}
            onDisabilityDescriptionChange={setDisabilityDescription}
            onCommunicationNotesChange={setCommunicationNotes}
            onBehavioralNotesChange={setBehavioralNotes}
            onAddDisability={addDisability}
            allergies={allergies}
            allergyInput={allergyInput}
            medicalConditions={medicalConditions}
            conditionInput={conditionInput}
            medications={medications}
            medicationInput={medicationInput}
            onAllergiesChange={setAllergies}
            onAllergyInputChange={setAllergyInput}
            onAddAllergy={addAllergy}
            onMedicalConditionsChange={setMedicalConditions}
            onConditionInputChange={setConditionInput}
            onAddCondition={addCondition}
            onMedicationsChange={setMedications}
            onMedicationInputChange={setMedicationInput}
            onAddMedication={addMedication}
          />
        );
      case 'emergency':
        return (
          <AddChildEmergencyStep
            emergencyName={emergencyName}
            emergencyPhone={emergencyPhone}
            emergencyRelation={emergencyRelation}
            secondaryName={secondaryName}
            secondaryPhone={secondaryPhone}
            onEmergencyNameChange={setEmergencyName}
            onEmergencyPhoneChange={setEmergencyPhone}
            onEmergencyRelationChange={setEmergencyRelation}
            onSecondaryNameChange={setSecondaryName}
            onSecondaryPhoneChange={setSecondaryPhone}
          />
        );
      case 'consents':
        return (
          <AddChildConsentsStep
            photoConsent={photoConsent}
            videoConsent={videoConsent}
            socialMediaConsent={socialMediaConsent}
            emergencyTreatmentConsent={emergencyTreatmentConsent}
            onPhotoConsentChange={setPhotoConsent}
            onVideoConsentChange={setVideoConsent}
            onSocialMediaConsentChange={setSocialMediaConsent}
            onEmergencyTreatmentConsentChange={setEmergencyTreatmentConsent}
          />
        );
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Clickable onPress={goBack} hitSlop={8}>
          <Ionicons
            name={isFirstStep ? 'close' : 'arrow-back'}
            size={24}
            color={palette.text}
          />
        </Clickable>
        <ThemedText type="subtitle">Add Child</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        {STEPS.map((step, index) => (
          <View key={step} style={styles.stepDotContainer}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor:
                    index <= stepIndex ? palette.tint : palette.border,
                },
              ]}
            >
              {index < stepIndex && (
                <Ionicons name="checkmark" size={12} color={palette.onPrimary} />
              )}
            </View>
            {index < STEPS.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  {
                    backgroundColor:
                      index < stepIndex ? palette.tint : palette.border,
                  },
                ]}
              />
            )}
          </View>
        ))}
      </View>

      {/* Step Title */}
      <View style={styles.stepHeader}>
        <ThemedText type="title" style={styles.stepTitle}>
          {STEP_TITLES[currentStep]}
        </ThemedText>
        <ThemedText style={[styles.stepCount, { color: palette.muted }]}>
          Step {stepIndex + 1} of {STEPS.length}
        </ThemedText>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        {isLastStep ? (
          <Button onPress={handleSave} disabled={saving} style={{ flex: 1 }}>
            {saving ? 'Creating Profile...' : `Add ${firstName || 'Child'}`}
          </Button>
        ) : (
          <Button onPress={goNext} style={{ flex: 1 }}>
            Continue
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  stepDotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: Spacing.xxs,
  },
  stepHeader: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  stepTitle: {
    ...Typography.title,
    fontSize: 24,
  },
  stepCount: {
    ...Typography.small,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
});
