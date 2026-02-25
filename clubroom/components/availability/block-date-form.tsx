import React from 'react';
import { View, ScrollView, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

type ReasonOption = {
  key: string;
  label: string;
  icon: string;
};

type Props = {
  colors: ThemeColors;
  dates: Date[];
  selectedDate: Date;
  reason: string;
  customReason: string;
  saving: boolean;
  reasonOptions: ReasonOption[];
  formatDate: (date: Date) => string;
  isSameDay: (d1: Date, d2: Date) => boolean;
  onSelectDate: (date: Date) => void;
  onSelectReason: (reason: string) => void;
  onSetCustomReason: (value: string) => void;
  onSave: () => void;
};

export const BlockDateForm = React.memo(function BlockDateForm({
  colors,
  dates,
  selectedDate,
  reason,
  customReason,
  saving,
  reasonOptions,
  formatDate,
  isSameDay,
  onSelectDate,
  onSelectReason,
  onSetCustomReason,
  onSave,
}: Props) {
  const notesError =
    reason === 'other' && customReason.trim().length < 10 ? 'Please provide a brief reason' : null;
  const canSave = !saving && (reason !== 'other' || !notesError);
  return (
    <>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle">Select Date to Block</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Row style={styles.dateGrid}>
              {dates.map((date, index) => {
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());
                return (
                  <Clickable
                    key={index}
                    style={[
                      styles.dateCard,
                      {
                        borderColor: isSelected ? colors.error : colors.border,
                        backgroundColor: isSelected
                          ? withAlpha(colors.error, 0.09)
                          : colors.surface,
                      },
                    ]}
                    onPress={() => onSelectDate(date)}
                  >
                    <ThemedText style={[styles.dateDay, { color: colors.muted }]}>
                      {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </ThemedText>
                    <ThemedText
                      type="defaultSemiBold"
                      style={[styles.dateNum, isSelected ? { color: colors.error } : null]}
                    >
                      {date.getDate()}
                    </ThemedText>
                    <ThemedText style={[styles.dateMonth, { color: colors.muted }]}>
                      {date.toLocaleDateString('en-GB', { month: 'short' })}
                    </ThemedText>
                    {isToday ? (
                      <View style={[styles.todayDot, { backgroundColor: colors.tint }]} />
                    ) : null}
                  </Clickable>
                );
              })}
            </Row>
          </ScrollView>
        </SurfaceCard>

        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle">Reason (shown to clients)</ThemedText>
          <Row style={styles.reasonGrid}>
            {reasonOptions.map((option) => {
              const isSelected = reason === option.key;
              return (
                <Clickable
                  key={option.key}
                  style={[
                    styles.reasonCard,
                    {
                      borderColor: isSelected ? colors.tint : colors.border,
                      backgroundColor: isSelected ? withAlpha(colors.tint, 0.06) : colors.surface,
                    },
                  ]}
                  onPress={() => onSelectReason(option.key)}
                >
                  <Ionicons
                    name={option.icon as keyof typeof Ionicons.glyphMap}
                    size={24}
                    color={isSelected ? colors.tint : colors.muted}
                  />
                  <ThemedText
                    style={[styles.reasonLabel, isSelected ? { color: colors.tint } : null]}
                  >
                    {option.label}
                  </ThemedText>
                </Clickable>
              );
            })}
          </Row>

          {reason === 'other' ? (
            <View style={{ gap: Spacing.xs }}>
              <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                This helps athletes understand your availability
              </ThemedText>
              <TextInput
                style={[styles.input, { borderColor: notesError ? colors.error : colors.border, color: colors.text }]}
                placeholder="Enter reason..."
                placeholderTextColor={colors.muted}
                value={customReason}
                onChangeText={onSetCustomReason}
                accessibilityLabel="Custom reason"
                maxLength={200}
                multiline
              />
              <ThemedText
                style={[
                  Typography.caption,
                  { color: customReason.length > 180 ? colors.error : colors.muted, textAlign: 'right' },
                ]}
              >
                {customReason.length}/200
              </ThemedText>
              {notesError ? (
                <ThemedText style={[Typography.caption, { color: colors.error }]}>{notesError}</ThemedText>
              ) : null}
            </View>
          ) : null}
        </SurfaceCard>

        <SurfaceCard style={[styles.section, { backgroundColor: withAlpha(colors.error, 0.03) }]}>
          <Row style={styles.previewHeader}>
            <Ionicons name="close-circle" size={20} color={colors.error} />
            <ThemedText type="defaultSemiBold">Preview</ThemedText>
          </Row>
          <ThemedText style={{ color: colors.muted }}>
            {formatDate(selectedDate)} will be blocked
          </ThemedText>
          <ThemedText style={{ color: colors.muted }}>
            Reason:{' '}
            {reason === 'other'
              ? customReason || 'Not specified'
              : reasonOptions.find((r) => r.key === reason)?.label}
          </ThemedText>
        </SurfaceCard>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { backgroundColor: colors.background, borderTopColor: colors.border },
        ]}
      >
        <Clickable
          style={[styles.saveButton, { backgroundColor: canSave ? colors.error : colors.muted }]}
          onPress={onSave}
          disabled={!canSave}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.onPrimary} />
          ) : (
            <Row align="center" justify="center" gap="sm">
              <Ionicons name="close-circle" size={22} color={colors.onPrimary} />
              <ThemedText style={[styles.saveButtonText, { color: colors.onPrimary }]}>
                Block This Date
              </ThemedText>
            </Row>
          )}
        </Clickable>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  content: { flex: 1 },
  contentInner: { padding: Spacing.md, paddingBottom: 100, gap: Spacing.md },
  section: { padding: Spacing.md, gap: Spacing.sm },
  dateGrid: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  dateCard: {
    width: 70,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: Spacing.micro,
  },
  dateDay: { ...Typography.caption },
  dateNum: { ...Typography.title },
  dateMonth: { ...Typography.caption },
  todayDot: { width: 6, height: 6, borderRadius: Radii.xs, marginTop: Spacing.xxs },
  reasonGrid: { flexWrap: 'wrap', gap: Spacing.sm },
  reasonCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 148,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  reasonLabel: { ...Typography.smallSemiBold, textAlign: 'center' },
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.md,
    ...Typography.subheading,
    marginTop: Spacing.sm,
  },
  previewHeader: { alignItems: 'center', gap: Spacing.sm },
  footer: { padding: Spacing.md, borderTopWidth: 1 },
  saveButton: {
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  saveButtonText: { ...Typography.heading },
});
