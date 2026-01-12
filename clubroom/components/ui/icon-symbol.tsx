// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'map.fill': 'explore',
  'calendar': 'event',
  'calendar.badge.clock': 'schedule',
  'clock': 'access-time',
  'person.circle': 'person',
  'person.circle.fill': 'account-circle',
  'bubble.left.and.bubble.right.fill': 'chat-bubble',
  'photo.on.rectangle': 'photo',
  'shield.checkerboard': 'shield',
  'doc.text': 'description',
  'paperclip': 'attach-file',
  'mic.fill': 'mic',
  'checkmark.seal.fill': 'verified',
  // Admin-specific icons
  'person.2.fill': 'people',
  'exclamationmark.triangle.fill': 'warning',
  'gearshape.fill': 'settings',
  // Social/Feed icons
  'newspaper.fill': 'article',
  'person.3.fill': 'groups',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const mappedName = MAPPING[name];

  // Debug logging for icon rendering - helps catch missing mappings
  if (!mappedName) {
    console.error('[IconSymbol] ERROR: No mapping found for:', name);
    // Fallback to a default icon if mapping is missing
    return <MaterialIcons color={color} size={size} name="help-outline" style={style} />;
  }

  return <MaterialIcons color={color} size={size} name={mappedName} style={style} />;
}
