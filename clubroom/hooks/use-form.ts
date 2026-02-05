/**
 * useForm hook for standardized form state management.
 * Single source of truth for all form handling across the app.
 */

import { useState, useCallback, useMemo } from 'react';
import { validateForm, type FieldValidators, type Validator, hasErrors } from '@/utils/validation';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useForm');

export interface UseFormConfig<T extends { [K in keyof T]: string }> {
  /** Initial form values */
  initialValues: T;
  /** Field validators */
  validators?: FieldValidators<T>;
  /** Submit handler - called only if validation passes */
  onSubmit: (values: T) => Promise<void> | void;
  /** Called when validation fails */
  onValidationError?: (errors: Partial<Record<keyof T, string>>) => void;
  /** Validate on change (default: false) */
  validateOnChange?: boolean;
  /** Validate on blur (default: true) */
  validateOnBlur?: boolean;
}

export interface UseFormReturn<T extends { [K in keyof T]: string }> {
  /** Current form values */
  values: T;
  /** Current field errors */
  errors: Partial<Record<keyof T, string>>;
  /** Which fields have been touched/blurred */
  touched: Partial<Record<keyof T, boolean>>;
  /** Is form currently submitting */
  isSubmitting: boolean;
  /** Is form valid (no errors) */
  isValid: boolean;
  /** Has form been modified from initial values */
  isDirty: boolean;
  /** Handle value change for a field */
  handleChange: (field: keyof T) => (value: string) => void;
  /** Handle blur for a field */
  handleBlur: (field: keyof T) => () => void;
  /** Submit the form */
  handleSubmit: () => Promise<void>;
  /** Reset form to initial values */
  reset: () => void;
  /** Set a specific field value */
  setFieldValue: (field: keyof T, value: string) => void;
  /** Set a specific field error */
  setFieldError: (field: keyof T, error: string | undefined) => void;
  /** Clear all errors */
  clearErrors: () => void;
  /** Validate all fields */
  validateAll: () => boolean;
  /** Get props for FormInput component */
  getFieldProps: (field: keyof T) => {
    name: string;
    value: string;
    onChange: (value: string) => void;
    onBlur: () => void;
    error: string | undefined;
  };
}

export function useForm<T extends { [K in keyof T]: string }>({
  initialValues,
  validators: fieldValidators,
  onSubmit,
  onValidationError,
  validateOnChange = false,
  validateOnBlur = true,
}: UseFormConfig<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate a single field
  const validateField = useCallback(
    (field: keyof T, value: string): string | undefined => {
      if (!fieldValidators || !fieldValidators[field]) return undefined;

      const validator = fieldValidators[field];
      if (Array.isArray(validator)) {
        for (const v of validator) {
          const error = v(value);
          if (error) return error;
        }
        return undefined;
      }
      return (validator as Validator)(value);
    },
    [fieldValidators]
  );

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    if (!fieldValidators) return true;

    const allErrors = validateForm(values, fieldValidators);
    setErrors(allErrors);

    return !hasErrors(allErrors);
  }, [values, fieldValidators]);

  // Handle value change
  const handleChange = useCallback(
    (field: keyof T) => (value: string) => {
      setValues((prev) => ({ ...prev, [field]: value }));

      if (validateOnChange && fieldValidators) {
        const error = validateField(field, value);
        setErrors((prev) => ({ ...prev, [field]: error }));
      }

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [validateOnChange, validateField, fieldValidators, errors]
  );

  // Handle blur
  const handleBlur = useCallback(
    (field: keyof T) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));

      if (validateOnBlur && fieldValidators) {
        const error = validateField(field, values[field]);
        setErrors((prev) => ({ ...prev, [field]: error }));
      }
    },
    [validateOnBlur, validateField, values, fieldValidators]
  );

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    // Mark all fields as touched
    const allTouched = Object.keys(values).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {} as Record<keyof T, boolean>
    );
    setTouched(allTouched);

    // Validate all fields
    if (fieldValidators) {
      const allErrors = validateForm(values, fieldValidators);
      setErrors(allErrors);

      if (hasErrors(allErrors)) {
        logger.warn('Form validation failed', { errors: allErrors });
        onValidationError?.(allErrors);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await onSubmit(values);
    } catch (error) {
      logger.error('Form submission failed', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [values, fieldValidators, onSubmit, onValidationError]);

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Set specific field value
  const setFieldValue = useCallback((field: keyof T, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Set specific field error
  const setFieldError = useCallback((field: keyof T, error: string | undefined) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Get props for FormInput component
  const getFieldProps = useCallback(
    (field: keyof T) => ({
      name: String(field),
      value: values[field],
      onChange: handleChange(field),
      onBlur: handleBlur(field),
      error: touched[field] ? errors[field] : undefined,
    }),
    [values, errors, touched, handleChange, handleBlur]
  );

  // Computed values
  const isValid = useMemo(() => !hasErrors(errors), [errors]);

  const isDirty = useMemo(() => {
    return Object.keys(values).some(
      (key) => values[key as keyof T] !== initialValues[key as keyof T]
    );
  }, [values, initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    isDirty,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue,
    setFieldError,
    clearErrors,
    validateAll,
    getFieldProps,
  };
}

export default useForm;
