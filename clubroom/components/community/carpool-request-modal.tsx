import React, { memo } from 'react';
import { View, StyleSheet, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CarpoolOffer } from '@/constants/types';
import { scaleFont } from '@/utils/scale';

interface CarpoolRequestModalProps {
  visible: boolean;
  offer: CarpoolOffer | null;
  seats: string;
  message: string;
  requesting: boolean;
  onChangeSeats: (v: string) => void;
  onChangeMessage: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export const CarpoolRequestModal = memo(function CarpoolRequestModal({
  visible, offer, seats, message, requesting, onChangeSeats, onChangeMessage, onSubmit, onClose,
}: CarpoolRequestModalProps) {
  const { colors: palette } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <ThemedText type="title" style={styles.title}>Request a Seat</ThemedText>
          <Clickable accessibilityLabel="Close" onPress={onClose}><Ionicons name="close" size={24} color={palette.text} /></Clickable>
        </View>
        <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
            {offer && (
              <SurfaceCard style={styles.offerSummary}>
                <ThemedText type="defaultSemiBold">{offer.sessionName}</ThemedText>
                <ThemedText style={{ color: palette.muted }}>{offer.sessionDate} at {offer.pickupTime}</ThemedText>
                <ThemedText style={{ color: palette.muted }}>From: {offer.pickupLocation}</ThemedText>
              </SurfaceCard>
            )}
            <View style={styles.field}>
              <ThemedText type="defaultSemiBold" style={styles.label}>Number of Seats</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
                placeholder="1" placeholderTextColor={palette.muted} value={seats} onChangeText={onChangeSeats} keyboardType="number-pad"
              />
            </View>
            <View style={styles.field}>
              <ThemedText type="defaultSemiBold" style={styles.label}>Message (optional)</ThemedText>
              <TextInput
                style={[styles.textArea, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
                placeholder="Add a note to the driver..." placeholderTextColor={palette.muted} value={message} onChangeText={onChangeMessage} multiline numberOfLines={3} textAlignVertical="top"
              />
            </View>
          </ScrollView>
          <View style={[styles.actions, { borderTopColor: palette.border }]}>
            <Button variant="outline" onPress={onClose} style={styles.actionBtn} disabled={requesting}>Cancel</Button>
            <Button onPress={onSubmit} style={styles.actionBtn} disabled={requesting}>{requesting ? 'Sending...' : 'Send Request'}</Button>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  title: { ...Typography.title, fontSize: scaleFont(Typography.title.fontSize) },
  body: { flex: 1 },
  formContent: { padding: Spacing.lg, gap: Spacing.md },
  offerSummary: { gap: Spacing.xxs, marginBottom: Spacing.md },
  field: { gap: Spacing.xs },
  label: { ...Typography.bodySmall, fontSize: scaleFont(Typography.bodySmall.fontSize), marginBottom: Spacing.xxs },
  input: { height: 48, borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.md, ...Typography.subheading, fontSize: scaleFont(Typography.subheading.fontSize) },
  textArea: { minHeight: 80, borderWidth: 1, borderRadius: Radii.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, ...Typography.subheading, fontSize: scaleFont(Typography.subheading.fontSize) },
  actions: { flexDirection: 'row', padding: Spacing.lg, gap: Spacing.sm, borderTopWidth: 1 },
  actionBtn: { flex: 1 },
});
