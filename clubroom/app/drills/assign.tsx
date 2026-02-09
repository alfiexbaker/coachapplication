/**
 * Assign Drill Screen
 *
 * Screen for coaches to assign a drill to an athlete.
 * Allows setting due date, notes, repetitions, and priority.
 */

import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { LoadingState } from '@/components/ui/screen-states';
import { AssignDrillForm } from '@/components/drills/assign-drill-form';
import { Spacing, Typography } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';
import { useTheme } from '@/hooks/useTheme';
import { useDrillAssign } from '@/hooks/use-drill-assign';

export default function AssignDrillScreen() {
  const { colors } = useTheme();
  const {
    drill, athletes, loading, submitting,
    selectedAthlete, notes, setNotes,
    repetitions, setRepetitions, priority,
    daysFromNow, formattedDate,
    handleDateSelect, handlePrioritySelect, handleAthleteSelect, handleSubmit,
  } = useDrillAssign();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (!drill) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <Row align="center" justify="space-between" style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Clickable>
        </Row>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.muted} />
          <ThemedText type="subtitle" style={{ marginTop: Spacing.md }}>No Drill Selected</ThemedText>
          <ThemedText style={{ color: colors.muted, marginTop: Spacing.xs }}>Please select a drill from your library first.</ThemedText>
          <Button onPress={() => router.push(Routes.DRILLS_LIBRARY)} style={{ marginTop: Spacing.lg }}>Go to Library</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Row align="center" justify="space-between" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <ThemedText type="subtitle" style={[Typography.heading, { fontSize: scaleFont(Typography.heading.fontSize) }]}>Assign Drill</ThemedText>
        <View style={{ width: 24 }} />
      </Row>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <AssignDrillForm
            drill={drill} athletes={athletes} selectedAthlete={selectedAthlete}
            daysFromNow={daysFromNow} formattedDate={formattedDate}
            priority={priority} repetitions={repetitions} notes={notes} colors={colors}
            onAthleteSelect={handleAthleteSelect} onDateSelect={handleDateSelect}
            onPrioritySelect={handlePrioritySelect} onRepetitionsChange={setRepetitions} onNotesChange={setNotes}
          />

          <Animated.View entering={FadeInDown.delay(400).springify()} style={{ marginTop: Spacing.md }}>
            <Button onPress={handleSubmit} disabled={submitting || !selectedAthlete}>
              {submitting ? 'Assigning...' : selectedAthlete ? `Assign to ${selectedAthlete.name.split(' ')[0]}` : 'Select an Athlete'}
            </Button>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'] },
});
