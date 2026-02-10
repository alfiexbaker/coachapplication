import { ScrollView, StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { CreateMatchDetails } from '@/components/match/create-match-details';
import { CreateMatchSchedule } from '@/components/match/create-match-schedule';
import { CreateMatchSquad } from '@/components/match/create-match-squad';
import { CreateMatchReview } from '@/components/match/create-match-review';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCreateMatch } from '@/hooks/use-create-match';

export default function CreateMatchScreen() {
  const { colors } = useTheme();
  const {
    step, currentStepIndex, totalSteps, isSubmitting,
    matchType, setMatchType, opponent, setOpponent, isHome, setIsHome,
    venue, setVenue, address, setAddress, date, setDate,
    kickoffTime, setKickoffTime, meetTime, setMeetTime,
    maxPlayers, setMaxPlayers, notes, setNotes,
    selectedSquadId, setSelectedSquadId, selectedSquad,
    squads, squadMemberCount, autoInvite, setAutoInvite,
    handleNext, handleBack, handleSubmit,
  } = useCreateMatch();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <PageContainer
          header={<PageHeader title="Create Match" subtitle={`Step ${currentStepIndex + 1} of ${totalSteps}`} showBack onBackPress={handleBack} />}
          gap={0} horizontalSpacing={0}
        >
          <Row justify="center" gap="xs" style={styles.progress}>
            {Array.from({ length: totalSteps }, (_, i) => (
              <View key={i} style={[styles.progressDot, { backgroundColor: i <= currentStepIndex ? colors.tint : colors.border }]} />
            ))}
          </Row>

          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {step === 'details' && (
              <CreateMatchDetails
                matchType={matchType} opponent={opponent} isHome={isHome} venue={venue} address={address} colors={colors}
                onMatchTypeChange={setMatchType} onOpponentChange={setOpponent} onIsHomeChange={setIsHome} onVenueChange={setVenue} onAddressChange={setAddress}
              />
            )}
            {step === 'schedule' && (
              <CreateMatchSchedule
                date={date} kickoffTime={kickoffTime} meetTime={meetTime} maxPlayers={maxPlayers} notes={notes} colors={colors}
                onDateChange={setDate} onKickoffTimeChange={setKickoffTime} onMeetTimeChange={setMeetTime} onMaxPlayersChange={setMaxPlayers} onNotesChange={setNotes}
              />
            )}
            {step === 'squad' && (
              <CreateMatchSquad
                squads={squads} selectedSquadId={selectedSquadId} squadMemberCount={squadMemberCount} autoInvite={autoInvite} colors={colors}
                onSelectSquad={setSelectedSquadId} onAutoInviteChange={setAutoInvite}
              />
            )}
            {step === 'review' && (
              <CreateMatchReview
                matchType={matchType} opponent={opponent} isHome={isHome} venue={venue} date={date} kickoffTime={kickoffTime}
                meetTime={meetTime} maxPlayers={maxPlayers} notes={notes} selectedSquad={selectedSquad} squadMemberCount={squadMemberCount}
                autoInvite={autoInvite} colors={colors}
              />
            )}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            {step === 'review' ? (
              <Clickable style={[styles.primaryBtn, { backgroundColor: colors.tint }]} onPress={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <ThemedText style={[Typography.subheading, { color: colors.onPrimary }]}>Creating...</ThemedText>
                ) : (
                  <Row align="center" justify="center" gap="sm">
                    <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} />
                    <ThemedText style={[Typography.subheading, { color: colors.onPrimary }]}>Create Match</ThemedText>
                  </Row>
                )}
              </Clickable>
            ) : (
              <Clickable style={[styles.primaryBtn, { backgroundColor: colors.tint }]} onPress={handleNext}>
                <Row align="center" justify="center" gap="sm">
                  <ThemedText style={[Typography.subheading, { color: colors.onPrimary }]}>Continue</ThemedText>
                  <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
                </Row>
              </Clickable>
            )}
          </View>
        </PageContainer>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  progress: { padding: Spacing.md },
  progressDot: { width: 32, height: 4, borderRadius: Radii.xs },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xl * 2 },
  footer: { padding: Spacing.md, borderTopWidth: 1 },
  primaryBtn: { padding: Spacing.md, borderRadius: Radii.md },
});
