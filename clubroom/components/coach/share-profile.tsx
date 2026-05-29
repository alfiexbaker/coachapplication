import React, { useState } from 'react';
import { StyleSheet, Modal, Share, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

import {
  ShareUrlBox,
  ShareActionRow,
  ShareQrSection,
  ShareSlugEditor,
} from './share-profile-sections';
import { Row } from '@/components/primitives';

interface ShareProfileProps {
  coachId: string;
  coachName: string;
  profileUrl: string;
  onClose: () => void;
}

export function ShareProfile({ coachId, coachName, profileUrl, onClose }: ShareProfileProps) {
  const { colors: palette } = useTheme();

  const [copied, setCopied] = useState(false);
  const [slug, setSlug] = useState(() => coachId);
  const [editingSlug, setEditingSlug] = useState(false);

  const shareUrl = `https://clubroom.app/coach/${slug}`;

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  const handleNativeShare = async () => {
    try {
      await Share.share({
        message: `Check out ${coachName} on Clubroom! ${shareUrl}`,
        url: shareUrl,
        title: `${coachName} - Clubroom Coach Profile`,
      });
    } catch {
      // User cancelled
    }
  };

  const handleSlugSave = () => {
    setEditingSlug(false);
  };

  const handleSlugChange = (text: string) => {
    setSlug(text.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  };

  const handleSlugCancel = () => {
    setSlug(coachId);
    setEditingSlug(false);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Clickable
        style={[styles.overlay, { backgroundColor: withAlpha(palette.text, 0.4) }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close share profile modal"
      >
        <View
          style={[styles.sheet, { backgroundColor: palette.surface }]}
          onStartShouldSetResponder={() => true}
        >
          <Row style={styles.sheetHeader}>
            <ThemedText style={[Typography.title, { color: palette.text }]}>
              Share Profile
            </ThemedText>
            <Clickable accessibilityLabel="Close" onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={Components.icon.lg} color={palette.muted} />
            </Clickable>
          </Row>

          <ShareUrlBox url={shareUrl} palette={palette} />

          <ShareActionRow
            icon={copied ? 'checkmark-circle' : 'copy-outline'}
            title={copied ? 'Copied!' : 'Copy Link'}
            subtitle={copied ? 'Link copied to clipboard' : 'Copy profile link to clipboard'}
            onPress={handleCopyLink}
            iconColor={copied ? palette.success : palette.tint}
            iconBg={copied ? withAlpha(palette.success, 0.09) : withAlpha(palette.tint, 0.07)}
            titleColor={copied ? palette.success : palette.text}
            bgOverride={copied ? withAlpha(palette.success, 0.07) : palette.background}
            palette={palette}
          />

          <ShareActionRow
            icon="share-outline"
            title="Share via..."
            subtitle="Share using Messages, WhatsApp, Email, etc."
            onPress={handleNativeShare}
            showChevron
            palette={palette}
          />

          <ShareQrSection url={shareUrl} palette={palette} />

          <ShareSlugEditor
            slug={slug}
            editing={editingSlug}
            onChangeSlug={handleSlugChange}
            onStartEditing={() => setEditingSlug(true)}
            onSave={handleSlugSave}
            onCancel={handleSlugCancel}
            palette={palette}
          />
        </View>
      </Clickable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    maxHeight: '90%',
  },
  sheetHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
