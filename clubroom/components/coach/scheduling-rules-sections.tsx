/**
 * SchedulingRules — Section sub-components (chip selector, toggles, policy, summary).
 */
import { memo } from 'react';
import { View, Switch, TextInput, StyleSheet as RNStyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Slider from '@react-native-community/slider';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row, Column } from '@/components/primitives';
import type { RefundTier } from '@/constants/types';
import { styles } from './scheduling-rules-section-styles';

export const CANCELLATION_TIMEFRAMES = [24, 12, 2, 0] as const;

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
        if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
          { color: isSelected ? palette.onPrimary : palette.text, fontSize: compact ? Typography.small.fontSize : Typography.bodySmall.fontSize },
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
// ToggleCard — Same-day booking toggle
// ---------------------------------------------------------------------------

interface ToggleCardProps {
  allowSameDayBookings: boolean;
  onSameDayChange: (v: boolean) => void;
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
          <Column flex>
            <ThemedText type="defaultSemiBold" style={{ ...Typography.bodySmall }}>
              Same-Day Bookings
            </ThemedText>
            <ThemedText style={[styles.toggleHint, { color: palette.muted }]}>
              Allow booking for today
            </ThemedText>
          </Column>
        </Row>
        <Switch
          value={p.allowSameDayBookings}
          onValueChange={(v) => {
            if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            p.onSameDayChange(v);
          }}
          trackColor={{ false: palette.border, true: palette.success }}
          thumbColor={palette.surface}
        />
      </Row>
    </SurfaceCard>
  );
}

export const ToggleCard = memo(ToggleCardInner);

// ---------------------------------------------------------------------------
// CancellationSection — Presets + fully editable tiers
// ---------------------------------------------------------------------------

export type CancellationPreset = 'flexible' | 'standard' | 'strict' | 'custom';

const PRESET_OPTIONS: { key: CancellationPreset; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'flexible', label: 'Flexible', icon: 'happy-outline' },
  { key: 'standard', label: 'Standard', icon: 'shield-checkmark-outline' },
  { key: 'strict', label: 'Strict', icon: 'lock-closed-outline' },
  { key: 'custom', label: 'Custom', icon: 'settings-outline' },
];

interface CancellationSectionProps {
  tiers: RefundTier[];
  selectedPreset: CancellationPreset;
  onPresetChange: (preset: CancellationPreset) => void;
  onTiersChange: (tiers: RefundTier[]) => void;
}

function formatWindowLabel(hours: number) {
  if (hours === 0) return 'No-Show';
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'}+ before`;
  }
  return `${hours}h+ before`;
}

const EditableTierRow = memo(function EditableTierRow({
  tier,
  index,
  isCustom,
  canRemove,
  onUpdateHours,
  onUpdateRefund,
  onRemove,
}: {
  tier: RefundTier;
  index: number;
  isCustom: boolean;
  canRemove: boolean;
  onUpdateHours: (index: number, hours: number) => void;
  onUpdateRefund: (index: number, refund: number) => void;
  onRemove: (index: number) => void;
}) {
  const { colors: palette } = useTheme();
  const refundColor =
    tier.refundPercentage >= 75
      ? palette.success
      : tier.refundPercentage >= 25
        ? palette.warning
        : palette.error;

  return (
    <View
      style={[
        cancellationStyles.tierRow,
        { borderBottomWidth: RNStyleSheet.hairlineWidth, borderBottomColor: palette.border },
      ]}
    >
      <Row align="center" gap="sm" style={cancellationStyles.tierContent}>
        {isCustom ? (
          <Row align="center" gap="xxs" style={cancellationStyles.hoursInputWrap}>
            <TextInput
              style={[cancellationStyles.hoursInput, { borderColor: palette.border, color: palette.text }]}
              value={String(tier.hoursBeforeSession)}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={palette.muted}
              accessibilityLabel={`Hours before session for tier ${index + 1}`}
              onChangeText={(text) => {
                const n = parseInt(text, 10);
                if (!isNaN(n) && n >= 0) onUpdateHours(index, n);
              }}
            />
            <ThemedText style={[Typography.caption, { color: palette.muted }]}>hrs</ThemedText>
          </Row>
        ) : (
          <ThemedText style={[Typography.bodySmallSemiBold, { color: palette.text, minWidth: 80 }]}>
            {formatWindowLabel(tier.hoursBeforeSession)}
          </ThemedText>
        )}

        <View style={cancellationStyles.sliderWrap}>
          <Slider
            value={tier.refundPercentage}
            minimumValue={0}
            maximumValue={100}
            step={5}
            minimumTrackTintColor={palette.tint}
            maximumTrackTintColor={palette.border}
            thumbTintColor={palette.tint}
            onValueChange={(value) => onUpdateRefund(index, Math.round(value))}
            onSlidingComplete={() => {
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          />
        </View>

        <View style={[cancellationStyles.refundBadge, { backgroundColor: withAlpha(refundColor, 0.09) }]}>
          <ThemedText style={[Typography.bodySmallSemiBold, { color: refundColor }]}>
            {tier.refundPercentage}%
          </ThemedText>
        </View>

        {isCustom && canRemove && (
          <Clickable
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onRemove(index);
            }}
            style={cancellationStyles.removeButton}
            accessibilityLabel={`Remove tier ${index + 1}`}
          >
            <Ionicons name="close-circle" size={20} color={palette.error} />
          </Clickable>
        )}
      </Row>
    </View>
  );
});

