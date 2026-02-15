/**
 * SchedulingRules — Section sub-components (chip selector, toggles, policy, summary).
 */
import { memo } from 'react';
import { View, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import type { RefundTier } from '@/constants/types';
import { styles } from './scheduling-rules-section-styles';

// Modal-specific compact constants
const MODAL_RESCHEDULE_OPTIONS = [
  { value: 2, label: '2h before' },
  { value: 6, label: '6h before' },
  { value: 24, label: '24h before' },
  { value: 48, label: '48h before' },
];

export const CANCELLATION_TIMEFRAMES = [48, 24, 12, 6, 2, 0] as const;

// ---------------------------------------------------------------------------
// OptionChip — Shared selectable chip
// ---------------------------------------------------------------------------

export function OptionChip({
  label,
  isSelected,
  onPress,
  compact,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  const { colors: palette } = useTheme();
  return (
    <Clickable
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        compact ? styles.compactChip : styles.optionChip,
        {
          backgroundColor: isSelected ? palette.tint : palette.surface,
          borderColor: isSelected ? palette.tint : palette.border,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.chipText,
          { color: isSelected ? palette.onPrimary : palette.text, fontSize: compact ? 13 : 14 },
        ]}
      >
        {label}
      </ThemedText>
    </Clickable>
  );
}

// ---------------------------------------------------------------------------
// ChipSection — Icon + title + hint + chip row
// ---------------------------------------------------------------------------

interface ChipSectionProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  hint: string;
  options: { value: number; label: string }[];
  selected: number;
  onSelect: (v: number) => void;
  compact?: boolean;
}

function ChipSectionInner({
  icon,
  iconColor,
  title,
  hint,
  options,
  selected,
  onSelect,
  compact,
}: ChipSectionProps) {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.section}>
      <Row style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: withAlpha(iconColor, 0.09) }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <View style={styles.sectionTitleWrap}>
          <ThemedText type="defaultSemiBold">{title}</ThemedText>
          <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>{hint}</ThemedText>
        </View>
      </Row>
      <Row style={styles.chipRow}>
        {options.map((opt) => (
          <OptionChip
            key={opt.value}
            label={opt.label}
            isSelected={selected === opt.value}
            onPress={() => onSelect(opt.value)}
            compact={compact}
          />
        ))}
      </Row>
    </View>
  );
}

export const ChipSection = memo(ChipSectionInner);

// ---------------------------------------------------------------------------
// ToggleCard — Same-day bookings + rescheduling toggles
// ---------------------------------------------------------------------------

interface ToggleCardProps {
  allowSameDayBookings: boolean;
  allowRescheduling: boolean;
  rescheduleDeadlineHours: number;
  onSameDayChange: (v: boolean) => void;
  onRescheduleChange: (v: boolean) => void;
  onDeadlineChange: (v: number) => void;
}

