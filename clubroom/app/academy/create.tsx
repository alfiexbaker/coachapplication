import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { CreateAcademyStepContent } from '@/components/academy/create-academy-steps';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCreateAcademy } from '@/hooks/use-create-academy';

export default function CreateAcademyScreen() {
  const { colors: palette } = useTheme();
  const {
    step, steps, currentStepIndex, loading,
    name, description, city, postcode, email, phone, website, specialties,
    setName, setDescription, setCity, setPostcode, setEmail, setPhone, setWebsite,
    canProceed, goNext, goBack, toggleSpecialty, handleCreate,
  } = useCreateAcademy();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        {/* Header */}
        <View style={styles.header}>
          <Clickable accessibilityLabel="Go back" onPress={goBack} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="subtitle" style={{ flex: 1, textAlign: 'center' }}>Create Academy</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          {steps.map((s, i) => (
            <View key={s} style={[styles.progressDot, { backgroundColor: i <= currentStepIndex ? palette.tint : palette.border }]} />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <CreateAcademyStepContent
            step={step} name={name} description={description} city={city} postcode={postcode}
            email={email} phone={phone} website={website} specialties={specialties}
            setName={setName} setDescription={setDescription} setCity={setCity} setPostcode={setPostcode}
            setEmail={setEmail} setPhone={setPhone} setWebsite={setWebsite} toggleSpecialty={toggleSpecialty}
          />
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          {step === 'review' ? (
            <Button onPress={handleCreate} disabled={loading}>{loading ? 'Creating...' : 'Create Academy'}</Button>
          ) : (
            <Button onPress={goNext} disabled={!canProceed()}>Continue</Button>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  progressContainer: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xs, paddingBottom: Spacing.md },
  progressDot: { width: 8, height: 8, borderRadius: Radii.xs },
  scrollContent: { padding: Spacing.lg, paddingTop: 0 },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
});
