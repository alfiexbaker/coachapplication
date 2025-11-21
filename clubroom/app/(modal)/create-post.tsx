import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { router } from 'expo-router';
import { MOCK_POSTS } from '@/constants/mock-data';
import type { Post } from '@/constants/app-types';

export default function CreatePostScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const [content, setContent] = useState('');

  const handlePost = () => {
    if (!content.trim() || !currentUser) return;

    // Mock implementation - create new post
    const newPost: Post = {
      id: `post${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      content: content.trim(),
      likes: [],
      commentCount: 0,
      createdAt: new Date().toISOString(),
    };

    // Add to beginning of posts array
    MOCK_POSTS.unshift(newPost);

    // Navigate back
    router.back();
  };

  const canPost = content.trim().length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: palette.background, borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
          <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
        </TouchableOpacity>
        <ThemedText type="subtitle">New Post</ThemedText>
        <TouchableOpacity
          onPress={handlePost}
          disabled={!canPost}
          style={styles.postButton}
        >
          <ThemedText
            type="defaultSemibold"
            style={{ color: canPost ? palette.tint : palette.muted }}
          >
            Post
          </ThemedText>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.authorSection}>
          <View style={[styles.avatar, { backgroundColor: palette.tintAlt }]}>
            <ThemedText style={{ fontSize: 28 }}>{currentUser?.avatar || '👤'}</ThemedText>
          </View>
          <View style={styles.authorInfo}>
            <ThemedText type="defaultSemibold">{currentUser?.name}</ThemedText>
            <ThemedText style={[styles.role, { color: palette.muted }]}>
              {currentUser?.role === 'COACH' ? 'Coach' : currentUser?.role === 'PARENT' ? 'Parent' : 'Athlete'}
            </ThemedText>
          </View>
        </View>

        <TextInput
          style={[styles.input, { color: palette.text }]}
          placeholder="What's on your mind?"
          placeholderTextColor={palette.muted}
          value={content}
          onChangeText={setContent}
          multiline
          autoFocus
          textAlignVertical="top"
        />

        <View style={styles.footer}>
          <ThemedText style={[styles.hint, { color: palette.muted }]}>
            Share your training tips, achievements, or ask questions!
          </ThemedText>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  cancelButton: {
    paddingVertical: 4,
  },
  postButton: {
    paddingVertical: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorInfo: {
    flex: 1,
  },
  role: {
    fontSize: 12,
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  footer: {
    paddingVertical: 12,
  },
  hint: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
