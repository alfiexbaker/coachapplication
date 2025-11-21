import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { User } from '@/constants/app-types';

interface ChildSelectorProps {
  children: User[];
  selectedChildId?: string;
  onSelectChild: (childId: string) => void;
  autoSelected?: boolean; // If true, show banner instead of selector
}

export function ChildSelector({ children, selectedChildId, onSelectChild, autoSelected }: ChildSelectorProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // If only one child (auto-selected), show banner
  if (autoSelected && children.length === 1) {
    const child = children[0];
    return (
      <SurfaceCard style={styles.bannerCard}>
        <View style={styles.bannerContent}>
          <View style={[styles.avatarCircle, { backgroundColor: palette.tint + '20' }]}>
            {child.avatar ? (
              <ThemedText style={styles.avatarText}>{child.avatar}</ThemedText>
            ) : (
              <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                {child.name.charAt(0).toUpperCase()}
              </ThemedText>
            )}
          </View>
          <View style={styles.bannerText}>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
              Booking for: {child.name}
            </ThemedText>
            <ThemedText style={{ color: palette.muted, fontSize: 14 }}>
              Session will be assigned to this athlete
            </ThemedText>
          </View>
          <Ionicons name="checkmark-circle" size={24} color={palette.tint} />
        </View>
      </SurfaceCard>
    );
  }

  // Multiple children - show selector cards
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="people" size={20} color={palette.tint} />
        <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>
          Who is this session for?
        </ThemedText>
      </View>
      <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
        Select which athlete will attend this session
      </ThemedText>

      <View style={styles.childGrid}>
        {children.map((child) => {
          const isSelected = child.id === selectedChildId;
          return (
            <Pressable
              key={child.id}
              onPress={() => onSelectChild(child.id)}
              style={({ pressed }) => [
                styles.childCard,
                {
                  borderColor: isSelected ? palette.tint : palette.border,
                  backgroundColor: isSelected ? palette.tint + '12' : palette.surface,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <View style={[styles.avatarCircle, { backgroundColor: isSelected ? palette.tint : palette.border }]}>
                {child.avatar ? (
                  <ThemedText style={[styles.avatarText, { color: isSelected ? '#fff' : palette.text }]}>
                    {child.avatar}
                  </ThemedText>
                ) : (
                  <ThemedText style={[styles.avatarText, { color: isSelected ? '#fff' : palette.text }]}>
                    {child.name.charAt(0).toUpperCase()}
                  </ThemedText>
                )}
              </View>
              <ThemedText type="defaultSemiBold" style={styles.childName}>
                {child.name}
              </ThemedText>
              {child.dateOfBirth && (
                <ThemedText style={[styles.childAge, { color: palette.muted }]}>
                  {calculateAge(child.dateOfBirth)} years old
                </ThemedText>
              )}
              {isSelected && (
                <View style={[styles.selectedBadge, { backgroundColor: palette.tint }]}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  subtitle: {
    fontSize: 14,
  },
  childGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  childCard: {
    flex: 1,
    minWidth: 140,
    borderWidth: 2,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    position: 'relative',
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
  },
  childName: {
    fontSize: 15,
    textAlign: 'center',
  },
  childAge: {
    fontSize: 13,
  },
  selectedBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Banner styles for single child
  bannerCard: {
    padding: Spacing.md,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bannerText: {
    flex: 1,
    gap: 2,
  },
});
