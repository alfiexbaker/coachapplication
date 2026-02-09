/**
 * Multi-Week Booking Screen
 *
 * Select multiple weeks of sessions and book as a series.
 * All state/logic in useMultiWeek hook.
 */

import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { MultiWeekPicker } from '@/components/bookings/multi-week-picker';
import { MultiWeekConfirmation } from '@/components/bookings/multi-week-confirmation';
import { Spacing, Typography, Radii, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useMultiWeek } from '@/hooks/use-multi-week';

export default function MultiWeekScreen() {
  const { colors: palette } = useTheme();
  const c = useMultiWeek();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Clickable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerText}>
          <ThemedText type="defaultSemiBold">Book Multiple Weeks</ThemedText>
          <ThemedText style={[Typography.small, { color: palette.muted }]}>{c.coachName} - {c.sessionType}</ThemedText>
        </View>
      </View>

      {c.loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={palette.tint} size="large" />
          <ThemedText style={[Typography.small, { color: palette.muted }]}>Loading availability...</ThemedText>
        </View>
      ) : c.showConfirmation ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <MultiWeekConfirmation selectedWeeks={c.selectedWeekRows} coachName={c.coachName}
            sessionType={c.sessionType} location={c.primaryLocation}
            loading={c.submitting} onConfirm={c.handleConfirm} onCancel={c.handleCancelConfirmation} />
        </ScrollView>
      ) : (
        <>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.infoBanner, { backgroundColor: withAlpha(palette.info, 0.06) }]}>
              <Ionicons name="information-circle-outline" size={18} color={palette.info} />
              <ThemedText style={[Typography.small, { color: palette.info, flex: 1 }]}>
                Select the weeks you want to book. Each session is at the same time and location.
              </ThemedText>
            </View>
            <MultiWeekPicker weeks={c.weeks} selectedWeeks={c.selectedWeeks} onToggleWeek={c.handleToggleWeek} />
          </ScrollView>
          <View style={[styles.footer, { borderTopColor: palette.border, backgroundColor: palette.surface }]}>
            <Button variant="primary" onPress={c.handleShowConfirmation} disabled={c.selectedWeeks.size === 0} style={styles.footerButton}>
              {`Review ${c.selectedWeeks.size} Week${c.selectedWeeks.size !== 1 ? 's' : ''}`}
            </Button>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.xs },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: Spacing.micro },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.md, gap: Spacing.md },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs, padding: Spacing.sm, borderRadius: Radii.md },
  footer: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  footerButton: { width: '100%' },
});
