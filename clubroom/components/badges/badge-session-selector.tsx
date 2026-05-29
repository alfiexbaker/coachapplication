import { View, StyleSheet, TextInput, FlatList, type ListRenderItemInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Session } from '@/constants/app-types';
import { getSessionAthleteName } from '@/utils/session-display';

interface BadgeSessionSelectorProps {
  sessionQuery: string;
  debouncedQuery?: string;
  onQueryChange: (query: string) => void;
  filteredSessions: Session[];
  totalSessions: number;
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  linkedAthlete: string;
  selectedSession: Session | null;
}

const getSessionLabel = (session: Session) => session.nextFocusAreas?.[0] ?? 'Coaching session';

function formatDate(date: Date | string): string {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown date';
  }
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function HighlightedText({
  text,
  query,
  color,
  highlightColor,
}: {
  text: string;
  query: string;
  color: string;
  highlightColor: string;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return <ThemedText style={{ color }}>{text}</ThemedText>;
  }

  const lower = text.toLowerCase();
  const start = lower.indexOf(normalizedQuery);
  if (start === -1) {
    return <ThemedText style={{ color }}>{text}</ThemedText>;
  }

  const end = start + normalizedQuery.length;
  return (
    <ThemedText style={{ color }}>
      {text.slice(0, start)}
      <ThemedText type="defaultSemiBold" style={{ color: highlightColor }}>
        {text.slice(start, end)}
      </ThemedText>
      {text.slice(end)}
    </ThemedText>
  );
}

export const BadgeSessionSelector = function BadgeSessionSelector({
  sessionQuery,
  debouncedQuery = '',
  onQueryChange,
  filteredSessions,
  totalSessions,
  selectedSessionId,
  onSelectSession,
  linkedAthlete,
  selectedSession,
}: BadgeSessionSelectorProps) {
  const { colors } = useTheme();
  const sessionItems = getBadgeSessionItems(
    filteredSessions,
    selectedSessionId,
    debouncedQuery,
    onSelectSession,
    colors,
  );

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
          maxLength={100}
        />
      </Row>

      <ThemedText style={[Typography.small, { color: colors.muted }]}>
        {filteredSessions.length} {filteredSessions.length === 1 ? 'session' : 'sessions'}
        {debouncedQuery.trim()
          ? ` of ${totalSessions} matching "${debouncedQuery.trim()}"`
          : totalSessions !== filteredSessions.length
            ? ` of ${totalSessions}`
            : ''}
      </ThemedText>

      {filteredSessions.length === 0 ? (
        <ThemedText style={[Typography.small, { color: colors.muted }]}>
          {debouncedQuery.trim()
            ? `No sessions match "${debouncedQuery.trim()}"`
            : 'No matching sessions yet'}
        </ThemedText>
      ) : (
        <FlatList
          data={sessionItems}
          keyExtractor={keyBadgeSessionItem}
          renderItem={renderBadgeSessionItem}
          style={styles.sessionList}
          contentContainerStyle={{ gap: Spacing.xs }}
        />
      )}
    </SurfaceCard>
  );
};

interface BadgeSessionItem {
  key: string;
  session: Session;
  athleteName: string;
  isSelected: boolean;
  query: string;
  colors: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
}

function getBadgeSessionItems(
  filteredSessions: Session[],
  selectedSessionId: string | null,
  debouncedQuery: string,
  onSelectSession: (id: string) => void,
  colors: ReturnType<typeof useTheme>['colors'],
): BadgeSessionItem[] {
  return filteredSessions.map((session) => ({
    key: session.id,
    session,
    athleteName: getSessionAthleteName(session),
    isSelected: session.id === selectedSessionId,
    query: debouncedQuery,
    colors,
    onPress: () => onSelectSession(session.id),
  }));
}

function keyBadgeSessionItem(item: BadgeSessionItem) {
  return item.key;
}

function renderBadgeSessionItem({ item }: ListRenderItemInfo<BadgeSessionItem>) {
  const { session, colors, isSelected, athleteName } = item;
  return (
    <Clickable
      onPress={item.onPress}
      style={[
        styles.sessionRow,
        {
          borderColor: isSelected ? colors.tint : colors.border,
          backgroundColor: isSelected ? withAlpha(colors.tint, 0.03) : colors.surface,
        },
      ]}
    >
      <Row gap="sm" align="center" style={{ flex: 1 }}>
        <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
          <ThemedText style={{ color: colors.tint, fontWeight: '700' }}>
            {athleteName.charAt(0)}
          </ThemedText>
        </View>
        <View style={styles.sessionMeta}>
          <HighlightedText
            text={athleteName}
            query={item.query}
            color={colors.text}
            highlightColor={colors.tint}
          />
          <HighlightedText
            text={`${getSessionLabel(session)} · ${formatDate(session.completedAt)}`}
            query={item.query}
            color={colors.muted}
            highlightColor={colors.tint}
          />
        </View>
      </Row>
      <Ionicons
        name={isSelected ? 'checkmark' : 'add'}
        size={16}
        color={isSelected ? colors.tint : colors.icon}
      />
    </Clickable>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm, padding: Spacing.sm },
  sessionPill: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  inputContainer: {
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  input: { flex: 1, ...Typography.bodySmall },
  sessionList: { maxHeight: 200 },
  sessionRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  sessionMeta: { flex: 1, gap: Spacing.micro },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
