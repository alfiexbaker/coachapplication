import React from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { CREDENTIAL_TYPES } from '@/hooks/use-credentials';

interface CredentialFormProps {
  colors: ThemeColors;
  selectedType: string | null;
  customName: string;
  uploaded: boolean;
  submitting: boolean;
  onSelectType: (type: string) => void;
  onCustomNameChange: (name: string) => void;
  onUpload: () => void;
  onRemoveUpload: () => void;
  onSubmit: () => void;
  onClose: () => void;
}

export const CredentialForm = function CredentialForm({
  colors,
  selectedType,
  customName,
  uploaded,
  submitting,
  onSelectType,
  onCustomNameChange,
  onUpload,
  onRemoveUpload,
  onSubmit,
  onClose,
}: CredentialFormProps) {
  const customNameError =
    selectedType === 'other' && customName.length > 0
      ? customName.trim().length < 3
        ? 'Enter a credential name'
        : null
      : null;
  const canSubmit = Boolean(
    selectedType &&
    uploaded &&
    !submitting &&
    (selectedType !== 'other' || customName.trim().length >= 3),
  );

  return (
    <SurfaceCard style={styles.card}>
      <Row justify="space-between" align="center">
        <ThemedText type="defaultSemiBold">Add credential</ThemedText>
        <Clickable
          accessibilityLabel="Close credential form"
          disabled={submitting}
          onPress={onClose}
        >
          <Ionicons name="close" size={24} color={colors.muted} />
        </Clickable>
      </Row>

      <View style={styles.section}>
        <ThemedText style={styles.label}>Credential type</ThemedText>
        <View style={styles.typeList}>
          {CREDENTIAL_TYPES.map((type, index) => {
            const selected = selectedType === type.id;
            return (
              <View key={type.id}>
                <Clickable
                  accessibilityLabel={`${type.label}, ${type.category}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  disabled={submitting}
                  onPress={() => onSelectType(type.id)}
                  style={[
                    styles.typeItem,
                    selected ? { backgroundColor: withAlpha(colors.tint, 0.06) } : undefined,
                  ]}
                >
                  <Column flex>
                    <ThemedText
                      style={{
                        fontWeight: selected ? '600' : '400',
                        color: selected ? colors.tint : colors.text,
                      }}
                    >
                      {type.label}
                    </ThemedText>
                    <ThemedText style={{ color: colors.muted, ...Typography.caption }}>
                      {type.category}
                    </ThemedText>
                  </Column>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? colors.tint : colors.muted}
                  />
                </Clickable>
                {index < CREDENTIAL_TYPES.length - 1 ? (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                ) : null}
              </View>
            );
          })}
        </View>
      </View>

      {selectedType === 'other' && (
        <View style={styles.section}>
          <ThemedText style={styles.label}>Qualification name</ThemedText>
          <TextInput
            style={[
              styles.input,
              { borderColor: customNameError ? colors.error : colors.border, color: colors.text },
            ]}
            placeholder="Qualification name"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Qualification name"
            value={customName}
            onChangeText={onCustomNameChange}
            editable={!submitting}
            maxLength={50}
          />
          <ThemedText
            style={[
              Typography.caption,
              { color: customName.length > 45 ? colors.error : colors.muted, textAlign: 'right' },
            ]}
          >
            {customName.length}/50
          </ThemedText>
          {customNameError ? (
            <ThemedText
              accessibilityLiveRegion="polite"
              style={[Typography.caption, { color: colors.error }]}
            >
              {customNameError}
            </ThemedText>
          ) : null}
        </View>
      )}

      {selectedType && (
        <View style={styles.section}>
          <ThemedText style={styles.label}>Document</ThemedText>
          <ThemedText style={{ color: colors.muted, ...Typography.caption }}>
            PDF, JPG, PNG, WebP or HEIC · 20 MB max
          </ThemedText>
          {uploaded ? (
            <Row
              gap="md"
              align="center"
              style={[
                styles.uploadedRow,
                { borderColor: colors.success, backgroundColor: withAlpha(colors.success, 0.03) },
              ]}
            >
              <Ionicons name="document-text" size={24} color={colors.success} />
              <Column flex>
                <ThemedText type="defaultSemiBold">Document selected</ThemedText>
                <ThemedText style={{ color: colors.muted, ...Typography.caption }}>
                  Ready to submit
                </ThemedText>
              </Column>
              <Clickable
                accessibilityLabel="Remove selected document"
                disabled={submitting}
                onPress={onRemoveUpload}
              >
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </Clickable>
            </Row>
          ) : (
            <Button onPress={onUpload} variant="outline" label="Choose document" />
          )}
        </View>
      )}

      <Button
        onPress={onSubmit}
        disabled={!canSubmit}
        label={submitting ? 'Submitting...' : 'Submit for review'}
      />
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.sm,
  },
  label: {
    ...Typography.bodySmallSemiBold,
  },
  typeList: {
    gap: 0,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  divider: { height: 1, marginLeft: Spacing.sm },
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
  },
  uploadedRow: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
});
