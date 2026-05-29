import { FlatList, StyleSheet, View, type ListRenderItemInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { GroupRegistration } from '@/constants/types';
import type { AttendanceStatus } from '@/hooks/use-group-roster';
import {
  getGroupRegistrationAthleteName,
  getGroupRegistrationParentName,
} from '@/utils/group-display';

interface RollCallParticipantListProps {
  participants: GroupRegistration[];
  attendance: Record<string, AttendanceStatus>;
  colors: ThemeColors;
  onMarkStatus: (id: string, status: AttendanceStatus) => void | Promise<void>;
  onReportInjury: (registration: GroupRegistration) => void;
}

interface RollCallActionItem {
  key: AttendanceStatus;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  iconSize: number;
  isSelected: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}

interface RollCallParticipantItem {
  key: string;
  index: number;
  athleteName: string;
  parentName: string | null;
  status: AttendanceStatus;
  colors: ThemeColors;
  actions: RollCallActionItem[];
  onReportInjury: () => void;
}

export function RollCallParticipantList({
  participants,
  attendance,
  colors,
  onMarkStatus,
  onReportInjury,
}: RollCallParticipantListProps) {
  const participantItems = getRollCallParticipantItems(
    participants,
    attendance,
    colors,
    onMarkStatus,
    onReportInjury,
  );

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      style={styles.list}
      contentContainerStyle={styles.content}
      data={participantItems}
      keyExtractor={keyRollCallParticipantItem}
      renderItem={renderRollCallParticipantItem}
      showsVerticalScrollIndicator={false}
    />
  );
}

function getRollCallParticipantItems(
  participants: GroupRegistration[],
  attendance: Record<string, AttendanceStatus>,
  colors: ThemeColors,
  onMarkStatus: (id: string, status: AttendanceStatus) => void | Promise<void>,
  onReportInjury: (registration: GroupRegistration) => void,
): RollCallParticipantItem[] {
  return participants.map((registration, index) => {
    const status = attendance[registration.id] || 'unmarked';
    const athleteName = getGroupRegistrationAthleteName(registration);
    const parentName = getGroupRegistrationParentName(registration);

    return {
      key: registration.id,
      index,
      athleteName,
      parentName,
      status,
      colors,
      actions: getRollCallActionItems(registration.id, athleteName, status, colors, onMarkStatus),
      onReportInjury: () => onReportInjury(registration),
    };
  });
}

function getRollCallActionItems(
  registrationId: string,
  athleteName: string,
  currentStatus: AttendanceStatus,
  colors: ThemeColors,
  onMarkStatus: (id: string, status: AttendanceStatus) => void | Promise<void>,
): RollCallActionItem[] {
  const actionDefinitions = [
    {
      key: 'present',
      icon: 'checkmark',
      color: colors.success,
      iconSize: 20,
    },
    {
      key: 'late',
      icon: 'time',
      color: colors.warning,
      iconSize: 18,
    },
    {
      key: 'absent',
      icon: 'close',
      color: colors.error,
      iconSize: 20,
    },
  ] as const;

  return actionDefinitions.map((action) => ({
    ...action,
    isSelected: currentStatus === action.key,
    accessibilityLabel: `Mark ${athleteName} as ${action.key}`,
    onPress: () => {
      void onMarkStatus(registrationId, action.key);
    },
  }));
}

function keyRollCallParticipantItem(item: RollCallParticipantItem): string {
  return item.key;
}

function renderRollCallParticipantItem({ item }: ListRenderItemInfo<RollCallParticipantItem>) {
  return (
    <Animated.View
      entering={FadeInDown.delay(item.index * 30).springify()}
      style={[styles.item, { backgroundColor: item.colors.surface }]}
    >
      <Row gap="md" align="center" style={styles.itemHeader}>
        <View style={[styles.avatar, { backgroundColor: withAlpha(item.colors.tint, 0.12) }]}>
          <ThemedText style={[Typography.bodySmallSemiBold, { color: item.colors.tint }]}>
            {getInitials(item.athleteName)}
          </ThemedText>
        </View>
        <Column flex>
          <ThemedText type="defaultSemiBold">{item.athleteName}</ThemedText>
          {item.parentName ? (
            <ThemedText style={[Typography.caption, { color: item.colors.muted }]}>
              Parent: {item.parentName}
            </ThemedText>
          ) : null}
        </Column>
      </Row>
      <Row gap="sm" justify="flex-end">
        {item.actions.map((action) => (
          <Clickable
            key={action.key}
            style={[
              styles.actionBtn,
              {
                backgroundColor: action.isSelected ? action.color : 'transparent',
                borderColor: action.isSelected ? action.color : item.colors.border,
              },
            ]}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.accessibilityLabel}
            accessibilityState={{ selected: action.isSelected }}
          >
            <Ionicons
              name={action.icon}
              size={action.iconSize}
              color={action.isSelected ? item.colors.onPrimary : action.color}
            />
          </Clickable>
        ))}
        <Clickable
          style={[
            styles.injuryBtn,
            {
              backgroundColor: withAlpha(item.colors.error, 0.09),
              borderColor: withAlpha(item.colors.error, 0.19),
            },
          ]}
          onPress={item.onReportInjury}
          accessibilityRole="button"
          accessibilityLabel={`Report injury for ${item.athleteName}`}
        >
          <Ionicons name="medkit" size={16} color={item.colors.error} />
        </Clickable>
      </Row>
    </Animated.View>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('');
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  content: {
    paddingBottom: 40,
  },
  item: { padding: Spacing.md, borderRadius: Radii.md, marginBottom: Spacing.sm },
  itemHeader: { marginBottom: Spacing.sm },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  injuryBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xxs,
  },
});
