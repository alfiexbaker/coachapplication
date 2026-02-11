import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  type TextInputProps,
  type NativeSyntheticEvent,
  type TargetedEvent,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Spacing, Radii, Borders, Components, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
type BlurEvent = NativeSyntheticEvent<TargetedEvent>;
export type FormInputType =
  | 'text'
  | 'email'
  | 'password'
  | 'phone'
  | 'number'
  | 'multiline'
  | 'search';
export interface FormInputProps extends Omit<TextInputProps, 'onChangeText' | 'value' | 'onBlur' | 'onChange'> {
  name: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  type?: FormInputType;
  required?: boolean;
  disabled?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  onBlur?: (e: BlurEvent) => void;
  showCharCount?: boolean;
}
export function FormInput({
  name,
  label,
  value,
  onChange,
  error,
  helperText,
  type = 'text',
  required = false,
  disabled = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  onBlur,
  maxLength,
  showCharCount = false,
  placeholder,
  ...rest
}: FormInputProps) {
  const { colors: palette } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const keyboardType = (() => {
    switch (type) {
      case 'email':
        return 'email-address';
      case 'phone':
        return 'phone-pad';
      case 'number':
        return 'numeric';
      default:
        return 'default';
    }
  })();
  const isSecure = type === 'password' && !isPasswordVisible;
  const multilineProps = type === 'multiline' ? { multiline: true, numberOfLines: 4 } : {};
  const handleFocus = () => setIsFocused(true);
  const handleBlur = (e: BlurEvent) => {
    setIsFocused(false);
    onBlur?.(e);
  };
  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };
  const borderColor = error
    ? palette.error
    : isFocused
      ? palette.tint
      : palette.border;
  return (
    <View style={styles.container}>
      {label && (
        <Row style={styles.labelRow}>
          <ThemedText style={[styles.label, { color: palette.text }]}>
            {label}
            {required && <ThemedText style={{ color: palette.error }}> *</ThemedText>}
          </ThemedText>
        </Row>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            borderColor,
            backgroundColor: disabled ? palette.surfaceSecondary : palette.surface,
            borderWidth: Borders.width.thin,
          },
          type === 'multiline' ? styles.multilineContainer : undefined,
        ]}
      >
        {leftIcon && (
          <IconSymbol
            name={leftIcon as React.ComponentProps<typeof IconSymbol>['name']}
            size={20}
            color={palette.muted}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              color: disabled ? palette.muted : palette.text,
            },
            type === 'multiline' ? styles.multilineInput : undefined,
            leftIcon ? styles.inputWithLeftIcon : null,
            (rightIcon || type === 'password') ? styles.inputWithRightIcon : null,
          ]}
          value={value}
          onChangeText={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={palette.muted}
          editable={!disabled}
          keyboardType={keyboardType}
          secureTextEntry={isSecure}
          autoCapitalize={type === 'email' ? 'none' : 'sentences'}
          autoCorrect={type !== 'email' && type !== 'password'}
          maxLength={maxLength}
          {...multilineProps}
          {...rest}
        />
        {type === 'password' && (
          <Pressable
            onPress={togglePasswordVisibility}
            style={styles.rightIconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <IconSymbol
              name={isPasswordVisible ? 'eye.slash' : 'eye'}
              size={20}
              color={palette.muted}
            />
          </Pressable>
        )}
        {rightIcon && type !== 'password' && (
          <Pressable
            onPress={onRightIconPress}
            style={styles.rightIconButton}
            disabled={!onRightIconPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <IconSymbol name={rightIcon as React.ComponentProps<typeof IconSymbol>['name']} size={20} color={palette.muted} />
          </Pressable>
        )}
      </View>
      <Row style={styles.bottomRow}>
        {error ? (
          <ThemedText style={[styles.errorText, { color: palette.error }]}>
            {error}
          </ThemedText>
        ) : helperText ? (
          <ThemedText style={[styles.helperText, { color: palette.muted }]}>
            {helperText}
          </ThemedText>
        ) : (
          <View />
        )}
        {showCharCount && maxLength && (
          <ThemedText style={[styles.charCount, { color: palette.muted }]}>
            {value.length}/{maxLength}
          </ThemedText>
        )}
      </Row>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  labelRow: {
    marginBottom: Spacing.xs,
  },
  label: {
    ...Typography.bodySemiBold,
  },
  inputContainer: {
    alignItems: 'center',
    borderRadius: Radii.md,
    minHeight: Components.input.height,
  },
  multilineContainer: {
    minHeight: 100,
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  input: {
    flex: 1,
    ...Typography.body,
    paddingHorizontal: Components.input.paddingHorizontal,
    paddingVertical: Spacing.xs,
  },
  multilineInput: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  inputWithLeftIcon: {
    paddingLeft: Spacing.xs,
  },
  inputWithRightIcon: {
    paddingRight: Spacing.xs,
  },
  leftIcon: {
    marginLeft: Spacing.sm,
  },
  rightIconButton: {
    padding: Spacing.xs,
    marginRight: Spacing.xs,
  },
  bottomRow: {
    justifyContent: 'space-between',
    marginTop: Spacing.xs / 2,
    minHeight: 18,
  },
  errorText: {
    ...Typography.small,
  },
  helperText: {
    ...Typography.small,
  },
  charCount: {
    ...Typography.caption,
  },
});
export default FormInput;