function ToggleCardInner(p: ToggleCardProps) {
  const { colors: palette } = useTheme();
  return (
    <SurfaceCard style={styles.toggleCard}>
      <Row style={styles.toggleRow}>
        <Row style={styles.toggleInfo}>
          <View style={[styles.toggleIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
            <Ionicons name="today-outline" size={16} color={palette.success} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold" style={{ ...Typography.bodySmall }}>
              Same-Day Bookings
            </ThemedText>
            <ThemedText style={[styles.toggleHint, { color: palette.muted }]}>
              Allow booking for today
            </ThemedText>
          </View>
        </Row>
        <Switch
          value={p.allowSameDayBookings}
          onValueChange={(v) => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            p.onSameDayChange(v);
          }}
          trackColor={{ false: palette.border, true: palette.success }}
          thumbColor={palette.surface}
        />
      </Row>
      <Divider spacing={Spacing.md} />
      <Row style={styles.toggleRow}>
        <Row style={styles.toggleInfo}>
          <View style={[styles.toggleIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <Ionicons name="swap-horizontal-outline" size={16} color={palette.tint} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold" style={{ ...Typography.bodySmall }}>
              Allow Rescheduling
            </ThemedText>
            <ThemedText style={[styles.toggleHint, { color: palette.muted }]}>
              Let athletes change booking time
            </ThemedText>
          </View>
        </Row>
        <Switch
          value={p.allowRescheduling}
          onValueChange={(v) => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            p.onRescheduleChange(v);
          }}
          trackColor={{ false: palette.border, true: palette.tint }}
          thumbColor={palette.surface}
        />
      </Row>
      {p.allowRescheduling && (
        <>
          <Divider spacing={Spacing.md} />
          <View style={styles.rescheduleSection}>
            <ThemedText style={[styles.rescheduleLabel, { color: palette.muted }]}>
              Reschedule deadline:
            </ThemedText>
            <Row style={styles.rescheduleChips}>
              {MODAL_RESCHEDULE_OPTIONS.map((opt) => (
                <OptionChip
                  key={opt.value}
                  label={opt.label}
                  isSelected={p.rescheduleDeadlineHours === opt.value}
                  onPress={() => p.onDeadlineChange(opt.value)}
                  compact
                />
              ))}
            </Row>
          </View>
        </>
      )}
    </SurfaceCard>
  );
}

export const ToggleCard = memo(ToggleCardInner);

// ---------------------------------------------------------------------------
// CancellationSection — Policy picker + tier summary
// ---------------------------------------------------------------------------

function CancellationSectionInner({
  tiers,
  onTierChange,
}: {
  tiers: RefundTier[];
  onTierChange: (hoursBeforeSession: number, refundPercentage: number) => void;
}) {
  const { colors: palette } = useTheme();
  const sortedTiers = [...tiers].sort((a, b) => b.hoursBeforeSession - a.hoursBeforeSession);

  const formatWindowLabel = (hours: number) => {
    if (hours === 0) return 'At session time';
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days === 1 ? '' : 's'}+ before`;
    }
    return `${hours}h+ before`;
  };

  return (
    <View style={styles.section}>
      <Row style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
          <Ionicons name="shield-outline" size={18} color={palette.error} />
        </View>
        <View style={styles.sectionTitleWrap}>
          <ThemedText type="defaultSemiBold">Cancellation Policy</ThemedText>
          <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
            Set refund by timeframe in 5% steps.
          </ThemedText>
        </View>
      </Row>
      <SurfaceCard style={[styles.tierSummary, { backgroundColor: palette.surface }]}>
        {sortedTiers.map((tier, index) => (
          <View
            key={tier.hoursBeforeSession}
            style={[
              styles.refundControlRow,
              index < sortedTiers.length - 1
                ? { borderBottomWidth: 1, borderBottomColor: palette.border }
                : undefined,
            ]}
          >
            <Row justify="between" align="center">
              <ThemedText style={[styles.tierText, { color: palette.text }]}>
                {formatWindowLabel(tier.hoursBeforeSession)}
              </ThemedText>
              <ThemedText style={[styles.refundPercentValue, { color: palette.tint }]}>
                {tier.refundPercentage}%
              </ThemedText>
            </Row>
            <Slider
              value={tier.refundPercentage}
              minimumValue={0}
              maximumValue={100}
              step={5}
              minimumTrackTintColor={palette.tint}
              maximumTrackTintColor={palette.border}
              thumbTintColor={palette.tint}
              onSlidingComplete={(value) => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onTierChange(tier.hoursBeforeSession, Math.round(value));
              }}
            />
          </View>
        ))}
      </SurfaceCard>
    </View>
  );
}

export const CancellationSection = memo(CancellationSectionInner);

// ---------------------------------------------------------------------------
// SettingsSummary — Current settings card
// ---------------------------------------------------------------------------

interface SettingsSummaryProps {
  minimumAdvanceHours: number;
  bufferMinutes: number;
  maxAdvanceDays: number;
  allowSameDayBookings: boolean;
  cancellationTiers: RefundTier[];
}

function SettingsSummaryInner(p: SettingsSummaryProps) {
  const { colors: palette } = useTheme();
  const highestRefundTier = [...p.cancellationTiers]
    .sort((a, b) => b.refundPercentage - a.refundPercentage || b.hoursBeforeSession - a.hoursBeforeSession)[0];
  const summaryText = highestRefundTier
    ? `Max refund ${highestRefundTier.refundPercentage}% (${highestRefundTier.hoursBeforeSession}h+ window)`
    : 'Custom cancellation policy';
  const items = [
    {
      text:
        p.minimumAdvanceHours === 0
          ? 'No minimum notice'
          : `${p.minimumAdvanceHours}h minimum notice`,
      on: true,
    },
    {
      text: p.bufferMinutes === 0 ? 'No buffer' : `${p.bufferMinutes}m buffer between sessions`,
      on: true,
    },
    { text: `Book up to ${p.maxAdvanceDays} days ahead`, on: true },
    {
      text: `Same-day ${p.allowSameDayBookings ? 'allowed' : 'not allowed'}`,
      on: p.allowSameDayBookings,
    },
    {
      text: summaryText,
      on: true,
    },
  ];
  return (
    <SurfaceCard
      style={[styles.summaryCard, { backgroundColor: withAlpha(palette.success, 0.03) }]}
    >
      <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.sm }}>
        Current Settings
      </ThemedText>
      <View style={styles.summaryList}>
        {items.map((item, i) => (
          <Row key={i} style={styles.summaryItem}>
            <Ionicons
              name={item.on ? 'checkmark-circle' : 'close-circle'}
              size={14}
              color={item.on ? palette.success : palette.muted}
            />
            <ThemedText style={styles.summaryText}>{item.text}</ThemedText>
          </Row>
        ))}
      </View>
    </SurfaceCard>
  );
}

export const SettingsSummary = memo(SettingsSummaryInner);