function CancellationSectionInner({
  tiers,
  selectedPreset,
  onPresetChange,
  onTiersChange,
}: CancellationSectionProps) {
  const { colors: palette } = useTheme();
  const isCustom = selectedPreset === 'custom';
  const sortedTiers = [...tiers].sort((a, b) => b.hoursBeforeSession - a.hoursBeforeSession);

  const handleUpdateHours = (index: number, hours: number) => {
    const sorted = [...tiers].sort((a, b) => b.hoursBeforeSession - a.hoursBeforeSession);
    const next = [...sorted];
    next[index] = { ...next[index], hoursBeforeSession: hours };
    onTiersChange(next);
  };

  const handleUpdateRefund = (index: number, refund: number) => {
    const sorted = [...tiers].sort((a, b) => b.hoursBeforeSession - a.hoursBeforeSession);
    const next = [...sorted];
    next[index] = { ...next[index], refundPercentage: refund };
    onTiersChange(next);
  };

  const handleRemove = (index: number) => {
    const sorted = [...tiers].sort((a, b) => b.hoursBeforeSession - a.hoursBeforeSession);
    onTiersChange(sorted.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onTiersChange([...tiers, { hoursBeforeSession: 0, refundPercentage: 0, description: '' }]);
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
            Pick a preset or build your own.
          </ThemedText>
        </View>
      </Row>

      {/* Preset chips */}
      <Row style={styles.chipRow}>
        {PRESET_OPTIONS.map((opt) => (
          <Clickable
            key={opt.key}
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPresetChange(opt.key);
            }}
            style={[
              styles.compactChip,
              {
                backgroundColor: selectedPreset === opt.key ? palette.tint : palette.surface,
                borderColor: selectedPreset === opt.key ? palette.tint : palette.border,
              },
            ]}
            accessibilityRole="radio"
            accessibilityLabel={`${opt.label} cancellation policy${selectedPreset === opt.key ? ', selected' : ''}`}
          >
            <Ionicons
              name={opt.icon}
              size={14}
              color={selectedPreset === opt.key ? palette.onPrimary : palette.muted}
            />
            <ThemedText
              style={[
                styles.chipText,
                { color: selectedPreset === opt.key ? palette.onPrimary : palette.text, fontSize: Typography.small.fontSize },
              ]}
            >
              {opt.label}
            </ThemedText>
          </Clickable>
        ))}
      </Row>

      {/* Tier rows */}
      <SurfaceCard style={[cancellationStyles.tiersCard, { backgroundColor: palette.surface }]}>
        {sortedTiers.map((tier, index) => (
          <EditableTierRow
            key={`${index}-${tier.hoursBeforeSession}`}
            tier={tier}
            index={index}
            isCustom={isCustom}
            canRemove={sortedTiers.length > 1}
            onUpdateHours={handleUpdateHours}
            onUpdateRefund={handleUpdateRefund}
            onRemove={handleRemove}
          />
        ))}

        {isCustom && (
          <Clickable
            onPress={handleAdd}
            style={[cancellationStyles.addButton, { borderColor: palette.border }]}
            accessibilityLabel="Add cancellation tier"
          >
            <Ionicons name="add-circle-outline" size={16} color={palette.tint} />
            <ThemedText style={[Typography.smallSemiBold, { color: palette.tint }]}>
              Add tier
            </ThemedText>
          </Clickable>
        )}
      </SurfaceCard>
    </View>
  );
}

export const CancellationSection = memo(CancellationSectionInner);

const cancellationStyles = RNStyleSheet.create({
  tiersCard: { padding: Spacing.sm, borderRadius: Radii.card },
  tierRow: { paddingVertical: Spacing.xs },
  tierContent: { flex: 1 },
  hoursInputWrap: { minWidth: 70 },
  hoursInput: {
    width: 48,
    height: 36,
    borderRadius: Radii.sm,
    borderWidth: 1,
    textAlign: 'center',
    ...Typography.bodySmallSemiBold,
  },
  sliderWrap: { flex: 1 },
  refundBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    minWidth: 48,
    alignItems: 'center',
  },
  removeButton: { padding: Spacing.xxs, minHeight: 44, justifyContent: 'center' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radii.md,
  },
});

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
