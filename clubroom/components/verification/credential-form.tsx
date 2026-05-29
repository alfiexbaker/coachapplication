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
    selectedType === 'other'
      ? customName.trim().length < 3
        ? 'Enter a credential name'
        : null
      : null;
  const canSubmit =
    Boolean(selectedType && uploaded && !submitting && (selectedType !== 'other' || !customNameError));

  return (
    <SurfaceCard style={styles.card}>
      <Row justify="space-between" align="center">
        <ThemedText type="defaultSemiBold">Add Credential</ThemedText>
        <Clickable accessibilityLabel="Close" onPress={onClose}>
          <Ionicons name="close" size={24} color={colors.muted} />
        </Clickable>
      </Row>

      <View style={styles.section}>
        <ThemedText style={styles.label}>Credential Type</ThemedText>
        <View style={styles.typeList}>
          {CREDENTIAL_TYPES.map((type) => (
            <Clickable
              key={type.id}
              onPress={() => onSelectType(type.id)}
              style={[
                styles.typeItem,
                {
                  borderColor: selectedType === type.id ? colors.tint : colors.border,
                  backgroundColor:
                    selectedType === type.id ? withAlpha(colors.tint, 0.03) : colors.card,
                },
              ]}
            >
              <Column flex>
                <ThemedText
                  style={{
                    fontWeight: selectedType === type.id ? '600' : '400',
                    color: selectedType === type.id ? colors.tint : colors.text,
                  }}
                >
                  {type.label}
                </ThemedText>
                <ThemedText style={{ color: colors.muted, ...Typography.caption }}>
                  {type.category}
                </ThemedText>
              </Column>
              <Ionicons
                name={selectedType === type.id ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selectedType === type.id ? colors.tint : colors.muted}
              />
            </Clickable>
          ))}
        </View>
      </View>

      {selectedType === 'other' && (
        <View style={styles.section}>
          <ThemedText style={styles.label}>Qualification Name</ThemedText>
          <ThemedText style={[Typography.caption, { color: colors.muted }]}>
            e.g., Grassroots Coach Award, First Aid Certificate
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              { borderColor: customNameError ? colors.error : colors.border, color: colors.text },
            ]}
            placeholder="Enter qualification name"
            placeholderTextColor={colors.muted}
            value={customName}
            onChangeText={onCustomNameChange}
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
            <ThemedText style={[Typography.caption, { color: colors.error }]}>{customNameError}</ThemedText>
          ) : null}
        </View>
      )}

      {selectedType && (
        <View style={styles.section}>
          <ThemedText style={styles.label}>Upload Document</ThemedText>
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
                <ThemedText type="defaultSemiBold">Document uploaded</ThemedText>
                <ThemedText style={{ color: colors.muted, ...Typography.caption }}>
                  credential.pdf
                </ThemedText>
              </Column>
              <Clickable accessibilityLabel="Remove uploaded document" onPress={onRemoveUpload}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </Clickable>
            </Row>
          ) : (
            <Clickable
              onPress={onUpload}
              style={[styles.uploadArea, { borderColor: colors.border }]}
            >
              <Ionicons name="cloud-upload-outline" size={32} color={colors.muted} />
              <ThemedText style={{ color: colors.muted }}>Tap to upload certificate</ThemedText>
            </Clickable>
          )}
        </View>
      )}

      <Button
        onPress={onSubmit}
        disabled={!canSubmit}
        label={submitting ? 'Submitting...' : !uploaded ? 'Upload Required' : 'Submit Credential'}
      />
      {!uploaded && selectedType && (
        <ThemedText
          style={[Typography.small, { textAlign: 'center', marginTop: Spacing.xs, color: colors.muted }]}
        >
          Upload a document to enable submission
        </ThemedText>
      )}
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
    gap: Spacing.xs,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
  },
  uploadArea: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  uploadedRow: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
});
