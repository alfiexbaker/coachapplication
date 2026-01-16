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
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  childService,
  type Gender,
  type Relationship,
  type Disability,
  type SpecialNeed,
  DISABILITY_TYPES,
  SPECIAL_NEEDS_CATEGORIES,
} from '@/services/child-service';

type Step = 'basic' | 'special_needs' | 'medical' | 'emergency' | 'consents';

const STEPS: Step[] = ['basic', 'special_needs', 'medical', 'emergency', 'consents'];

const STEP_TITLES: Record<Step, string> = {
  basic: 'Basic Information',
  special_needs: 'Special Needs & Disabilities',
  medical: 'Medical Information',
  emergency: 'Emergency Contacts',
  consents: 'Permissions & Consents',
};

const GENDERS: Array<{ id: Gender; label: string }> = [
  { id: 'MALE', label: 'Male' },
  { id: 'FEMALE', label: 'Female' },
  { id: 'OTHER', label: 'Other' },
  { id: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
];

const RELATIONSHIPS: Array<{ id: Relationship; label: string }> = [
  { id: 'SON', label: 'Son' },
  { id: 'DAUGHTER', label: 'Daughter' },
  { id: 'WARD', label: 'Ward' },
  { id: 'GRANDCHILD', label: 'Grandchild' },
  { id: 'OTHER', label: 'Other' },
];

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
          Alert.alert('Required', 'Please indicate if your child has any special needs or disabilities');
          return false;
        }
        return true;
      case 'medical':
        return true; // All optional
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
    if (!isLastStep) {
      setCurrentStep(STEPS[stepIndex + 1]);
    }
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
    } catch (error) {
      Alert.alert('Error', 'Failed to create child profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderBasicStep = () => (
    <View style={styles.stepContent}>
      {/* Photo Upload */}
      <View style={styles.photoSection}>
        <Clickable onPress={pickImage} style={styles.photoPickerContainer}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <View style={[styles.photoPlaceholder, { backgroundColor: `${palette.tint}15` }]}>
              <Ionicons name="camera" size={32} color={palette.tint} />
            </View>
          )}
          <View style={[styles.photoEditBadge, { backgroundColor: palette.tint }]}>
            <Ionicons name="add" size={16} color="#fff" />
          </View>
        </Clickable>
        <ThemedText style={[styles.photoHint, { color: palette.muted }]}>
          Add a photo (optional)
        </ThemedText>
      </View>

      {/* Name Fields */}
      <View style={styles.row}>
        <View style={styles.halfField}>
          <ThemedText style={styles.label}>First Name *</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: palette.border, color: palette.text }]}
            placeholder="First name"
            placeholderTextColor={palette.muted}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />
        </View>
        <View style={styles.halfField}>
          <ThemedText style={styles.label}>Last Name *</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: palette.border, color: palette.text }]}
            placeholder="Last name"
            placeholderTextColor={palette.muted}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />
        </View>
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Nickname (optional)</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
          placeholder="What do they like to be called?"
          placeholderTextColor={palette.muted}
          value={nickname}
          onChangeText={setNickname}
        />
      </View>

      {/* Date of Birth */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Date of Birth (optional)</ThemedText>
        <Clickable
          onPress={() => setShowDatePicker(true)}
          style={[styles.input, styles.dateInput, { borderColor: palette.border }]}
        >
          <ThemedText style={dateOfBirth ? {} : { color: palette.muted }}>
            {dateOfBirth
              ? dateOfBirth.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
              : 'Select date of birth'}
          </ThemedText>
          <Ionicons name="calendar-outline" size={20} color={palette.muted} />
        </Clickable>
        {showDatePicker && (
          <DateTimePicker
            value={dateOfBirth || new Date(2015, 0, 1)}
            mode="date"
            display="spinner"
            maximumDate={new Date()}
            minimumDate={new Date(2000, 0, 1)}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) setDateOfBirth(selectedDate);
            }}
          />
        )}
      </View>

      {/* Gender */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Gender *</ThemedText>
        <View style={styles.optionGrid}>
          {GENDERS.map((g) => (
            <Clickable
              key={g.id}
              onPress={() => setGender(g.id)}
              style={[
                styles.optionChip,
                {
                  backgroundColor: gender === g.id ? palette.tint : palette.surface,
                  borderColor: gender === g.id ? palette.tint : palette.border,
                },
              ]}
            >
              <ThemedText
                style={[styles.optionText, { color: gender === g.id ? '#fff' : palette.text }]}
              >
                {g.label}
              </ThemedText>
            </Clickable>
          ))}
        </View>
      </View>

      {/* Relationship */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Relationship *</ThemedText>
        <View style={styles.optionGrid}>
          {RELATIONSHIPS.map((r) => (
            <Clickable
              key={r.id}
              onPress={() => setRelationship(r.id)}
              style={[
                styles.optionChip,
                {
                  backgroundColor: relationship === r.id ? palette.tint : palette.surface,
                  borderColor: relationship === r.id ? palette.tint : palette.border,
                },
              ]}
            >
              <ThemedText
                style={[styles.optionText, { color: relationship === r.id ? '#fff' : palette.text }]}
              >
                {r.label}
              </ThemedText>
            </Clickable>
          ))}
        </View>
      </View>
    </View>
  );

  const renderSpecialNeedsStep = () => (
    <View style={styles.stepContent}>
      <SurfaceCard style={styles.infoCard}>
        <Ionicons name="heart-outline" size={24} color={palette.tint} />
        <ThemedText style={[styles.infoText, { color: palette.muted }]}>
          This information helps coaches provide the best experience for your child.
          It will be shared with coaches who work with {firstName || 'your child'}.
        </ThemedText>
      </SurfaceCard>

      {/* Initial Question */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>
          Does {firstName || 'your child'} have any disabilities or special needs? *
        </ThemedText>
        <View style={styles.yesNoRow}>
          <Clickable
            onPress={() => setHasSpecialNeeds(true)}
            style={[
              styles.yesNoButton,
              {
                backgroundColor: hasSpecialNeeds === true ? palette.tint : palette.surface,
                borderColor: hasSpecialNeeds === true ? palette.tint : palette.border,
              },
            ]}
          >
            <ThemedText style={{ color: hasSpecialNeeds === true ? '#fff' : palette.text, fontWeight: '600' }}>
              Yes
            </ThemedText>
          </Clickable>
          <Clickable
            onPress={() => setHasSpecialNeeds(false)}
            style={[
              styles.yesNoButton,
              {
                backgroundColor: hasSpecialNeeds === false ? palette.tint : palette.surface,
                borderColor: hasSpecialNeeds === false ? palette.tint : palette.border,
              },
            ]}
          >
            <ThemedText style={{ color: hasSpecialNeeds === false ? '#fff' : palette.text, fontWeight: '600' }}>
              No
            </ThemedText>
          </Clickable>
        </View>
      </View>

      {hasSpecialNeeds === true && (
        <>
          {/* Disabilities Section */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>Disabilities</ThemedText>
            <ThemedText style={[styles.hint, { color: palette.muted }]}>
              Select any that apply
            </ThemedText>

            <View style={styles.optionGrid}>
              {DISABILITY_TYPES.map((type) => {
                const isSelected = disabilities.some((d) => d.type === type);
                return (
                  <Clickable
                    key={type}
                    onPress={() => {
                      if (isSelected) {
                        setDisabilities(disabilities.filter((d) => d.type !== type));
                      } else {
                        setSelectedDisabilityType(type);
                      }
                    }}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: isSelected ? `${palette.tint}15` : palette.surface,
                        borderColor: isSelected ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color={palette.tint} />}
                    <ThemedText style={[styles.optionText, { color: isSelected ? palette.tint : palette.text }]}>
                      {type}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </View>

            {/* Add description for selected disability */}
            {selectedDisabilityType && (
              <View style={[styles.addDescriptionBox, { backgroundColor: `${palette.tint}08`, borderColor: palette.border }]}>
                <ThemedText type="defaultSemiBold">{selectedDisabilityType}</ThemedText>
                <TextInput
                  style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
                  placeholder="Add any details that would help coaches (optional)"
                  placeholderTextColor={palette.muted}
                  value={disabilityDescription}
                  onChangeText={setDisabilityDescription}
                  multiline
                  numberOfLines={3}
                />
                <View style={styles.addButtonRow}>
                  <Clickable onPress={() => setSelectedDisabilityType(null)}>
                    <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
                  </Clickable>
                  <Button onPress={addDisability} size="small">Add</Button>
                </View>
              </View>
            )}
          </View>

          {/* Communication Notes */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>Communication Preferences</ThemedText>
            <ThemedText style={[styles.hint, { color: palette.muted }]}>
              How does {firstName || 'your child'} communicate best?
            </ThemedText>
            <TextInput
              style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
              placeholder="e.g., Responds well to visual cues, prefers direct instructions..."
              placeholderTextColor={palette.muted}
              value={communicationNotes}
              onChangeText={setCommunicationNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Behavioral Notes */}
          <View style={styles.field}>
            <ThemedText style={styles.label}>Behavioral Considerations</ThemedText>
            <ThemedText style={[styles.hint, { color: palette.muted }]}>
              Anything coaches should know about behavior or triggers?
            </ThemedText>
            <TextInput
              style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
              placeholder="e.g., May need breaks, gets overwhelmed in large groups..."
              placeholderTextColor={palette.muted}
              value={behavioralNotes}
              onChangeText={setBehavioralNotes}
              multiline
              numberOfLines={3}
            />
          </View>
        </>
      )}
    </View>
  );

  const renderMedicalStep = () => (
    <View style={styles.stepContent}>
      <SurfaceCard style={styles.infoCard}>
        <Ionicons name="medkit-outline" size={24} color={palette.warning} />
        <ThemedText style={[styles.infoText, { color: palette.muted }]}>
          Medical information is critical for your child's safety during sessions.
        </ThemedText>
      </SurfaceCard>

      {/* Allergies */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Allergies</ThemedText>
        <View style={styles.tagInputRow}>
          <TextInput
            style={[styles.input, { flex: 1, borderColor: palette.border, color: palette.text }]}
            placeholder="e.g., Peanuts, Bee stings"
            placeholderTextColor={palette.muted}
            value={allergyInput}
            onChangeText={setAllergyInput}
            onSubmitEditing={addAllergy}
          />
          <Clickable
            onPress={addAllergy}
            style={[styles.addButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </Clickable>
        </View>
        {allergies.length > 0 && (
          <View style={styles.tagList}>
            {allergies.map((item, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: `${palette.error}15`, borderColor: palette.error }]}>
                <ThemedText style={{ color: palette.error }}>{item}</ThemedText>
                <Clickable onPress={() => setAllergies(allergies.filter((_, i) => i !== index))}>
                  <Ionicons name="close" size={16} color={palette.error} />
                </Clickable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Medical Conditions */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Medical Conditions</ThemedText>
        <View style={styles.tagInputRow}>
          <TextInput
            style={[styles.input, { flex: 1, borderColor: palette.border, color: palette.text }]}
            placeholder="e.g., Asthma, Diabetes"
            placeholderTextColor={palette.muted}
            value={conditionInput}
            onChangeText={setConditionInput}
            onSubmitEditing={addCondition}
          />
          <Clickable
            onPress={addCondition}
            style={[styles.addButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </Clickable>
        </View>
        {medicalConditions.length > 0 && (
          <View style={styles.tagList}>
            {medicalConditions.map((item, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: `${palette.warning}15`, borderColor: palette.warning }]}>
                <ThemedText style={{ color: palette.warning }}>{item}</ThemedText>
                <Clickable onPress={() => setMedicalConditions(medicalConditions.filter((_, i) => i !== index))}>
                  <Ionicons name="close" size={16} color={palette.warning} />
                </Clickable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Medications */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Current Medications</ThemedText>
        <View style={styles.tagInputRow}>
          <TextInput
            style={[styles.input, { flex: 1, borderColor: palette.border, color: palette.text }]}
            placeholder="e.g., Ventolin inhaler"
            placeholderTextColor={palette.muted}
            value={medicationInput}
            onChangeText={setMedicationInput}
            onSubmitEditing={addMedication}
          />
          <Clickable
            onPress={addMedication}
            style={[styles.addButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </Clickable>
        </View>
        {medications.length > 0 && (
          <View style={styles.tagList}>
            {medications.map((item, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: `${palette.tint}15`, borderColor: palette.tint }]}>
                <ThemedText style={{ color: palette.tint }}>{item}</ThemedText>
                <Clickable onPress={() => setMedications(medications.filter((_, i) => i !== index))}>
                  <Ionicons name="close" size={16} color={palette.tint} />
                </Clickable>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderEmergencyStep = () => (
    <View style={styles.stepContent}>
      <SurfaceCard style={styles.infoCard}>
        <Ionicons name="call-outline" size={24} color={palette.error} />
        <ThemedText style={[styles.infoText, { color: palette.muted }]}>
          Emergency contacts will be called if we cannot reach you during a session.
        </ThemedText>
      </SurfaceCard>

      {/* Primary Contact */}
      <View style={styles.field}>
        <ThemedText type="defaultSemiBold">Primary Emergency Contact *</ThemedText>
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Full Name *</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
          placeholder="Contact name"
          placeholderTextColor={palette.muted}
          value={emergencyName}
          onChangeText={setEmergencyName}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Phone Number *</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
          placeholder="+44 7700 900123"
          placeholderTextColor={palette.muted}
          value={emergencyPhone}
          onChangeText={setEmergencyPhone}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Relationship to Child *</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
          placeholder="e.g., Mother, Father, Grandparent"
          placeholderTextColor={palette.muted}
          value={emergencyRelation}
          onChangeText={setEmergencyRelation}
        />
      </View>

      {/* Secondary Contact */}
      <View style={[styles.field, { marginTop: Spacing.lg }]}>
        <ThemedText type="defaultSemiBold">Secondary Contact (Optional)</ThemedText>
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Full Name</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
          placeholder="Secondary contact name"
          placeholderTextColor={palette.muted}
          value={secondaryName}
          onChangeText={setSecondaryName}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.field}>
        <ThemedText style={styles.label}>Phone Number</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
          placeholder="+44 7700 900456"
          placeholderTextColor={palette.muted}
          value={secondaryPhone}
          onChangeText={setSecondaryPhone}
          keyboardType="phone-pad"
        />
      </View>
    </View>
  );

  const renderConsentsStep = () => (
    <View style={styles.stepContent}>
      <SurfaceCard style={styles.infoCard}>
        <Ionicons name="shield-checkmark-outline" size={24} color={palette.success} />
        <ThemedText style={[styles.infoText, { color: palette.muted }]}>
          These permissions help us provide the best experience while keeping your child safe.
        </ThemedText>
      </SurfaceCard>

      {/* Photo Consent */}
      <Clickable
        onPress={() => setPhotoConsent(!photoConsent)}
        style={[styles.consentRow, { borderColor: palette.border }]}
      >
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold">Photography</ThemedText>
          <ThemedText style={[styles.consentDesc, { color: palette.muted }]}>
            Allow photos during sessions for training purposes
          </ThemedText>
        </View>
        <View style={[styles.toggle, { backgroundColor: photoConsent ? palette.success : palette.border }]}>
          <View style={[styles.toggleKnob, { transform: [{ translateX: photoConsent ? 18 : 2 }] }]} />
        </View>
      </Clickable>

      {/* Video Consent */}
      <Clickable
        onPress={() => setVideoConsent(!videoConsent)}
        style={[styles.consentRow, { borderColor: palette.border }]}
      >
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold">Video Recording</ThemedText>
          <ThemedText style={[styles.consentDesc, { color: palette.muted }]}>
            Allow video recording for training review
          </ThemedText>
        </View>
        <View style={[styles.toggle, { backgroundColor: videoConsent ? palette.success : palette.border }]}>
          <View style={[styles.toggleKnob, { transform: [{ translateX: videoConsent ? 18 : 2 }] }]} />
        </View>
      </Clickable>

      {/* Social Media Consent */}
      <Clickable
        onPress={() => setSocialMediaConsent(!socialMediaConsent)}
        style={[styles.consentRow, { borderColor: palette.border }]}
      >
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold">Social Media</ThemedText>
          <ThemedText style={[styles.consentDesc, { color: palette.muted }]}>
            Allow use in club social media posts
          </ThemedText>
        </View>
        <View style={[styles.toggle, { backgroundColor: socialMediaConsent ? palette.success : palette.border }]}>
          <View style={[styles.toggleKnob, { transform: [{ translateX: socialMediaConsent ? 18 : 2 }] }]} />
        </View>
      </Clickable>

      {/* Emergency Treatment Consent */}
      <Clickable
        onPress={() => setEmergencyTreatmentConsent(!emergencyTreatmentConsent)}
        style={[styles.consentRow, { borderColor: palette.border }]}
      >
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold">Emergency Treatment</ThemedText>
          <ThemedText style={[styles.consentDesc, { color: palette.muted }]}>
            Authorize emergency medical treatment if parent unavailable
          </ThemedText>
        </View>
        <View style={[styles.toggle, { backgroundColor: emergencyTreatmentConsent ? palette.success : palette.border }]}>
          <View style={[styles.toggleKnob, { transform: [{ translateX: emergencyTreatmentConsent ? 18 : 2 }] }]} />
        </View>
      </Clickable>
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 'basic':
        return renderBasicStep();
      case 'special_needs':
        return renderSpecialNeedsStep();
      case 'medical':
        return renderMedicalStep();
      case 'emergency':
        return renderEmergencyStep();
      case 'consents':
        return renderConsentsStep();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Clickable onPress={goBack} hitSlop={8}>
          <Ionicons name={isFirstStep ? 'close' : 'arrow-back'} size={24} color={palette.text} />
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
                  backgroundColor: index <= stepIndex ? palette.tint : palette.border,
                },
              ]}
            >
              {index < stepIndex && <Ionicons name="checkmark" size={12} color="#fff" />}
            </View>
            {index < STEPS.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: index < stepIndex ? palette.tint : palette.border },
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 4,
  },
  stepHeader: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  stepTitle: {
    fontSize: 24,
  },
  stepCount: {
    fontSize: 13,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  stepContent: {
    gap: Spacing.md,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  photoPickerContainer: {
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHint: {
    fontSize: 13,
    marginTop: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  halfField: {
    flex: 1,
  },
  field: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  hint: {
    fontSize: 13,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    fontSize: 15,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textArea: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  yesNoRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  yesNoButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  addDescriptionBox: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  addButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.md,
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radii.md,
    gap: Spacing.md,
  },
  consentDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
});
