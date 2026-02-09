import { View, StyleSheet, Modal, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii , Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { createLogger } from '@/utils/logger';
import type { Attachment } from '@/constants/types';

const logger = createLogger('AttachmentPicker');

interface AttachmentPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (attachments: Attachment[]) => void;
  allowMultiple?: boolean;
  allowedTypes?: ('IMAGE' | 'VIDEO' | 'DOCUMENT')[];
}

const PICKER_OPTIONS: {
  key: 'photo' | 'camera' | 'video' | 'document';
  icon: string;
  label: string;
  description: string;
  colorKey: 'success' | 'info' | 'error' | 'warning';
  types: ('IMAGE' | 'VIDEO' | 'DOCUMENT')[];
}[] = [
  {
    key: 'photo',
    icon: 'image',
    label: 'Photo',
    description: 'Choose from gallery',
    colorKey: 'success',
    types: ['IMAGE'],
  },
  {
    key: 'camera',
    icon: 'camera',
    label: 'Camera',
    description: 'Take a photo',
    colorKey: 'info',
    types: ['IMAGE'],
  },
  {
    key: 'video',
    icon: 'videocam',
    label: 'Video',
    description: 'Record or select',
    colorKey: 'error',
    types: ['VIDEO'],
  },
  {
    key: 'document',
    icon: 'document',
    label: 'Document',
    description: 'PDF, DOC, etc.',
    colorKey: 'warning',
    types: ['DOCUMENT'],
  },
];

export function AttachmentPicker({
  visible,
  onClose,
  onSelect,
  allowMultiple = true,
  allowedTypes = ['IMAGE', 'VIDEO', 'DOCUMENT'],
}: AttachmentPickerProps) {
  const { colors: palette } = useTheme();

  const availableOptions = PICKER_OPTIONS.filter((opt) =>
    opt.types.some((t) => allowedTypes.includes(t))
  );

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: allowMultiple,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const attachments: Attachment[] = result.assets.map((asset) => ({
          type: 'IMAGE' as const,
          url: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          size: asset.fileSize,
          mimeType: asset.mimeType || 'image/jpeg',
          thumbnailUrl: asset.uri,
        }));
        onSelect(attachments);
        onClose();
      }
    } catch (error) {
      logger.error('Failed to pick photo', error);
      Alert.alert('Error', 'Failed to select photo. Please try again.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Camera access is needed to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const attachment: Attachment = {
          type: 'IMAGE',
          url: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          size: asset.fileSize,
          mimeType: asset.mimeType || 'image/jpeg',
          thumbnailUrl: asset.uri,
        };
        onSelect([attachment]);
        onClose();
      }
    } catch (error) {
      logger.error('Failed to take photo', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handlePickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const attachment: Attachment = {
          type: 'VIDEO',
          url: asset.uri,
          name: asset.fileName || `video_${Date.now()}.mp4`,
          size: asset.fileSize,
          mimeType: asset.mimeType || 'video/mp4',
          thumbnailUrl: asset.uri,
          duration: asset.duration ?? undefined,
        };
        onSelect([attachment]);
        onClose();
      }
    } catch (error) {
      logger.error('Failed to pick video', error);
      Alert.alert('Error', 'Failed to select video. Please try again.');
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: allowMultiple,
      });

      if (!result.canceled && result.assets.length > 0) {
        const attachments: Attachment[] = result.assets.map((asset) => ({
          type: 'DOCUMENT' as const,
          url: asset.uri,
          name: asset.name,
          size: asset.size,
          mimeType: asset.mimeType || 'application/octet-stream',
        }));
        onSelect(attachments);
        onClose();
      }
    } catch (error) {
      logger.error('Failed to pick document', error);
      Alert.alert('Error', 'Failed to select document. Please try again.');
    }
  };

  const handleOptionPress = async (key: 'photo' | 'camera' | 'video' | 'document') => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    switch (key) {
      case 'photo':
        await handlePickPhoto();
        break;
      case 'camera':
        await handleTakePhoto();
        break;
      case 'video':
        await handlePickVideo();
        break;
      case 'document':
        await handlePickDocument();
        break;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Clickable onPress={onClose} style={styles.backdrop} />

        <View style={[styles.sheet, { backgroundColor: palette.background }]}>
          <View style={[styles.handle, { backgroundColor: palette.border }]} />

          <ThemedText type="subtitle" style={styles.title}>
            Add Attachment
          </ThemedText>

          <View style={styles.optionsGrid}>
            {availableOptions.map((option) => {
              const optionColor = palette[option.colorKey];
              return (
              <Clickable
                key={option.key}
                onPress={() => handleOptionPress(option.key)}
                style={[styles.option, { backgroundColor: palette.surface }]}
              >
                <View style={[styles.iconCircle, { backgroundColor: withAlpha(optionColor, 0.09) }]}>
                  <Ionicons name={option.icon as keyof typeof Ionicons.glyphMap} size={28} color={optionColor} />
                </View>
                <ThemedText type="defaultSemiBold" style={styles.optionLabel}>
                  {option.label}
                </ThemedText>
                <ThemedText style={[styles.optionDescription, { color: palette.muted }]}>
                  {option.description}
                </ThemedText>
              </Clickable>
              );
            })}
          </View>

          <Clickable
            onPress={onClose}
            style={[styles.cancelButton, { borderColor: palette.border }]}
          >
            <ThemedText style={{ fontWeight: '600' }}>Cancel</ThemedText>
          </Clickable>
        </View>
      </View>
    </Modal>
  );
}

