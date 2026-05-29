import { useEffect, type RefObject } from 'react';
import type { ScrollView, FlatList } from 'react-native';
import { useNavigation } from 'expo-router';

type ScrollableRef =
  | RefObject<ScrollView | FlatList<any> | null>
  | RefObject<ScrollView | null>
  | RefObject<FlatList<any> | null>;

function subscribeToTabReselect(
  navigation: { addListener: (event: string, cb: () => void) => () => void },
  ref: ScrollableRef,
) {
  return navigation.addListener('tabPress', () => {
    const current = ref.current as
      | {
          scrollTo?: (options: { y: number; animated: boolean }) => void;
          scrollToOffset?: (options: { offset: number; animated: boolean }) => void;
        }
      | null;
    if (current?.scrollTo) {
      current.scrollTo({ y: 0, animated: true });
    }
    if (current?.scrollToOffset) {
      current.scrollToOffset({ offset: 0, animated: true });
    }
  });
}

export function useScrollToTopOnTabReselect(ref: ScrollableRef) {
  const navigation = useNavigation();

  useEffect(() => {
    const typedNavigation = navigation as { addListener: (event: string, cb: () => void) => () => void };
    return subscribeToTabReselect(typedNavigation, ref);
  }, [navigation, ref]);
}
