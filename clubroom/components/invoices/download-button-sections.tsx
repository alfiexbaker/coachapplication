/**
 * Extracted sub-components for DownloadButton.
 *
 * getButtonSize / getIconSize / getFontSize — size config helpers.
 * DownloadOnlyButtonInner — single download icon button (accepts palette).
 * ShareOnlyButtonInner — single share icon button (accepts palette).
 */

import React, { memo, useState } from 'react';
import { StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { Spacing, Radii } from '@/constants/theme';
import { Invoice } from '@/constants/types';
import { invoiceService } from '@/services/invoice-service';
import type { ThemeColors } from '@/hooks/useTheme';

// ─── Size Helpers ────────────────────────────────────────────────────────────

export function getButtonSize(size: 'small' | 'medium' | 'large') {
  switch (size) {
    case 'small':
      return { paddingVertical: 8, paddingHorizontal: Spacing.xs + Spacing.xxs };
    case 'large':
      return { paddingVertical: 16, paddingHorizontal: 24 };
    default:
      return { paddingVertical: Spacing.xs + Spacing.xxs, paddingHorizontal: 16 };
  }
}

export function getIconSize(size: 'small' | 'medium' | 'large') {
  switch (size) {
    case 'small': return 16;
    case 'large': return 24;
    default: return 20;
  }
}

export function getFontSize(size: 'small' | 'medium' | 'large') {
  switch (size) {
    case 'small': return 13;
    case 'large': return 17;
    default: return 15;
  }
}

// ─── DownloadOnlyButtonInner ─────────────────────────────────────────────────

interface SingleButtonInnerProps {
  invoice: Invoice;
  size?: 'small' | 'medium' | 'large';
  palette: ThemeColors;
}

export const DownloadOnlyButtonInner = memo(function DownloadOnlyButtonInner({
  invoice,
  size = 'medium',
  palette,
}: SingleButtonInnerProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);

    try {
      const result = await invoiceService.downloadInvoice(invoice.id);
      if (result) {
        Alert.alert('Downloaded', `${invoice.invoiceNumber} saved.`);
      } else {
        Alert.alert('Failed', 'Could not download the invoice.');
      }
    } catch {
      Alert.alert('Error', 'An error occurred.');
    } finally {
      setDownloading(false);
    }
  };

  const iconSz = getIconSize(size);

  return (
    <Clickable
      style={[styles.singleButton, { backgroundColor: palette.tint }]}
      onPress={handleDownload}
      disabled={downloading}
    >
      {downloading ? (
        <ActivityIndicator size="small" color={palette.onPrimary} />
      ) : (
        <Ionicons name="download-outline" size={iconSz} color={palette.onPrimary} />
      )}
    </Clickable>
  );
});

// ─── ShareOnlyButtonInner ────────────────────────────────────────────────────

export const ShareOnlyButtonInner = memo(function ShareOnlyButtonInner({
  invoice,
  size = 'medium',
  palette,
}: SingleButtonInnerProps) {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);

    try {
      await invoiceService.shareInvoice(invoice.id);
    } catch {
      Alert.alert('Error', 'Could not share the invoice.');
    } finally {
      setSharing(false);
    }
  };

  const iconSz = getIconSize(size);

  return (
    <Clickable
      accessibilityLabel="Share invoice"
      style={[
        styles.singleButton,
        { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 },
      ]}
      onPress={handleShare}
      disabled={sharing}
    >
      {sharing ? (
        <ActivityIndicator size="small" color={palette.tint} />
      ) : (
        <Ionicons name="share-outline" size={iconSz} color={palette.text} />
      )}
    </Clickable>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  singleButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