// Preview component for selected attachments
interface AttachmentPreviewProps {
  attachment: Attachment;
  onRemove?: () => void;
  compact?: boolean;
}

export function AttachmentPreview({
  attachment,
  onRemove,
  compact = false,
}: AttachmentPreviewProps) {
  const { colors: palette } = useTheme();

  const getIcon = () => {
    switch (attachment.type) {
      case 'IMAGE':
        return 'image';
      case 'VIDEO':
        return 'videocam';
      case 'DOCUMENT':
        return 'document';
      default:
        return 'attach';
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (compact) {
    return (
      <View
        style={[
          styles.compactPreview,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Ionicons name={getIcon() as keyof typeof Ionicons.glyphMap} size={14} color={palette.tint} />
        <ThemedText style={styles.compactName} numberOfLines={1}>
          {attachment.name}
        </ThemedText>
        {onRemove && (
          <Clickable onPress={onRemove}>
            <Ionicons name="close-circle" size={16} color={palette.muted} />
          </Clickable>
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.previewCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      {attachment.type === 'IMAGE' && attachment.thumbnailUrl ? (
        <Image source={{ uri: attachment.thumbnailUrl }} style={styles.previewImage} />
      ) : (
        <View style={[styles.previewPlaceholder, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
          <Ionicons name={getIcon() as keyof typeof Ionicons.glyphMap} size={32} color={palette.tint} />
        </View>
      )}

      <View style={styles.previewInfo}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {attachment.name}
        </ThemedText>
        <ThemedText style={[styles.previewMeta, { color: palette.muted }]}>
          {attachment.type} {formatSize(attachment.size)}
        </ThemedText>
      </View>

      {onRemove && (
        <Clickable onPress={onRemove} style={styles.removeButton}>
          <Ionicons name="trash-outline" size={18} color={palette.error} />
        </Clickable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: Radii.xs,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  option: {
    width: '47%',
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: { ...Typography.body },
  optionDescription: { ...Typography.caption },
  cancelButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  compactPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
    maxWidth: 150,
  },
  compactName: { ...Typography.caption, flex: 1 },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  previewImage: {
    width: 48,
    height: 48,
    borderRadius: Radii.sm,
  },
  previewPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  previewMeta: { ...Typography.caption },
  removeButton: {
    padding: Spacing.xs,
  },
});
