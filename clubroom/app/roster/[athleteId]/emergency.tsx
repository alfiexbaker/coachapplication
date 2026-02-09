/**
 * Emergency Quick Access Screen
 *
 * Displays athlete emergency info: medical alerts, contacts, doctor, consent.
 * All state/logic in useEmergencyAccess hook. Detail sections extracted to component.
 */

import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { EmergencyQuickCard } from '@/components/safety/EmergencyQuickCard';
import { EmergencyDetails } from '@/components/safety/emergency-details';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useEmergencyAccess } from '@/hooks/use-emergency-access';

export default function EmergencyQuickAccessScreen() {
  const { colors: palette } = useTheme();
  const e = useEmergencyAccess();

  if (e.loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}><Ionicons name="arrow-back" size={24} color={palette.text} /></Clickable>
          <ThemedText type="title">Emergency Info</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>Loading emergency information...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (e.error || !e.emergencyData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}><Ionicons name="arrow-back" size={24} color={palette.text} /></Clickable>
          <ThemedText type="title">Emergency Info</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <EmptyState icon="medical-outline" title="Unable to Load" message={e.error || 'Could not load emergency information for this athlete.'} actionLabel="Try Again" onPressAction={e.loadData} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}><Ionicons name="arrow-back" size={24} color={palette.text} /></Clickable>
        <View style={styles.headerCenter}>
          <ThemedText type="title">Emergency Info</ThemedText>
          {e.emergencyData.isCached && (
            <View style={[styles.cachedBadge, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
              <Ionicons name="cloud-offline" size={12} color={palette.warning} />
              <ThemedText style={[styles.cachedText, { color: palette.warning }]}>Cached</ThemedText>
            </View>
          )}
        </View>
        <Clickable onPress={e.handleRefresh} hitSlop={8} disabled={e.refreshing}>
          <Ionicons name="refresh" size={22} color={e.refreshing ? palette.muted : palette.tint} />
        </Clickable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={e.refreshing} onRefresh={e.handleRefresh} tintColor={palette.tint} />}
      >
        <Animated.View entering={FadeInDown.springify()}>
          <EmergencyQuickCard
            athleteName={e.emergencyData.athleteName} alertLevel={e.emergencyData.alertLevel}
            allergies={e.emergencyData.allergies} conditions={e.emergencyData.conditions}
            medications={e.emergencyData.medications} primaryContact={e.emergencyData.primaryContact}
            onCallPrimary={e.emergencyData.primaryContact ? () => e.handleCallContact(e.emergencyData!.primaryContact!.phone, e.emergencyData!.primaryContact!.name) : undefined}
          />
        </Animated.View>

        <EmergencyDetails data={e.emergencyData} onCallContact={e.handleCallContact} onCallDoctor={e.handleCallDoctor} />

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerCenter: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: Spacing.xs },
  cachedBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.xs, paddingVertical: Spacing.micro, borderRadius: Radii.pill },
  cachedText: { ...Typography.micro },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  loadingText: { ...Typography.bodySmall },
  content: { padding: Spacing.lg, gap: Spacing.md },
  bottomSpacer: { height: 40 },
});
