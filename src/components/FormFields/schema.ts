import type { InputHTMLAttributes } from 'react';

export type FormValues = Record<string, string>;
export type ControlField<V extends FormValues> = {
  kind: 'input' | 'textarea';
  name: keyof V & string;
  id: string;
  label: string;
  hint?: string;
  dense?: boolean;
  rows?: number;
  inputClassName?: string;
  className?: string;
  visible?: (values: V) => boolean;
} & Pick<
  InputHTMLAttributes<HTMLInputElement>,
  | 'type'
  | 'required'
  | 'minLength'
  | 'maxLength'
  | 'min'
  | 'max'
  | 'step'
  | 'inputMode'
  | 'autoComplete'
  | 'placeholder'
>;

export type FormField<V extends FormValues> =
  | ControlField<V>
  | {
      kind: 'group';
      name: string;
      className: string;
      legend?: string;
      fields: readonly FormField<V>[];
    }
  | {
      kind: 'custom';
      name: string;
    };

/** Uses the same rules as the controls; modules own when validation runs. */
export function validateFields<V extends FormValues>(
  fields: readonly FormField<V>[],
  values: V,
): Partial<Record<keyof V, string>> {
  const errors: Partial<Record<keyof V, string>> = {};
  for (const field of fields) {
    if (field.kind === 'group') {
      Object.assign(errors, validateFields(field.fields, values));
      continue;
    }
    if (field.kind === 'custom' || field.visible?.(values) === false) continue;
    const value = values[field.name];
    if (field.required && !value.trim()) errors[field.name] = `${field.label} is required.`;
    else if (value && field.minLength !== undefined && value.length < field.minLength)
      errors[field.name] = `${field.label} is too short.`;
    else if (field.maxLength !== undefined && value.length > field.maxLength)
      errors[field.name] = `${field.label} is too long.`;
    else if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      errors[field.name] = 'Enter a valid email.';
    else if (
      field.type === 'number' &&
      value &&
      (!Number.isFinite(Number(value)) ||
        (field.min !== undefined && Number(value) < Number(field.min)) ||
        (field.max !== undefined && Number(value) > Number(field.max)))
    )
      errors[field.name] = `${field.label} is outside the allowed range.`;
  }
  return errors;
}
