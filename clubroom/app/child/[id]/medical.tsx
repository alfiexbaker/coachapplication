import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Colors, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmergencyInfo, MedicalInfo, Consent, ConsentType } from '@/constants/types';
import { safetyService } from '@/services/safety-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('MedicalInfoScreen');

type TagInputProps = {
  label: string;
  placeholder: string;
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (index: number) => void;
};

function TagInput({ label, placeholder, items, onAdd, onRemove }: TagInputProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <View style={styles.fieldContainer}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <View style={styles.tagInputRow}>
        <TextInput
          style={[styles.tagInput, { borderColor: palette.border, color: palette.text }]}
          placeholder={placeholder}
          placeholderTextColor={palette.muted}
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Clickable
          onPress={handleAdd}
          style={[styles.addTagButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="add" size={20} color={Colors.light.onPrimary} />
        </Clickable>
      </View>
      {items.length > 0 && (
        <View style={styles.tagList}>
          {items.map((item, index) => (
            <View
              key={index}
              style={[styles.tag, { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: palette.border }]}
            >
              <ThemedText style={styles.tagText}>{item}</ThemedText>
              <Clickable onPress={() => onRemove(index)}>
                <Ionicons name="close" size={16} color={palette.muted} />
              </Clickable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

type ConsentToggleProps = {
  consent: Consent;
  onToggle: (type: ConsentType, granted: boolean) => void;
};

function ConsentToggle({ consent, onToggle }: ConsentToggleProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const labels: Record<ConsentType, { title: string; description: string }> = {
    PHOTO: {
      title: 'Photography',
      description: 'Allow photos to be taken during sessions',
    },
    VIDEO: {
      title: 'Video Recording',
      description: 'Allow video recording for training review',
    },
    SOCIAL_MEDIA: {
      title: 'Social Media',
      description: 'Allow use in club social media posts',
    },
    EMERGENCY_TREATMENT: {
      title: 'Emergency Treatment',
      description: 'Authorize emergency medical treatment if parent unavailable',
    },
  };

  const info = labels[consent.type];

  return (
    <Clickable
      onPress={() => onToggle(consent.type, !consent.granted)}
      style={styles.consentRow}
    >
      <View style={{ flex: 1 }}>
        <ThemedText type="defaultSemiBold">{info.title}</ThemedText>
        <ThemedText style={{ color: palette.muted, ...Typography.small }}>
          {info.description}
        </ThemedText>
      </View>
      <View
        style={[
          styles.toggle,
          {
            backgroundColor: consent.granted ? palette.success : palette.border,
          },
        ]}
      >
        <View
          style={[
            styles.toggleKnob,
            {
              backgroundColor: Colors.light.surface,
              transform: [{ translateX: consent.granted ? 18 : 2 }],
            },
          ]}
        />
      </View>
    </Clickable>
  );
}

export default function MedicalInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [, setInfo] = useState<EmergencyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [consents, setConsents] = useState<Consent[]>([]);

  const loadInfo = useCallback(async () => {
    if (!id) return;
    try {
      const data = await safetyService.getEmergencyInfo(id);
      setInfo(data);
      // Initialize form state
      setConditions(data.medical.conditions);
      setAllergies(data.medical.allergies);
      setMedications(data.medical.medications);
      setRestrictions(data.medical.restrictions);
      setDoctorName(data.medical.doctorName ?? '');
      setDoctorPhone(data.medical.doctorPhone ?? '');
      setInsuranceProvider(data.medical.insuranceProvider ?? '');
      setInsuranceNumber(data.medical.insuranceNumber ?? '');
      setNotes(data.medical.notes ?? '');
      setConsents(data.consents);
    } catch (error) {
      logger.error('Failed to load medical info:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  const handleConsentToggle = (type: ConsentType, granted: boolean) => {
    setConsents((prev) =>
      prev.map((c) =>
        c.type === type
          ? {
              ...c,
              granted,
              grantedBy: granted ? 'Current User' : '',
              grantedAt: granted ? new Date().toISOString() : undefined,
            }
          : c
      )
    );
  };

  const handleSave = async () => {
    if (!id) return;

    setSaving(true);
    try {
      const medicalUpdate: Partial<MedicalInfo> = {
        conditions,
        allergies,
        medications,
        restrictions,
        doctorName: doctorName || undefined,
        doctorPhone: doctorPhone || undefined,
        insuranceProvider: insuranceProvider || undefined,
        insuranceNumber: insuranceNumber || undefined,
        notes: notes || undefined,
      };

      await safetyService.updateMedicalInfo(id, medicalUpdate);

      // Update consents
      for (const consent of consents) {
        await safetyService.updateConsent(id, consent.type, consent.granted, consent.grantedBy);
      }

      router.back();
    } catch (error) {
      logger.error('Failed to save medical info:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title">Medical Information</ThemedText>
        </View>

        <ThemedText style={{ color: palette.muted }}>
          Keep medical information up to date for the safety of your child during sessions.
        </ThemedText>

        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Health Conditions</ThemedText>

          <TagInput
            label="Medical Conditions"
            placeholder="e.g., Asthma, Diabetes"
            items={conditions}
            onAdd={(item) => setConditions([...conditions, item])}
            onRemove={(index) => setConditions(conditions.filter((_, i) => i !== index))}
          />

          <TagInput
            label="Allergies"
            placeholder="e.g., Peanuts, Penicillin"
            items={allergies}
            onAdd={(item) => setAllergies([...allergies, item])}
            onRemove={(index) => setAllergies(allergies.filter((_, i) => i !== index))}
          />

          <TagInput
            label="Medications"
            placeholder="e.g., Ventolin inhaler"
            items={medications}
            onAdd={(item) => setMedications([...medications, item])}
            onRemove={(index) => setMedications(medications.filter((_, i) => i !== index))}
          />

          <TagInput
            label="Activity Restrictions"
            placeholder="e.g., No contact sports"
            items={restrictions}
            onAdd={(item) => setRestrictions([...restrictions, item])}
            onRemove={(index) => setRestrictions(restrictions.filter((_, i) => i !== index))}
          />
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Doctor Information</ThemedText>

          <View style={styles.fieldContainer}>
            <ThemedText style={styles.fieldLabel}>Doctor Name</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: palette.border, color: palette.text }]}
              placeholder="Dr. John Smith"
              placeholderTextColor={palette.muted}
              value={doctorName}
              onChangeText={setDoctorName}
            />
          </View>

          <View style={styles.fieldContainer}>
            <ThemedText style={styles.fieldLabel}>Doctor Phone</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: palette.border, color: palette.text }]}
              placeholder="+44 20 1234 5678"
              placeholderTextColor={palette.muted}
              value={doctorPhone}
              onChangeText={setDoctorPhone}
              keyboardType="phone-pad"
            />
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Insurance</ThemedText>

          <View style={styles.fieldContainer}>
            <ThemedText style={styles.fieldLabel}>Insurance Provider</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: palette.border, color: palette.text }]}
              placeholder="e.g., Bupa, AXA"
              placeholderTextColor={palette.muted}
              value={insuranceProvider}
              onChangeText={setInsuranceProvider}
            />
          </View>

          <View style={styles.fieldContainer}>
            <ThemedText style={styles.fieldLabel}>Policy Number</ThemedText>
            <TextInput
              style={[styles.input, { borderColor: palette.border, color: palette.text }]}
              placeholder="Policy number"
              placeholderTextColor={palette.muted}
              value={insuranceNumber}
              onChangeText={setInsuranceNumber}
            />
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Additional Notes</ThemedText>
          <TextInput
            style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
            placeholder="Any other important medical information..."
            placeholderTextColor={palette.muted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold">Consents</ThemedText>
          <ThemedText style={{ color: palette.muted, ...Typography.small, marginBottom: Spacing.sm }}>
            Manage permissions for your child during sessions
          </ThemedText>
          {consents.map((consent) => (
            <ConsentToggle key={consent.type} consent={consent} onToggle={handleConsentToggle} />
          ))}
        </SurfaceCard>

        <Button onPress={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Medical Information'}
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  section: {
    gap: Spacing.md,
  },
  fieldContainer: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    ...Typography.bodySmallSemiBold,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
  },
  textArea: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
  },
  addTagButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  tagText: {
    ...Typography.small,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: Radii.lg,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
  },
});
