/**
 * BlockDateModal — Composition root.
 * Coach blocks time off: single day, date range, or holiday presets.
 */
import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Modal, ScrollView, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { toDateStr } from '@/utils/format';
import { createLogger } from '@/utils/logger';
import { BLOCK_REASONS, getDaysBetween } from './block-date-helpers';
import { ModeSelector, QuickDates, HolidayPresetsGrid, DatePickerSection, ReasonSelector, BlockSummary } from './block-date-sections';

const logger = createLogger('BlockDateModal');

interface BlockDateModalProps {
  visible: boolean;
  onClose: () => void;
  onBlock: (dates: string[], reason: string) => Promise<void>;
  preselectedDate?: Date;
}

export function BlockDateModal({ visible, onClose, onBlock, preselectedDate }: BlockDateModalProps) {
  const { colors: palette } = useTheme();

  const [mode, setMode] = useState<'single' | 'range' | 'holiday'>('single');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [reason, setReason] = useState<string>('holiday');
  const [saving, setSaving] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      if (preselectedDate) { setStartDate(preselectedDate); setEndDate(preselectedDate); setMode('single'); }
      else { setStartDate(new Date()); setEndDate(new Date()); }
      setReason('holiday'); setSelectedPreset(null);
    }
  }, [visible, preselectedDate]);

  const handleQuickDate = useCallback((date: Date) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStartDate(date); setEndDate(date); setSelectedPreset(null);
  }, []);

  const handleHolidayPreset = useCallback((presetId: string, dateRange: { start: Date; end: Date }) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPreset(presetId); setStartDate(dateRange.start); setEndDate(dateRange.end); setMode('holiday'); setReason('holiday');
  }, []);

  const adjustDate = useCallback((target: 'start' | 'end', days: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (target === 'start') {
      setStartDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + days); if (d > endDate) setEndDate(d); return d; });
    } else {
      setEndDate(prev => { const d = new Date(prev); d.setDate(d.getDate() + days); return d >= startDate ? d : prev; });
    }
    setSelectedPreset(null);
  }, [startDate, endDate]);

  const handleModeChange = useCallback((m: 'single' | 'range' | 'holiday') => {
    setMode(m);
    if (m === 'single') { setEndDate(startDate); setSelectedPreset(null); }
  }, [startDate]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const dates: string[] = [];
      const current = new Date(startDate);
      const end = new Date(endDate);
      while (current <= end) { dates.push(toDateStr(current)); current.setDate(current.getDate() + 1); }
      const reasonLabel = BLOCK_REASONS.find(r => r.id === reason)?.label || reason;
      await onBlock(dates, reasonLabel);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      logger.error('Failed to block dates:', error);
      Alert.alert('Error', 'Failed to block dates. Please try again.');
    } finally { setSaving(false); }
  }, [startDate, endDate, reason, onBlock, onClose]);

  const dayCount = getDaysBetween(startDate, endDate);
  const isSameDay = toDateStr(startDate) === toDateStr(endDate);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <Clickable onPress={onClose} disabled={saving}><ThemedText style={{ color: palette.muted }}>Cancel</ThemedText></Clickable>
          <ThemedText type="subtitle">Block Time Off</ThemedText>
          <Clickable onPress={handleSave} disabled={saving}>
            <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>{saving ? 'Saving...' : 'Block'}</ThemedText>
          </Clickable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <ModeSelector mode={mode} onSelect={handleModeChange} />
          </View>

          {mode === 'single' && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Quick Select</ThemedText>
              <QuickDates startDate={startDate} onSelect={handleQuickDate} />
            </View>
          )}

          {mode === 'holiday' && (
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Holiday Presets</ThemedText>
              <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>Quickly block common holiday periods</ThemedText>
              <HolidayPresetsGrid selectedPreset={selectedPreset} onSelect={handleHolidayPreset} />
            </View>
          )}

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>{mode === 'single' ? 'Selected Date' : 'Date Range'}</ThemedText>
            <DatePickerSection mode={mode} startDate={startDate} endDate={endDate} onAdjust={adjustDate} />
            {!isSameDay && (
              <View style={[styles.daySummary, { backgroundColor: withAlpha(palette.warning, 0.06) }]}>
                <ThemedText style={{ color: palette.warning, fontWeight: '600' }}>Blocking {dayCount} day{dayCount !== 1 ? 's' : ''}</ThemedText>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Reason</ThemedText>
            <ReasonSelector reason={reason} onSelect={setReason} />
          </View>

          <BlockSummary startDate={startDate} endDate={endDate} reason={reason} isSameDay={isSameDay} dayCount={dayCount} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  content: { padding: Spacing.lg, gap: Spacing.xl, paddingBottom: Spacing['2xl'] },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.subheading },
  sectionHint: { ...Typography.small },
  daySummary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: 12 },
});
