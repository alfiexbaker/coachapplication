/**
 * Attendee List Modal
 *
 * Bottom sheet modal showing RSVP respondents grouped by status.
 * Collapsible sections: Going (green), Maybe (yellow), Can't Go (red).
 */

import { memo, useState, useCallback } from 'react';
import { View, StyleSheet, Modal, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { InviteRsvpResponse } from '@/constants/types';

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

const AttendeeRow = memo(function AttendeeRowComponent({ response }: { response: InviteRsvpResponse }) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.attendeeRow}>
      {response.userPhotoUrl ? (
        <Image source={{ uri: response.userPhotoUrl }} style={styles.attendeeAvatar} contentFit="cover" />
      ) : (
        <View style={[styles.attendeeAvatar, styles.avatarPlaceholder, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
          <ThemedText style={[styles.avatarInitial, { color: palette.tint }]}>
            {response.userName.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
      )}
      <View style={styles.attendeeInfo}>
        <ThemedText style={styles.attendeeName}>{response.userName}</ThemedText>
        {response.childName && (
          <ThemedText style={[styles.childName, { color: palette.muted }]}>
            for {response.childName}
          </ThemedText>
        )}
      </View>
    </View>
  );
});

function AttendeeListModalComponent({ visible, onClose, responses, counts }: AttendeeListModalProps) {
  const { colors: palette } = useTheme();
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(new Set(['going', 'maybe', 'cant_go']));

  const toggleSection = useCallback((key: SectionKey) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const sections: SectionConfig[] = [
    { key: 'going', label: 'Going', colorKey: 'success', count: counts.going },
    { key: 'maybe', label: 'Maybe', colorKey: 'warning', count: counts.maybe },
    { key: 'cant_go', label: "Can't Go", colorKey: 'error', count: counts.cantGo },
  ];

  const totalResponses = counts.going + counts.maybe + counts.cantGo;

  const renderSectionItem = useCallback(({ item: section }: { item: SectionConfig }) => {
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
          <View style={styles.sectionLabelRow}>
            <View style={[styles.statusDot, { backgroundColor: color }]} />
            <ThemedText style={styles.sectionLabel}>{section.label}</ThemedText>
            <View style={[styles.countBadge, { backgroundColor: withAlpha(color, 0.12) }]}>
              <ThemedText style={[styles.countText, { color }]}>
                {section.count}
              </ThemedText>
            </View>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={palette.muted}
          />
        </Clickable>

        {isExpanded &&
          sectionResponses.map((resp) => (
            <AttendeeRow key={resp.id} response={resp} />
          ))}
      </View>
    );
  }, [responses, expandedSections, palette, toggleSection]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: withAlpha(palette.text, 0.4) }]} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: palette.surface }]} onPress={() => {}}>
          {/* Handle bar */}
          <View style={[styles.handleBar, { backgroundColor: palette.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="heading">Responses</ThemedText>
            <Clickable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={palette.text} />
            </Clickable>
          </View>

          {totalResponses === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={palette.muted} />
              <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                No responses yet
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={sections}
              keyExtractor={(item) => item.key}
              renderItem={renderSectionItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export const AttendeeListModal = memo(AttendeeListModalComponent);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.full,
  },
  sectionLabel: {
    ...Typography.bodySemiBold,
  },
  countBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  countText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingLeft: Spacing.md,
  },
  attendeeAvatar: {
    width: 28,
    height: 28,
    borderRadius: Radii.full,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...Typography.caption,
    fontWeight: '600',
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeName: {
    ...Typography.bodySmall,
  },
  childName: {
    ...Typography.caption,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.bodySmall,
  },
});
