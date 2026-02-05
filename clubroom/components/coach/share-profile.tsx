/**
 * Sprint 7A - Share Profile Component
 *
 * Provides multiple ways to share a coach's public profile:
 * - Copy link with "Copied!" feedback
 * - Native share sheet (iOS/Android)
 * - QR code placeholder display
 * - Editable coach slug for vanity URLs
 *
 * USER STORY:
 * "As a coach, I want to share my profile so parents can easily
 * find and book sessions with me."
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Share,
  TextInput,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShareProfileProps {
  coachId: string;
  coachName: string;
  profileUrl: string;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShareProfile({
  coachId,
  coachName,
  profileUrl,
  onClose,
}: ShareProfileProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [copied, setCopied] = useState(false);
  const [slug, setSlug] = useState(coachId);
  const [editingSlug, setEditingSlug] = useState(false);

  const shareUrl = `https://clubroom.app/coach/${slug}`;

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const handleCopyLink = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available - fail silently
    }
  }, [shareUrl]);

  const handleNativeShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out ${coachName} on Clubroom! ${shareUrl}`,
        url: shareUrl,
        title: `${coachName} - Clubroom Coach Profile`,
      });
    } catch {
      // User cancelled or share failed
    }
  }, [coachName, shareUrl]);

  const handleSlugSave = useCallback(() => {
    setEditingSlug(false);
    // In a real implementation this would call an API to reserve the slug
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: palette.surface }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <ThemedText style={[Typography.title, { color: palette.text }]}>
              Share Profile
            </ThemedText>
            <Clickable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={Components.icon.lg} color={palette.muted} />
            </Clickable>
          </View>

          {/* Profile URL display */}
          <View style={[styles.urlBox, { backgroundColor: palette.background, borderColor: palette.border }]}>
            <Ionicons name="link-outline" size={Components.icon.md} color={palette.muted} />
            <ThemedText
              style={[Typography.body, { color: palette.text, flex: 1 }]}
              numberOfLines={1}
            >
              {shareUrl}
            </ThemedText>
          </View>

          {/* Copy Link button */}
          <Clickable
            onPress={handleCopyLink}
            style={[
              styles.actionRow,
              { backgroundColor: copied ? `${palette.success}12` : palette.background },
            ]}
          >
            <View style={[styles.actionIcon, { backgroundColor: copied ? `${palette.success}18` : `${palette.tint}12` }]}>
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={Components.icon.md}
                color={copied ? palette.success : palette.tint}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={[Typography.bodySemiBold, { color: copied ? palette.success : palette.text }]}>
                {copied ? 'Copied!' : 'Copy Link'}
              </ThemedText>
              <ThemedText style={[Typography.small, { color: palette.muted }]}>
                {copied ? 'Link copied to clipboard' : 'Copy profile link to clipboard'}
              </ThemedText>
            </View>
          </Clickable>

          {/* Native Share */}
          <Clickable
            onPress={handleNativeShare}
            style={[styles.actionRow, { backgroundColor: palette.background }]}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${palette.tint}12` }]}>
              <Ionicons name="share-outline" size={Components.icon.md} color={palette.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
                Share via...
              </ThemedText>
              <ThemedText style={[Typography.small, { color: palette.muted }]}>
                Share using Messages, WhatsApp, Email, etc.
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={Components.icon.md} color={palette.muted} />
          </Clickable>

          {/* QR Code Placeholder */}
          <View style={styles.qrSection}>
            <ThemedText style={[Typography.heading, { color: palette.text, marginBottom: Spacing.sm }]}>
              QR Code
            </ThemedText>
            <View style={[styles.qrPlaceholder, { borderColor: palette.border }]}>
              <Ionicons name="qr-code-outline" size={48} color={palette.muted} />
              <ThemedText
                style={[Typography.small, { color: palette.muted, textAlign: 'center', marginTop: Spacing.xs }]}
              >
                {shareUrl}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: palette.muted, marginTop: Spacing.xs / 2 }]}>
                Scan to view profile
              </ThemedText>
            </View>
          </View>

          {/* Editable Slug */}
          <View style={styles.slugSection}>
            <ThemedText style={[Typography.heading, { color: palette.text }]}>
              Custom URL Slug
            </ThemedText>
            <ThemedText style={[Typography.small, { color: palette.muted, marginTop: Spacing.xs / 2, marginBottom: Spacing.sm }]}>
              Personalise your profile URL for easier sharing
            </ThemedText>
            <View style={styles.slugInputRow}>
              <ThemedText style={[Typography.body, { color: palette.muted }]}>
                clubroom.app/coach/
              </ThemedText>
              {editingSlug ? (
                <TextInput
                  style={[
                    styles.slugInput,
                    {
                      borderColor: palette.tint,
                      color: palette.text,
                    },
                  ]}
                  value={slug}
                  onChangeText={(text) => setSlug(text.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="your-slug"
                  placeholderTextColor={palette.muted}
                />
              ) : (
                <Clickable
                  onPress={() => setEditingSlug(true)}
                  style={[styles.slugDisplay, { borderColor: palette.border }]}
                >
                  <ThemedText style={[Typography.bodySemiBold, { color: palette.tint }]}>
                    {slug}
                  </ThemedText>
                  <Ionicons name="pencil-outline" size={Components.icon.sm} color={palette.muted} />
                </Clickable>
              )}
            </View>
            {editingSlug && (
              <View style={styles.slugActions}>
                <Clickable
                  onPress={() => {
                    setSlug(coachId);
                    setEditingSlug(false);
                  }}
                  style={[styles.slugCancelBtn, { borderColor: palette.border }]}
                >
                  <ThemedText style={[Typography.small, { color: palette.muted }]}>Cancel</ThemedText>
                </Clickable>
                <Clickable
                  onPress={handleSlugSave}
                  style={[styles.slugSaveBtn, { backgroundColor: palette.tint }]}
                >
                  <ThemedText style={[Typography.small, { color: palette.surface, fontWeight: '600' }]}>
                    Save
                  </ThemedText>
                </Clickable>
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // URL display
  urlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    height: Components.input.height,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },

  // Action rows
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.card,
    marginBottom: Spacing.xs,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // QR section
  qrSection: {
    marginTop: Spacing.md,
  },
  qrPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: Radii.card,
  },

  // Slug section
  slugSection: {
    marginTop: Spacing.md,
  },
  slugInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slugInput: {
    flex: 1,
    height: Components.input.height,
    borderWidth: 1.5,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.xs,
    ...Typography.body,
  },
  slugDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: Components.input.height,
    borderWidth: 1,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.xs,
  },
  slugActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  slugCancelBtn: {
    height: Components.buttonCompact.height,
    paddingHorizontal: Spacing.sm,
    borderRadius: Components.buttonCompact.borderRadius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slugSaveBtn: {
    height: Components.buttonCompact.height,
    paddingHorizontal: Spacing.sm,
    borderRadius: Components.buttonCompact.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
