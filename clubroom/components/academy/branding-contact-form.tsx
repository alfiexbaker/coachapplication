import React, { memo } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

interface BrandingContactFormProps {
  colors: ThemeColors;
  canEdit: boolean;
  logoUrl: string;
  bannerUrl: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  onLogoChange: (v: string) => void;
  onBannerChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onWebsiteChange: (v: string) => void;
  onAddressChange: (v: string) => void;
}

export const BrandingContactForm = memo(function BrandingContactForm({
  colors, canEdit,
  logoUrl, bannerUrl, email, phone, website, address,
  onLogoChange, onBannerChange, onEmailChange, onPhoneChange, onWebsiteChange, onAddressChange,
}: BrandingContactFormProps) {
  const inputStyle = [styles.input, { backgroundColor: colors.surfaceSecondary, color: colors.text }];

  return (
    <>
      <SurfaceCard style={styles.card}>
        <ThemedText type="defaultSemiBold" style={styles.title}>Images</ThemedText>
        <Column gap="md">
          <FormField label="Logo URL">
            <TextInput style={inputStyle} placeholder="https://example.com/logo.png" placeholderTextColor={colors.muted}
              value={logoUrl} onChangeText={onLogoChange} editable={canEdit} autoCapitalize="none" />
          </FormField>
          <FormField label="Banner URL">
            <TextInput style={inputStyle} placeholder="https://example.com/banner.png" placeholderTextColor={colors.muted}
              value={bannerUrl} onChangeText={onBannerChange} editable={canEdit} autoCapitalize="none" />
          </FormField>
        </Column>
        <Row gap="xs" style={[styles.infoBox, { backgroundColor: withAlpha(colors.tint, 0.06) }]}>
          <Ionicons name="information-circle" size={18} color={colors.tint} />
          <ThemedText style={[styles.infoText, { color: colors.muted }]}>
            In the full app, you would upload images directly. For now, paste image URLs.
          </ThemedText>
        </Row>
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <ThemedText type="defaultSemiBold" style={styles.title}>Contact Information</ThemedText>
        <Column gap="md">
          <FormField label="Email">
            <TextInput style={inputStyle} placeholder="info@academy.com" placeholderTextColor={colors.muted}
              value={email} onChangeText={onEmailChange} editable={canEdit} keyboardType="email-address" autoCapitalize="none" />
          </FormField>
          <FormField label="Phone">
            <TextInput style={inputStyle} placeholder="+44 20 1234 5678" placeholderTextColor={colors.muted}
              value={phone} onChangeText={onPhoneChange} editable={canEdit} keyboardType="phone-pad" />
          </FormField>
          <FormField label="Website">
            <TextInput style={inputStyle} placeholder="https://academy.com" placeholderTextColor={colors.muted}
              value={website} onChangeText={onWebsiteChange} editable={canEdit} keyboardType="url" autoCapitalize="none" />
          </FormField>
          <FormField label="Address">
            <TextInput style={inputStyle} placeholder="123 Football Lane, London" placeholderTextColor={colors.muted}
              value={address} onChangeText={onAddressChange} editable={canEdit} />
          </FormField>
        </Column>
      </SurfaceCard>
    </>
  );
});

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  title: { marginBottom: Spacing.sm },
  field: { gap: Spacing.xs },
  fieldLabel: { ...Typography.smallSemiBold },
  input: { height: 48, borderRadius: Radii.md, paddingHorizontal: Spacing.md, ...Typography.body },
  infoBox: { alignItems: 'flex-start', padding: Spacing.md, borderRadius: Radii.md },
  infoText: { flex: 1, ...Typography.caption },
});
