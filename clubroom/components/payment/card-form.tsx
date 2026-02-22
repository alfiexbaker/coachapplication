/**
 * CardForm - Payment card input form using unified form system.
 *
 * Uses useForm hook for state management and validation.
 * Uses FormInput for consistent input styling.
 * Uses FormButton for consistent button styling.
 */

import { View, StyleSheet } from 'react-native';
import { Row } from '@/components/primitives/row';
import { FormInput, FormButton } from '@/components/forms';
import { useForm } from '@/hooks/use-form';
import { validators, compose } from '@/utils/validation';
import { Spacing } from '@/constants/theme';

interface CardFormValues {
  cardNumber: string;
  expiry: string;
  cvv: string;
  name: string;
  billing: string;
}

interface CardFormProps {
  onSave: (card: CardFormValues) => void;
  loading?: boolean;
}

// Card number formatter: adds spaces every 4 digits
const formatCardNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
};

// Expiry formatter: adds slash after MM
const formatExpiry = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
};

export function CardForm({ onSave, loading = false }: CardFormProps) {
  const form = useForm<CardFormValues>({
    initialValues: {
      cardNumber: '',
      expiry: '',
      cvv: '',
      name: '',
      billing: '',
    },
    validators: {
      cardNumber: compose(
        validators.required('Card number is required'),
        validators.custom(
          (v) => v.replace(/\s/g, '').length === 16,
          'Card number must be 16 digits',
        ),
      ),
      expiry: compose(
        validators.required('Expiry date is required'),
        validators.pattern(/^\d{2}\/\d{2}$/, 'Use MM/YY format'),
      ),
      cvv: compose(
        validators.required('CVV is required'),
        validators.pattern(/^\d{3,4}$/, 'CVV must be 3-4 digits'),
      ),
      name: compose(
        validators.required('Cardholder name is required'),
        validators.minLength(2, 'Name is too short'),
      ),
      billing: validators.required('Billing address is required'),
    },
    onSubmit: async (values) => {
      onSave(values);
    },
  });

  // Custom handlers with formatting
  const handleCardNumberChange = (value: string) => {
    form.setFieldValue('cardNumber', formatCardNumber(value));
  };

  const handleExpiryChange = (value: string) => {
    form.setFieldValue('expiry', formatExpiry(value));
  };

  const handleCvvChange = (value: string) => {
    form.setFieldValue('cvv', value.replace(/\D/g, '').slice(0, 4));
  };

  return (
    <View style={styles.container}>
      <FormInput
        name="cardNumber"
        label="Card number"
        placeholder="4242 4242 4242 4242"
        value={form.values.cardNumber}
        onChange={handleCardNumberChange}
        onBlur={form.handleBlur('cardNumber')}
        error={form.touched.cardNumber ? form.errors.cardNumber : undefined}
        type="number"
        maxLength={19}
      />

      <Row gap="sm">
        <View style={styles.halfWidth}>
          <FormInput
            name="expiry"
            label="Expiry"
            placeholder="MM/YY"
            value={form.values.expiry}
            onChange={handleExpiryChange}
            onBlur={form.handleBlur('expiry')}
            error={form.touched.expiry ? form.errors.expiry : undefined}
            type="number"
            maxLength={5}
          />
        </View>
        <View style={styles.halfWidth}>
          <FormInput
            name="cvv"
            label="CVV"
            placeholder="123"
            value={form.values.cvv}
            onChange={handleCvvChange}
            onBlur={form.handleBlur('cvv')}
            error={form.touched.cvv ? form.errors.cvv : undefined}
            type="number"
            maxLength={4}
          />
        </View>
      </Row>

      <FormInput label="Cardholder name" placeholder="Name on card" {...form.getFieldProps('name')} />

      <FormInput
        label="Billing address"
        placeholder="221B Baker Street"
        {...form.getFieldProps('billing')}
      />

      <FormButton
        label="Save card"
        onPress={form.handleSubmit}
        loading={loading || form.isSubmitting}
        disabled={!form.isDirty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  row: {
    // layout moved to Row
  },
  halfWidth: {
    flex: 1,
  },
});
