/**
 * Group Sessions Screen
 *
 * Browse and filter group training sessions: camps, clinics,
 * open sessions, and trials. Coach can create new sessions.
 */

import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { EmptyState } from '@/components/ui/empty-state';
import { GroupSessionCard } from '@/components/group/group-session-card';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useGroupSessions, SESSION_FILTERS } from '@/hooks/use-group-sessions';

export default function GroupSessionsScreen() {
  const { colors } = useTheme();
  const { sessions, status, error, refreshing, onRefresh, retry, filter, setFilter, isCoach } = useGroupSessions();

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <ErrorState message={error?.message || 'Failed to load group sessions.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Row gap="md" align="center" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <View style={{ flex: 1 }}>
          <ThemedText type="title">Group Sessions</ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted, marginTop: Spacing.micro }]}>Camps, clinics & open training</ThemedText>
        </View>
        {isCoach && (
          <Clickable accessibilityLabel="Create group session" onPress={() => router.push(Routes.GROUP_SESSIONS_CREATE)} style={[styles.createButton, { backgroundColor: colors.tint }]}>
            <Ionicons name="add" size={20} color={colors.onPrimary} />
          </Clickable>
        )}
      </Row>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContainer} style={styles.filtersScroll}>
        {SESSION_FILTERS.map((f) => (
          <Clickable key={f.key} onPress={() => setFilter(f.key)} style={[styles.filterChip, { backgroundColor: filter === f.key ? colors.tint : colors.surface }]}>
            <ThemedText style={[Typography.smallSemiBold, { color: filter === f.key ? colors.onPrimary : colors.text }]}>{f.label}</ThemedText>
          </Clickable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {sessions.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No sessions found"
            message={filter !== 'ALL' ? `No ${SESSION_FILTERS.find((f) => f.key === filter)?.label.toLowerCase()} available` : 'Check back later for upcoming group sessions'}
          />
        ) : (
          <View style={{ gap: Spacing.md }}>
            {sessions.map((session, index) => (
              <GroupSessionCard key={session.id} session={session} index={index} onPress={() => router.push(Routes.groupSession(session.id))} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  createButton: { width: 36, height: 36, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  filtersScroll: { flexGrow: 0 },
  filtersContainer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.sm },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.full },
  content: { padding: Spacing.lg, paddingTop: 0 },
});
