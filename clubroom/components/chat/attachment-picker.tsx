import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type AttachmentPickerProps = {
  visible: boolean;
  onClose: () => void;
  onPick: (type: 'image' | 'document' | 'camera') => void;
};

const options: { label: string; icon: string; type: 'image' | 'document' | 'camera'; helper: string }[] = [
  { label: 'Photo / Video', icon: 'image', type: 'image', helper: 'Pick from library' },
  { label: 'Document (PDF)', icon: 'document', type: 'document', helper: 'Upload drill plans' },
  { label: 'Camera', icon: 'camera', type: 'camera', helper: 'Capture quick clip' },
];

export function AttachmentPicker({ visible, onClose, onPick }: AttachmentPickerProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: palette.surface, borderColor: palette.border }]}> 
          <ThemedText type="subtitle" style={styles.title}>
            Add attachment
          </ThemedText>
          {options.map((option) => (
            <Clickable
              key={option.type}
              onPress={() => onPick(option.type)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: pressed ? `${palette.border}40` : 'transparent',
                },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: `${palette.tint}15` }]}> 
                <Ionicons name={option.icon as any} size={20} color={palette.tint} />
              </View>
              <View style={styles.copy}> 
                <ThemedText type="defaultSemiBold">{option.label}</ThemedText>
                <ThemedText style={[styles.helper, { color: palette.muted }]}>{option.helper}</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.icon} />
            </Clickable>
          ))}
          <Clickable onPress={onClose} style={styles.dismiss}>
            <ThemedText style={{ color: palette.muted }}>Close</ThemedText>
          </Clickable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    padding: Spacing.lg,
  },
  sheet: {
    borderRadius: Radii['2xl'],
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  helper: {
    fontSize: 12,
  },
  dismiss: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
});

