/**
 * Validation library for form inputs.
 * Composable validators for consistent validation across all forms.
 */

export type Validator = (value: string) => string | undefined;

export type FieldValidators<T> = {
  [K in keyof T]?: Validator | Validator[];
};

/**
 * Core validators - return error message or undefined if valid.
 */
export const validators = {
  /**
   * Requires a non-empty value.
   */
  required: (message?: string): Validator => (value) =>
    !value?.trim() ? (message || 'This field is required') : undefined,

  /**
   * Validates email format.
   */
  email: (message?: string): Validator => (value) => {
    if (!value) return undefined; // Let required handle empty
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !emailRegex.test(value) ? (message || 'Please enter a valid email address') : undefined;
  },

  /**
   * Validates minimum length.
   */
  minLength: (min: number, message?: string): Validator => (value) => {
    if (!value) return undefined;
    return value.length < min
      ? (message || `Must be at least ${min} characters`)
      : undefined;
  },

  /**
   * Validates maximum length.
   */
  maxLength: (max: number, message?: string): Validator => (value) => {
    if (!value) return undefined;
    return value.length > max
      ? (message || `Must be no more than ${max} characters`)
      : undefined;
  },

  /**
   * Validates exact length.
   */
  length: (len: number, message?: string): Validator => (value) => {
    if (!value) return undefined;
    return value.length !== len
      ? (message || `Must be exactly ${len} characters`)
      : undefined;
  },

  /**
   * Validates phone number format.
   */
  phone: (message?: string): Validator => (value) => {
    if (!value) return undefined;
    // Flexible phone regex - allows various formats
    const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
    return !phoneRegex.test(value.replace(/\s/g, ''))
      ? (message || 'Please enter a valid phone number')
      : undefined;
  },

  /**
   * Validates URL format.
   */
  url: (message?: string): Validator => (value) => {
    if (!value) return undefined;
    try {
      new URL(value.startsWith('http') ? value : `https://${value}`);
      return undefined;
    } catch {
      return message || 'Please enter a valid URL';
    }
  },

  /**
   * Validates against a regex pattern.
   */
  pattern: (regex: RegExp, message: string): Validator => (value) => {
    if (!value) return undefined;
    return !regex.test(value) ? message : undefined;
  },

  /**
   * Validates numeric value.
   */
  numeric: (message?: string): Validator => (value) => {
    if (!value) return undefined;
    return isNaN(Number(value)) ? (message || 'Must be a number') : undefined;
  },

  /**
   * Validates minimum numeric value.
   */
  min: (min: number, message?: string): Validator => (value) => {
    if (!value) return undefined;
    const num = Number(value);
    return isNaN(num) || num < min
      ? (message || `Must be at least ${min}`)
      : undefined;
  },

  /**
   * Validates maximum numeric value.
   */
  max: (max: number, message?: string): Validator => (value) => {
    if (!value) return undefined;
    const num = Number(value);
    return isNaN(num) || num > max
      ? (message || `Must be no more than ${max}`)
      : undefined;
  },

  /**
   * Validates password strength.
   */
  password: (message?: string): Validator => (value) => {
    if (!value) return undefined;
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return !passwordRegex.test(value)
      ? (message || 'Password must be at least 8 characters with uppercase, lowercase, and a number')
      : undefined;
  },

  /**
   * Validates that value matches another field.
   */
  matches: (fieldName: string, fieldLabel: string, getValue: () => string): Validator => (value) => {
    if (!value) return undefined;
    return value !== getValue() ? `Must match ${fieldLabel}` : undefined;
  },

  /**
   * Validates UK postcode format.
   */
  postcode: (message?: string): Validator => (value) => {
    if (!value) return undefined;
    const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
    return !postcodeRegex.test(value.trim())
      ? (message || 'Please enter a valid UK postcode')
      : undefined;
  },

  /**
   * Custom validator function.
   */
  custom: (fn: (value: string) => boolean, message: string): Validator => (value) => {
    if (!value) return undefined;
    return !fn(value) ? message : undefined;
  },
};

/**
 * Compose multiple validators into one.
 * Runs validators in order, returns first error found.
 */
export const compose = (...fns: Validator[]): Validator => (value) => {
  for (const fn of fns) {
    const error = fn(value);
    if (error) return error;
  }
  return undefined;
};

/**
 * Run a single validator or array of validators.
 */
export const runValidators = (
  value: string,
  validatorOrArray: Validator | Validator[] | undefined
): string | undefined => {
  if (!validatorOrArray) return undefined;

  if (Array.isArray(validatorOrArray)) {
    return compose(...validatorOrArray)(value);
  }

  return validatorOrArray(value);
};

/**
 * Validate all fields in a form.
 * Returns object with field names as keys and error messages as values.
 */
export const validateForm = <T extends Record<string, string>>(
  values: T,
  fieldValidators: FieldValidators<T>
): Partial<Record<keyof T, string>> => {
  const errors: Partial<Record<keyof T, string>> = {};

  for (const [field, validatorOrArray] of Object.entries(fieldValidators)) {
    const value = values[field as keyof T] || '';
    const error = runValidators(value, validatorOrArray as Validator | Validator[]);
    if (error) {
      errors[field as keyof T] = error;
    }
  }

  return errors;
};

/**
 * Check if form has any errors.
 */
export const hasErrors = <T>(errors: Partial<Record<keyof T, string>>): boolean => {
  return Object.values(errors).some((error) => error !== undefined);
};

/**
 * Common validation schemas for reuse.
 */
export const schemas = {
  email: compose(validators.required(), validators.email()),
  password: compose(validators.required(), validators.password()),
  phone: compose(validators.required(), validators.phone()),
  name: compose(validators.required(), validators.minLength(2), validators.maxLength(50)),
  postcode: compose(validators.required(), validators.postcode()),
  url: validators.url(),
  bio: validators.maxLength(500),
};
