import React, { useState } from 'react';
import {
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Components } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { styles } from './input-styles';

export interface InputProps {
  label?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: TextInputProps['autoCorrect'];
  maxLength?: TextInputProps['maxLength'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: TextInputProps['onSubmitEditing'];
  onBlur?: TextInputProps['onBlur'];
  onFocus?: TextInputProps['onFocus'];
  testID?: string;
}

function InputInner({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  helperText,
  multiline = false,
  secureTextEntry = false,
  leftIcon,
  rightIcon,
  disabled = false,
  style,
  keyboardType,
  autoCapitalize,
  autoCorrect,
  maxLength,
  returnKeyType,
  onSubmitEditing,
  onBlur,
  onFocus,
  testID,
}: InputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const markInputFocused = (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const markInputBlurred = (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const hasError = Boolean(error);
  const borderColor = hasError ? colors.error : isFocused ? colors.tint : colors.border;

  const themedStyles = ({
    label: { color: colors.muted },

    input: {
      backgroundColor: colors.surface,
      color: colors.text,
    },

    disabled: {
      backgroundColor: colors.surfaceSecondary,
      opacity: 0.6,
    },

    error: { color: colors.error },
    helper: { color: colors.muted },
  });

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={[styles.label, themedStyles.label]}>{label}</Text> : null}

      <View style={styles.inputWrapper}>
        {leftIcon ? (
          <View style={styles.iconLeft}>
            <Ionicons name={leftIcon} size={Components.icon.md} color={colors.muted} />
          </View>
        ) : null}

        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          editable={!disabled}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          maxLength={maxLength}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={markInputFocused}
          onBlur={markInputBlurred}
          style={[
            styles.input,
            themedStyles.input,
            { borderColor },
            leftIcon ? styles.inputWithLeftIcon : undefined,
            rightIcon ? styles.inputWithRightIcon : undefined,
            multiline ? styles.multiline : undefined,
            disabled ? themedStyles.disabled : undefined,
          ]}
        />

        {rightIcon ? (
          <View style={styles.iconRight}>
            <Ionicons name={rightIcon} size={Components.icon.md} color={colors.muted} />
          </View>
        ) : null}
      </View>

      {hasError ? (
        <Text style={[styles.helperBase, themedStyles.error]}>{error}</Text>
      ) : helperText ? (
        <Text style={[styles.helperBase, themedStyles.helper]}>{helperText}</Text>
      ) : null}
    </View>
  );
}

export const Input = InputInner;
