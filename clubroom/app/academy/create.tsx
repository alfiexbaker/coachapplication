import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useScreen } from '@/hooks/use-screen';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { ok } from '@/types/result';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { CreateAcademyStepContent } from '@/components/academy/create-academy-steps';
import { Spacing, Radii } from '@/constants/theme';
import { useCreateAcademy } from '@/hooks/use-create-academy';

export default function CreateAcademyScreen() {
  const { status, error, retry, colors: palette } = useScreen<boolean>({
    load: async () => ok(true),
    isEmpty: () => false,
    refetchOnFocus: true,
  });
  const {
    step, steps, currentStepIndex, loading,
    name, description, city, postcode, email, phone, website, specialties,
    setName, setDescription, setCity, setPostcode, setEmail, setPhone, setWebsite,
    canProceed, goNext, goBack, toggleSpecialty, handleCreate,
  } = useCreateAcademy();

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <ErrorState message={error?.message || 'Failed to open academy creation.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <EmptyState
          icon="business-outline"
          title="Creation unavailable"
          message="The academy setup flow is currently unavailable."
          actionLabel="Retry"
          onPressAction={retry}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        {/* Header */}
        <Row style={styles.header}>
          <Clickable accessibilityLabel="Go back" onPress={goBack} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="subtitle" style={{ flex: 1, textAlign: 'center' }}>Create Academy</ThemedText>
          <View style={{ width: 24 }} />
        </Row>

        {/* Progress */}
        <Row style={styles.progressContainer}>
          {steps.map((s, i) => (
            <View key={s} style={[styles.progressDot, { backgroundColor: i <= currentStepIndex ? palette.tint : palette.border }]} />
          ))}
        </Row>

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
  header: { alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  progressContainer: { justifyContent: 'center', gap: Spacing.xs, paddingBottom: Spacing.md },
  progressDot: { width: 8, height: 8, borderRadius: Radii.xs },
  scrollContent: { padding: Spacing.lg, paddingTop: 0 },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
});
