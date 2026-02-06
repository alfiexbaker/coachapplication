/**
 * Input Primitive
 *
 * TextInput with label, error state, helper text, and icon slots.
 *
 * Usage:
 *   <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" />
 *   <Input label="Password" secureTextEntry error="Password is required" />
 *   <Input label="Bio" multiline helperText="Max 200 characters" />
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Components, Fonts, Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InputProps {
  /** Field label displayed above the input */
  label?: string;
  /** Current value */
  value?: string;
  /** Change handler */
  onChangeText?: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Error message — triggers error styling when truthy */
  error?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Enable multiline mode */
  multiline?: boolean;
  /** Secure text entry (password fields) */
  secureTextEntry?: boolean;
  /** Ionicons icon name for left slot */
  leftIcon?: keyof typeof Ionicons.glyphMap;
  /** Ionicons icon name for right slot */
  rightIcon?: keyof typeof Ionicons.glyphMap;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional container style */
  style?: StyleProp<ViewStyle>;
  /** Additional TextInput props */
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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

  const handleFocus = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
      setIsFocused(true);
      onFocus?.(e);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
      setIsFocused(false);
      onBlur?.(e);
    },
    [onBlur],
  );

  const hasError = Boolean(error);
  const borderColor = hasError
    ? colors.error
    : isFocused
      ? colors.tint
      : colors.border;

  const themedStyles = useMemo(
    () => ({
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
    }),
    [colors],
  );

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={[styles.label, themedStyles.label]}>{label}</Text>
      ) : null}

      <View style={styles.inputWrapper}>
        {leftIcon ? (
          <View style={styles.iconLeft}>
            <Ionicons
              name={leftIcon}
              size={Components.icon.md}
              color={colors.muted}
            />
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
          onFocus={handleFocus}
          onBlur={handleBlur}
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
            <Ionicons
              name={rightIcon}
              size={Components.icon.md}
              color={colors.muted}
            />
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

export const Input = React.memo(InputInner);

// ---------------------------------------------------------------------------
// Styles (color-independent)
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xxs,
  },
  label: {
    ...Typography.caption,
    fontWeight: '500',
    fontFamily: Fonts?.sans,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    height: Components.input.height,
    borderRadius: Components.input.borderRadius,
    paddingHorizontal: Components.input.paddingHorizontal,
    borderWidth: 1,
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    fontFamily: Fonts?.sans,
  },
  inputWithLeftIcon: {
    paddingLeft: Components.input.paddingHorizontal + Components.icon.md + Spacing.xs,
  },
  inputWithRightIcon: {
    paddingRight: Components.input.paddingHorizontal + Components.icon.md + Spacing.xs,
  },
  multiline: {
    height: undefined,
    minHeight: 100,
    paddingVertical: Spacing.sm,
    textAlignVertical: 'top',
  },
  iconLeft: {
    position: 'absolute',
    left: Spacing.sm,
    zIndex: 1,
  },
  iconRight: {
    position: 'absolute',
    right: Spacing.sm,
    zIndex: 1,
  },
  helperBase: {
    ...Typography.caption,
    fontFamily: Fonts?.sans,
  },
});
