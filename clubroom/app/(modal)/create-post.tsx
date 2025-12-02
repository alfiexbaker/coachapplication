import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Components } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { router } from 'expo-router';
import { socialFeedService } from '@/services/social-feed-service';

export default function CreatePostScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const [content, setContent] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const removeImage = () => {
    setImageUri(null);
  };

  const handlePost = () => {
    if (!content.trim() && !imageUri) return;
    if (!currentUser) return;

    socialFeedService.addPost({
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      content: content.trim(),
      imageUrl: imageUri || undefined,
      context: 'manual',
    });

    // Navigate back
    router.back();
  };

  const canPost = content.trim().length > 0 || imageUri !== null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      {/* Header - Twitter/Facebook style */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={24} color={palette.foreground} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handlePost}
          disabled={!canPost}
          style={[
            styles.postButton,
            {
              backgroundColor: canPost ? palette.tint : palette.border,
              opacity: canPost ? 1 : 0.5,
            },
          ]}
        >
          <ThemedText style={styles.postButtonText}>Post</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Author section - minimal like Twitter */}
        <View style={styles.composerRow}>
          <View style={[styles.avatar, { backgroundColor: palette.tint + '15' }]}>
            <ThemedText style={styles.avatarEmoji}>{currentUser?.avatar || 'AA'}</ThemedText>
          </View>

          <View style={styles.composerContent}>
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder="What's happening?"
              placeholderTextColor={palette.muted}
              value={content}
              onChangeText={setContent}
              multiline
              autoFocus
              maxLength={280}
            />

            {/* Image preview */}
            {imageUri && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={[styles.removeImageButton, { backgroundColor: palette.background }]}
                  onPress={removeImage}
                >
                  <Ionicons name="close" size={16} color={palette.foreground} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Character count */}
        {content.length > 0 && (
          <View style={styles.charCountContainer}>
            <ThemedText style={[styles.charCount, { color: content.length > 280 ? palette.error : palette.muted }]}>
              {content.length}/280
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Footer toolbar - like Twitter/Facebook */}
      <View style={[styles.toolbar, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={pickImage}
        >
          <Ionicons name="image-outline" size={22} color={palette.tint} />
        </TouchableOpacity>
        <View style={styles.toolbarSpacer} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header - minimal Twitter/Facebook style
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
  },
  postButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
    height: 32,
    justifyContent: 'center',
    minWidth: 64,
  },
  postButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },

  // Content area
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Composer - Twitter layout with avatar on left
  composerRow: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 20,
  },
  composerContent: {
    flex: 1,
    gap: Spacing.sm,
  },
  input: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '400',
    minHeight: 100,
    paddingTop: 2,
  },

  // Image preview
  imagePreviewContainer: {
    position: 'relative',
    marginTop: Spacing.sm,
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: Radii.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  // Character count
  charCountContainer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
    alignItems: 'flex-end',
  },
  charCount: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Footer toolbar - like Twitter
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 0.5,
  },
  toolbarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbarSpacer: {
    flex: 1,
  },
});
