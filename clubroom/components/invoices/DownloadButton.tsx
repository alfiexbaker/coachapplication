import { useState } from 'react';
import { StyleSheet, ActivityIndicator } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { createLogger } from '@/utils/logger';
import { Invoice } from '@/constants/types';
import { invoiceService } from '@/services/invoice-service';

import { getButtonSize, getIconSize, getFontSize } from './download-button-helpers';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

export { DownloadOnlyButton } from './download-only-button';
export { ShareOnlyButton } from './share-only-button';

const logger = createLogger('DownloadButton');

interface DownloadButtonProps {
  invoice: Invoice;
  variant?: 'primary' | 'secondary' | 'icon';
  size?: 'small' | 'medium' | 'large';
  onDownloadStart?: () => void;
  onDownloadComplete?: (success: boolean) => void;
}

export function DownloadButton({
  invoice,
  variant = 'primary',
  size = 'medium',
  onDownloadStart,
  onDownloadComplete,
}: DownloadButtonProps) {
  const { colors: palette } = useTheme();
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleDownload = async () => {
    if (downloading || sharing) return;
    setDownloading(true);
    onDownloadStart?.();

    await runAsyncTryCatchFinally(
      async () => {
        const result = await invoiceService.downloadInvoice(invoice.id);
        if (result) {
          uiFeedback.showToast(`${invoice.invoiceNumber} has been saved to your device.`);
          onDownloadComplete?.(true);
        } else {
          uiFeedback.showToast('Could not download the invoice. Please try again.', 'error');
          onDownloadComplete?.(false);
        }
      },
      async (error) => {
        logger.error('Download error', error);
        uiFeedback.showToast('An error occurred while downloading the invoice.', 'error');
        onDownloadComplete?.(false);
      },
      () => {
        setDownloading(false);
      },
    );
  };

  const handleShare = async () => {
    if (downloading || sharing) return;
    setSharing(true);

    await runAsyncTryCatchFinally(
      async () => {
        const success = await invoiceService.shareInvoice(invoice.id);
        if (!success) {
          uiFeedback.showToast('Could not share the invoice. Please try again.', 'error');
        }
      },
      async (error) => {
        logger.error('Share error', error);
        uiFeedback.showToast('An error occurred while sharing the invoice.', 'error');
      },
      () => {
        setSharing(false);
      },
    );
  };

  const iconSz = getIconSize(size);

  if (variant === 'icon') {
    return (
      <Row gap="xs">
        <Clickable
          style={[
            styles.iconButton,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          onPress={handleDownload}
          disabled={downloading || sharing}
        >
          {downloading ? (
            <ActivityIndicator size="small" color={palette.tint} />
          ) : (
            <Ionicons name="download-outline" size={iconSz} color={palette.tint} />
          )}
        </Clickable>
        <Clickable
          accessibilityLabel="Share invoice"
          style={[
            styles.iconButton,
            { backgroundColor: palette.surface, borderColor: palette.border },
          ]}
          onPress={handleShare}
          disabled={downloading || sharing}
        >
          {sharing ? (
            <ActivityIndicator size="small" color={palette.tint} />
          ) : (
            <Ionicons name="share-outline" size={iconSz} color={palette.tint} />
          )}
        </Clickable>
      </Row>
    );
  }

  const isPrimary = variant === 'primary';
  const btnSize = getButtonSize(size);
  const fontSize = getFontSize(size);

  return (
    <Row gap="sm">
      <Clickable
        style={[
          styles.button,
          btnSize,
          {
            backgroundColor: isPrimary ? palette.tint : palette.surface,
            borderColor: isPrimary ? palette.tint : palette.border,
            borderWidth: isPrimary ? 0 : 1,
            flex: 1,
          },
        ]}
        onPress={handleDownload}
        disabled={downloading || sharing}
      >
        {downloading ? (
          <ActivityIndicator size="small" color={isPrimary ? palette.onPrimary : palette.tint} />
        ) : (
          <>
            <Ionicons
              name="download-outline"
              size={iconSz}
              color={isPrimary ? palette.onPrimary : palette.text}
            />
            <ThemedText
              style={[
                styles.buttonText,
                { color: isPrimary ? palette.onPrimary : palette.text, fontSize },
              ]}
            >
              Download
            </ThemedText>
          </>
        )}
      </Clickable>

      <Clickable
        style={[
          styles.button,
          btnSize,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            borderWidth: 1,
            flex: 1,
          },
        ]}
        onPress={handleShare}
        disabled={downloading || sharing}
      >
        {sharing ? (
          <ActivityIndicator size="small" color={palette.tint} />
        ) : (
          <>
            <Ionicons name="share-outline" size={iconSz} color={palette.text} />
            <ThemedText style={[styles.buttonText, { color: palette.text, fontSize }]}>
              Share
            </ThemedText>
          </>
        )}
      </Clickable>
    </Row>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.md,
  },
  buttonText: { fontWeight: '600' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
