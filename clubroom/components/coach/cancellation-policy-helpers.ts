/**
 * CancellationPolicyEditor — Types and preset data.
 */
import type { Ionicons } from '@expo/vector-icons';

export type PresetKey = 'flexible' | 'standard' | 'strict' | 'custom';

export interface PresetOption {
  key: PresetKey;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const PRESETS: PresetOption[] = [
  { key: 'flexible', label: 'Flexible', description: 'Full refund up to 6 hours before', icon: 'happy-outline' },
  { key: 'standard', label: 'Standard', description: 'Full refund 24+ hours before', icon: 'shield-checkmark-outline' },
  { key: 'strict', label: 'Strict', description: 'Full refund only 48+ hours before', icon: 'lock-closed-outline' },
  { key: 'custom', label: 'Custom', description: 'Define your own refund tiers', icon: 'settings-outline' },
];
