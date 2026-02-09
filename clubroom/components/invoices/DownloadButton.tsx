import { useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { createLogger } from '@/utils/logger';
import { Invoice } from '@/constants/types';
import { invoiceService } from '@/services/invoice-service';

const logger = createLogger('DownloadButton');

// ============================================================================
// TYPES
// ============================================================================

interface DownloadButtonProps {
  invoice: Invoice;
  variant?: 'primary' | 'secondary' | 'icon';
  size?: 'small' | 'medium' | 'large';
  onDownloadStart?: () => void;
  onDownloadComplete?: (success: boolean) => void;
}


// ============================================================================
// COMPONENT
// ============================================================================

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

    try {
      const result = await invoiceService.downloadInvoice(invoice.id);

      if (result) {
        Alert.alert(
          'Invoice Downloaded',
          `${invoice.invoiceNumber} has been saved to your device.`,
          [{ text: 'OK' }]
        );
        onDownloadComplete?.(true);
      } else {
        Alert.alert('Download Failed', 'Could not download the invoice. Please try again.');
        onDownloadComplete?.(false);
      }
    } catch (error) {
      logger.error('Download error', error);
      Alert.alert('Download Failed', 'An error occurred while downloading the invoice.');
      onDownloadComplete?.(false);
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (downloading || sharing) return;

    setSharing(true);

    try {
      const success = await invoiceService.shareInvoice(invoice.id);

      if (!success) {
        Alert.alert('Share Failed', 'Could not share the invoice. Please try again.');
      }
    } catch (error) {
      logger.error('Share error', error);
      Alert.alert('Share Failed', 'An error occurred while sharing the invoice.');
    } finally {
      setSharing(false);
    }
  };

  const getButtonSize = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: 8, paddingHorizontal: Spacing.xs + Spacing.xxs };
      case 'large':
        return { paddingVertical: 16, paddingHorizontal: 24 };
      default:
        return { paddingVertical: Spacing.xs + Spacing.xxs, paddingHorizontal: 16 };
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 24;
      default:
        return 20;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 13;
      case 'large':
        return 17;
      default:
        return 15;
    }
  };

  // Icon-only variant
  if (variant === 'icon') {
    return (
      <View style={styles.iconContainer}>
        <Pressable
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
            <Ionicons name="download-outline" size={getIconSize()} color={palette.tint} />
          )}
        </Pressable>

        <Pressable
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
            <Ionicons name="share-outline" size={getIconSize()} color={palette.tint} />
          )}
        </Pressable>
      </View>
    );
  }

  // Full button variants
  const isPrimary = variant === 'primary';

  return (
    <View style={styles.buttonContainer}>
      {/* Download Button */}
      <Pressable
        style={[
          styles.button,
          getButtonSize(),
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
          <ActivityIndicator
            size="small"
            color={isPrimary ? palette.onPrimary : palette.tint}
          />
        ) : (
          <>
            <Ionicons
              name="download-outline"
              size={getIconSize()}
              color={isPrimary ? palette.onPrimary : palette.text}
            />
            <ThemedText
              style={[
                styles.buttonText,
                {
                  color: isPrimary ? palette.onPrimary : palette.text,
                  fontSize: getFontSize(),
                },
              ]}
            >
              Download
            </ThemedText>
          </>
        )}
      </Pressable>

      {/* Share Button */}
      <Pressable
        style={[
          styles.button,
          getButtonSize(),
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
            <Ionicons name="share-outline" size={getIconSize()} color={palette.text} />
            <ThemedText
              style={[
                styles.buttonText,
                {
                  color: palette.text,
                  fontSize: getFontSize(),
                },
              ]}
            >
              Share
            </ThemedText>
          </>
        )}
      </Pressable>
    </View>
  );
}

// ============================================================================
// SINGLE ACTION BUTTONS
// ============================================================================

interface SingleButtonProps {
  invoice: Invoice;
  size?: 'small' | 'medium' | 'large';
}

export function DownloadOnlyButton({ invoice, size = 'medium' }: SingleButtonProps) {
  const { colors: palette } = useTheme();
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

  const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;

  return (
    <Pressable
      style={[styles.singleButton, { backgroundColor: palette.tint }]}
      onPress={handleDownload}
      disabled={downloading}
    >
      {downloading ? (
        <ActivityIndicator size="small" color={palette.onPrimary} />
      ) : (
        <Ionicons name="download-outline" size={iconSize} color={palette.onPrimary} />
      )}
    </Pressable>
  );
}

export function ShareOnlyButton({ invoice, size = 'medium' }: SingleButtonProps) {
  const { colors: palette } = useTheme();
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

  const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20;

  return (
    <Pressable
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
        <Ionicons name="share-outline" size={iconSize} color={palette.text} />
      )}
    </Pressable>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.md,
  },
  buttonText: {
    fontWeight: '600',
  },
  iconContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  singleButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
