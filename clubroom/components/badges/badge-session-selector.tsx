import { memo } from 'react';
import { View, StyleSheet, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatDate } from '@/constants/mock-data';
import type { Session } from '@/constants/app-types';

interface BadgeSessionSelectorProps {
  sessionQuery: string;
  onQueryChange: (query: string) => void;
  filteredSessions: Session[];
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  linkedAthlete: string;
  selectedSession: Session | null;
}

const getSessionLabel = (session: Session) => session.nextFocusAreas?.[0] ?? 'Coaching session';

export const BadgeSessionSelector = memo(function BadgeSessionSelector({
  sessionQuery, onQueryChange, filteredSessions, selectedSessionId, onSelectSession,
  linkedAthlete, selectedSession,
}: BadgeSessionSelectorProps) {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <Row align="center" justify="space-between" gap="sm">
        <Row gap="xs" align="center">
          <Ionicons name="link" size={16} color={colors.icon} />
          <ThemedText type="defaultSemiBold">Link to session</ThemedText>
        </Row>
        {selectedSession ? (
          <Row style={[styles.sessionPill, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.tint} />
            <ThemedText style={[Typography.caption, { color: colors.tint }]}>
              {linkedAthlete} · {formatDate(selectedSession.completedAt)}
            </ThemedText>
          </Row>
        ) : (
          <ThemedText style={{ color: colors.muted }}>Optional</ThemedText>
        )}
      </Row>

      <Row style={[styles.inputContainer, { borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.icon} />
        <TextInput
          placeholder="Search sessions by athlete or format"
          placeholderTextColor={colors.muted}
          value={sessionQuery}
          onChangeText={onQueryChange}
          style={[styles.input, { color: colors.foreground }]}
        />
      </Row>

      {filteredSessions.length === 0 ? (
        <ThemedText style={[Typography.small, { color: colors.muted }]}>No matching sessions yet</ThemedText>
      ) : (
        <ScrollView style={styles.sessionList} contentContainerStyle={{ gap: Spacing.xs }}>
          {filteredSessions.map((session) => {
            const isSelected = session.id === selectedSessionId;
            const athleteName = session.athleteName ?? 'Athlete';
            return (
              <Clickable
                key={session.id}
                onPress={() => onSelectSession(session.id)}
                style={[styles.sessionRow, { borderColor: isSelected ? colors.tint : colors.border, backgroundColor: isSelected ? withAlpha(colors.tint, 0.03) : colors.surface }]}
              >
                <Row gap="sm" align="center" style={{ flex: 1 }}>
                  <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
                    <ThemedText style={{ color: colors.tint, fontWeight: '700' }}>{athleteName.charAt(0)}</ThemedText>
                  </View>
                  <View style={styles.sessionMeta}>
                    <ThemedText type="defaultSemiBold">{athleteName}</ThemedText>
                    <ThemedText style={{ color: colors.muted }}>{getSessionLabel(session)} · {formatDate(session.completedAt)}</ThemedText>
                  </View>
                </Row>
                <Ionicons name={isSelected ? 'checkmark' : 'add'} size={16} color={isSelected ? colors.tint : colors.icon} />
              </Clickable>
            );
          })}
        </ScrollView>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm, padding: Spacing.sm },
  sessionPill: { alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  inputContainer: { alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.sm, paddingVertical: 8 },
  input: { flex: 1, ...Typography.bodySmall },
  sessionList: { maxHeight: 200 },
  sessionRow: { alignItems: 'center', justifyContent: 'space-between', padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  sessionMeta: { flex: 1, gap: Spacing.micro },
  avatar: { width: 36, height: 36, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
});
