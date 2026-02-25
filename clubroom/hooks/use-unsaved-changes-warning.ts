import { Alert } from 'react-native';
import { useNavigation, usePreventRemove } from 'expo-router';

export function useUnsavedChangesWarning(isDirty: boolean): void {
  const navigation = useNavigation();

  usePreventRemove(isDirty, ({ data: { action } }) => {
    Alert.alert('Discard changes?', 'You have unsaved changes. Are you sure you want to leave?', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => navigation.dispatch(action),
      },
    ]);
  });
}
