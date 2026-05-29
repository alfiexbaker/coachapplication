/**
 * Extracted sub-components for DownloadButton.
 *
 * DownloadOnlyButtonInner — single download icon button (accepts palette).
 * ShareOnlyButtonInner — single share icon button (accepts palette).
 */

import React, { useState } from 'react';
import { StyleSheet, ActivityIndicator } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { Spacing, Radii } from '@/constants/theme';
import { Invoice } from '@/constants/types';
import { invoiceService } from '@/services/invoice-service';
import type { ThemeColors } from '@/hooks/useTheme';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';
import { getIconSize } from './download-button-helpers';

// ─── DownloadOnlyButtonInner ─────────────────────────────────────────────────

interface SingleButtonInnerProps {
  invoice: Invoice;
  size?: 'small' | 'medium' | 'large';
  palette: ThemeColors;
}

export const DownloadOnlyButtonInner = function DownloadOnlyButtonInner({
  invoice,
  size = 'medium',
  palette,
}: SingleButtonInnerProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);

    await runAsyncTryCatchFinally(async () => {
      const result = await invoiceService.downloadInvoice(invoice.id);
      if (result) {
        uiFeedback.showToast(`${invoice.invoiceNumber} saved.`);
      } else {
        uiFeedback.showToast('Could not download the invoice. Please try again.', 'error');
      }
    }, async error => {
      uiFeedback.showToast('Something went wrong. Check your connection and try again.', 'error');
    }, () => {
      setDownloading(false);
    });
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
};

// ─── ShareOnlyButtonInner ────────────────────────────────────────────────────

export const ShareOnlyButtonInner = function ShareOnlyButtonInner({
  invoice,
  size = 'medium',
  palette,
}: SingleButtonInnerProps) {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);

    await runAsyncTryCatchFinally(async () => {
      await invoiceService.shareInvoice(invoice.id);
    }, async error => {
      uiFeedback.showToast('Could not share the invoice.', 'error');
    }, () => {
      setSharing(false);
    });
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
};

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
