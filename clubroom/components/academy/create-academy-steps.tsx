import { memo } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { SPECIALTY_OPTIONS, type WizardStep } from '@/hooks/use-create-academy';
import type { FootballObjective } from '@/constants/types';
import { Row } from '@/components/primitives';

interface Props {
  step: WizardStep;
  name: string; description: string; city: string; postcode: string;
  email: string; phone: string; website: string;
  specialties: FootballObjective[];
  setName: (v: string) => void; setDescription: (v: string) => void;
  setCity: (v: string) => void; setPostcode: (v: string) => void;
  setEmail: (v: string) => void; setPhone: (v: string) => void;
  setWebsite: (v: string) => void;
  toggleSpecialty: (s: FootballObjective) => void;
}

function InputGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={styles.inputGroup}><ThemedText style={styles.inputLabel}>{label}</ThemedText>{children}</View>;
}

export const CreateAcademyStepContent = memo(function CreateAcademyStepContent(props: Props) {
  const { colors: palette } = useTheme();
  const inputStyle = [styles.input, { backgroundColor: palette.surface, color: palette.text }];
  const textAreaStyle = [styles.textArea, { backgroundColor: palette.surface, color: palette.text }];

  switch (props.step) {
    case 'basics':
      return (
        <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepIcon, { backgroundColor: palette.tint }]}>
              <Ionicons name="people" size={28} color={palette.onPrimary} />
            </View>
            <ThemedText type="title" style={styles.stepTitle}>Create Your Team</ThemedText>
            <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>Set up a team to manage coaches, athletes, and training</ThemedText>
          </View>
          <InputGroup label="Team Name *">
            <TextInput style={inputStyle} placeholder="e.g., Under 12s, Girls Academy, First Team" placeholderTextColor={palette.muted} value={props.name} onChangeText={props.setName} />
          </InputGroup>
          <InputGroup label="City *">
            <TextInput style={inputStyle} placeholder="e.g., London" placeholderTextColor={palette.muted} value={props.city} onChangeText={props.setCity} />
          </InputGroup>
          <InputGroup label="Postcode *">
            <TextInput style={inputStyle} placeholder="e.g., E8 1AB" placeholderTextColor={palette.muted} value={props.postcode} onChangeText={props.setPostcode} autoCapitalize="characters" />
          </InputGroup>
        </Animated.View>
      );

    case 'details':
      return (
        <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
          <ThemedText type="title" style={styles.stepTitle}>Tell us more</ThemedText>
          <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>Help parents discover your team</ThemedText>
          <InputGroup label="Description">
            <TextInput style={textAreaStyle} placeholder="Describe your team, training philosophy, and what makes you unique..." placeholderTextColor={palette.muted} value={props.description} onChangeText={props.setDescription} multiline numberOfLines={4} />
          </InputGroup>
          <InputGroup label="Email">
            <TextInput style={inputStyle} placeholder="info@academy.com" placeholderTextColor={palette.muted} value={props.email} onChangeText={props.setEmail} keyboardType="email-address" autoCapitalize="none" />
          </InputGroup>
          <InputGroup label="Phone">
            <TextInput style={inputStyle} placeholder="+44 20 1234 5678" placeholderTextColor={palette.muted} value={props.phone} onChangeText={props.setPhone} keyboardType="phone-pad" />
          </InputGroup>
          <InputGroup label="Website">
            <TextInput style={inputStyle} placeholder="https://academy.com" placeholderTextColor={palette.muted} value={props.website} onChangeText={props.setWebsite} keyboardType="url" autoCapitalize="none" />
          </InputGroup>
        </Animated.View>
      );

    case 'specialties':
      return (
        <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
          <ThemedText type="title" style={styles.stepTitle}>Your Specialties</ThemedText>
          <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>What areas do you focus on?</ThemedText>
          <Row style={styles.specialtiesGrid}>
            {SPECIALTY_OPTIONS.map((specialty) => {
              const selected = props.specialties.includes(specialty);
              return (
                <Clickable key={specialty} onPress={() => props.toggleSpecialty(specialty)}
                  style={[styles.specialtyCard, { backgroundColor: selected ? withAlpha(palette.tint, 0.09) : palette.surface, borderColor: selected ? palette.tint : palette.border }]}>
                  {selected && (
                    <View style={[styles.checkIcon, { backgroundColor: palette.tint }]}>
                      <Ionicons name="checkmark" size={12} color={palette.onPrimary} />
                    </View>
                  )}
                  <ThemedText style={[styles.specialtyText, { color: selected ? palette.tint : palette.text }]}>{specialty}</ThemedText>
                </Clickable>
              );
            })}
          </Row>
        </Animated.View>
      );

    case 'review':
      return (
        <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
          <ThemedText type="title" style={styles.stepTitle}>Review & Create</ThemedText>
          <SurfaceCard style={styles.reviewCard}>
            <Row style={styles.reviewRow}><ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Name</ThemedText><ThemedText type="defaultSemiBold">{props.name}</ThemedText></Row>
            <Row style={styles.reviewRow}><ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Location</ThemedText><ThemedText>{props.city}, {props.postcode}</ThemedText></Row>
            {props.description ? <Row style={styles.reviewRow}><ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Description</ThemedText><ThemedText numberOfLines={2}>{props.description}</ThemedText></Row> : null}
            {props.email ? <Row style={styles.reviewRow}><ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Email</ThemedText><ThemedText>{props.email}</ThemedText></Row> : null}
            {props.specialties.length > 0 ? <Row style={styles.reviewRow}><ThemedText style={[styles.reviewLabel, { color: palette.muted }]}>Specialties</ThemedText><ThemedText>{props.specialties.join(', ')}</ThemedText></Row> : null}
          </SurfaceCard>
          <Row style={[styles.infoBox, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
            <Ionicons name="information-circle" size={20} color={palette.tint} />
            <ThemedText style={[styles.infoText, { color: palette.muted }]}>You can customize your branding (logo, colors) after creating your academy.</ThemedText>
          </Row>
        </Animated.View>
      );
  }
});

const styles = StyleSheet.create({
  stepContent: { gap: Spacing.lg },
  stepHeader: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  stepIcon: { width: 64, height: 64, borderRadius: Radii['2xl'], alignItems: 'center', justifyContent: 'center' },
  stepTitle: { textAlign: 'center' },
  stepSubtitle: { textAlign: 'center', ...Typography.bodySmall },
  inputGroup: { gap: Spacing.xs },
  inputLabel: { ...Typography.smallSemiBold },
  input: { height: 48, borderRadius: Radii.md, paddingHorizontal: Spacing.md, ...Typography.body },
  textArea: { minHeight: 100, borderRadius: Radii.md, padding: Spacing.md, ...Typography.body, textAlignVertical: 'top' },
  specialtiesGrid: { flexWrap: 'wrap', gap: Spacing.sm },
  specialtyCard: { width: '47%', padding: Spacing.md, borderRadius: Radii.md, borderWidth: 2, position: 'relative' },
  checkIcon: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  specialtyText: { ...Typography.bodySmallSemiBold, textAlign: 'center' },
  reviewCard: { gap: Spacing.sm },
  reviewRow: { justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: Spacing.xs },
  reviewLabel: { ...Typography.small, flex: 1 },
  infoBox: { alignItems: 'flex-start', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radii.md },
  infoText: { flex: 1, ...Typography.small },
});
