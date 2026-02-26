/**
 * Attendee List Modal
 *
 * Bottom sheet modal showing RSVP respondents grouped by status.
 */

import { memo, useState, useCallback } from 'react';
import { View, StyleSheet, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { InviteRsvpResponse } from '@/constants/types';

import { AttendeeRow } from './attendee-list-modal-sections';
import { Row } from '@/components/primitives';
import { AccessibleListCell } from '@/components/ui/list-accessibility';

// Re-export extracted components for backward compat
export { AttendeeRow } from './attendee-list-modal-sections';
export type { AttendeeRowProps } from './attendee-list-modal-sections';

interface AttendeeListModalProps {
  visible: boolean;
  onClose: () => void;
  responses: InviteRsvpResponse[];
  counts: { going: number; maybe: number; cantGo: number };
}

type SectionKey = 'going' | 'maybe' | 'cant_go';

interface SectionConfig {
  key: SectionKey;
  label: string;
  colorKey: 'success' | 'warning' | 'error';
  count: number;
}

function AttendeeListModalComponent({
  visible,
  onClose,
  responses,
  counts,
}: AttendeeListModalProps) {
  const { colors: palette } = useTheme();
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(
    new Set(['going', 'maybe', 'cant_go']),
  );

  const toggleSection = useCallback((key: SectionKey) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const sections: SectionConfig[] = [
    { key: 'going', label: 'Going', colorKey: 'success', count: counts.going },
    { key: 'maybe', label: 'Maybe', colorKey: 'warning', count: counts.maybe },
    { key: 'cant_go', label: "Can't Go", colorKey: 'error', count: counts.cantGo },
  ];

  const totalResponses = counts.going + counts.maybe + counts.cantGo;

  const renderSectionItem = useCallback(
    ({ item: section }: { item: SectionConfig }) => {
      const sectionResponses = responses.filter((r) => r.status === section.key);
      const isExpanded = expandedSections.has(section.key);
      const color = palette[section.colorKey];

      return (
        <View style={styles.section}>
          <Clickable
            onPress={() => toggleSection(section.key)}
            style={styles.sectionHeader}
            accessibilityLabel={`${section.label} section, ${section.count} responses`}
          >
            <Row style={styles.sectionLabelRow}>
              <View style={[styles.statusDot, { backgroundColor: color }]} />
              <ThemedText style={styles.sectionLabel}>{section.label}</ThemedText>
              <View style={[styles.countBadge, { backgroundColor: withAlpha(color, 0.12) }]}>
                <ThemedText style={[styles.countText, { color }]}>{section.count}</ThemedText>
              </View>
            </Row>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={palette.muted}
            />
          </Clickable>
          {isExpanded &&
            sectionResponses.map((resp) => <AttendeeRow key={resp.id} response={resp} />)}
        </View>
      );
    },
    [responses, expandedSections, palette, toggleSection],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Clickable
        style={[styles.overlay, { backgroundColor: withAlpha(palette.text, 0.4) }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close attendee list"
      >
        <View
          style={[styles.sheet, { backgroundColor: palette.surface }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={[styles.handleBar, { backgroundColor: palette.border }]} />
          <Row style={styles.header}>
            <ThemedText type="heading">Responses</ThemedText>
            <Clickable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={palette.text} />
            </Clickable>
          </Row>
          {totalResponses === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={palette.muted} />
              <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                No responses yet
              </ThemedText>
            </View>
          ) : (
            <FlatList
        CellRendererComponent={AccessibleListCell}
        accessibilityRole="list"
              data={sections}
              keyExtractor={(item) => item.key}
              renderItem={renderSectionItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </Clickable>
    </Modal>
  );
}

export const AttendeeListModal = memo(AttendeeListModalComponent);

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    paddingBottom: Spacing.lg,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: Radii.sm,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  section: { marginBottom: Spacing.sm },
  sectionHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  sectionLabelRow: { alignItems: 'center', gap: Spacing.xs },
  statusDot: { width: 10, height: 10, borderRadius: Radii.full },
  sectionLabel: { ...Typography.bodySemiBold },
  countBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  countText: { ...Typography.caption, fontWeight: '600' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: { ...Typography.bodySmall },
});
