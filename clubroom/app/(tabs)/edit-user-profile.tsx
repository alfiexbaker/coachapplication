import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Components } from '@/constants/theme';
import { mockUserProfile } from '@/constants/mock-data';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function EditUserProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [fullName, setFullName] = useState(mockUserProfile.fullName);
  const [email, setEmail] = useState(mockUserProfile.email);
  const [phone, setPhone] = useState(mockUserProfile.phone || '');
  const [bio, setBio] = useState(mockUserProfile.bio || '');
  const [children, setChildren] = useState(mockUserProfile.children || []);

  const handleSave = () => {
    Alert.alert('Profile updated');
    router.back();
  };

  const pickImage = () => {
    Alert.alert('Photo upload');
  };

  const addChild = () => {
    const newChild = { name: '', age: 0 };
    setChildren([...children, newChild]);
  };

  const updateChild = (index: number, field: 'name' | 'age', value: string | number) => {
    const updated = [...children];
    updated[index] = { ...updated[index], [field]: value };
    setChildren(updated);
  };

  const removeChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={palette.foreground} />
        </Pressable>
        <ThemedText type="subtitle">Edit Profile</ThemedText>
        <Pressable onPress={handleSave}>
          <ThemedText style={[styles.saveButton, { color: palette.tint }]}>Save</ThemedText>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrapper}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Profile Photo */}
          <SurfaceCard style={styles.section}>
            <Pressable onPress={pickImage} style={styles.avatarContainer}>
              {mockUserProfile.profilePhotoUrl ? (
                <Image source={{ uri: mockUserProfile.profilePhotoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: palette.border }]}>
                  <Ionicons name="person" size={48} color={palette.muted} />
                </View>
              )}
              <View style={[styles.avatarOverlay, { backgroundColor: palette.tint }]}>
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              </View>
            </Pressable>
          </SurfaceCard>

          {/* Basic Info */}
          <SurfaceCard style={styles.section}>
            <ThemedText type="subtitle">Basic Information</ThemedText>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Full Name</ThemedText>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your name"
                placeholderTextColor={palette.muted}
                style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="your@email.com"
                placeholderTextColor={palette.muted}
                style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Phone</ThemedText>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+1 (555) 123-4567"
                placeholderTextColor={palette.muted}
                style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Bio</ThemedText>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="A bit about yourself..."
                placeholderTextColor={palette.muted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={[
                  styles.input,
                  styles.textArea,
                  { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground },
                ]}
              />
            </View>
          </SurfaceCard>

          {/* Children */}
          {mockUserProfile.role === 'Parent' && (
            <SurfaceCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText type="subtitle">Children</ThemedText>
                <Pressable onPress={addChild}>
                  <Ionicons name="add-circle" size={28} color={palette.tint} />
                </Pressable>
              </View>

              {children.map((child, index) => (
                <View key={index} style={[styles.childRow, { borderColor: palette.border }]}>
                  <View style={styles.childFields}>
                    <TextInput
                      value={child.name}
                      onChangeText={(text) => updateChild(index, 'name', text)}
                      placeholder="Name"
                      placeholderTextColor={palette.muted}
                      style={[styles.input, styles.childNameInput, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
                    />
                    <TextInput
                      value={child.age.toString()}
                      onChangeText={(text) => updateChild(index, 'age', parseInt(text) || 0)}
                      placeholder="Age"
                      keyboardType="number-pad"
                      placeholderTextColor={palette.muted}
                      style={[styles.input, styles.childAgeInput, { borderColor: palette.border, backgroundColor: palette.card, color: palette.foreground }]}
                    />
                  </View>
                  <Pressable onPress={() => removeChild(index)}>
                    <Ionicons name="trash-outline" size={24} color={palette.destructive} />
                  </Pressable>
                </View>
              ))}
            </SurfaceCard>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  saveButton: {
    fontWeight: '700',
    fontSize: 16,
  },
  wrapper: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    alignSelf: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    paddingTop: Spacing.sm,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
  },
  childFields: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  childNameInput: {
    flex: 2,
  },
  childAgeInput: {
    flex: 1,
  },
});
