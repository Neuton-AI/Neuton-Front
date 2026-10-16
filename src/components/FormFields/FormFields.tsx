import { Field, Input, Textarea } from '@/components/ui';
import { Fragment, type ReactNode } from 'react';
import type { ControlField, FormField, FormValues } from './schema';

type ControlProps = {
  field: Omit<ControlField<FormValues>, 'visible'>;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

function TextControl({ field, value, disabled, onChange }: ControlProps) {
  const {
    id,
    type,
    required,
    minLength,
    maxLength,
    min,
    max,
    step,
    inputMode,
    autoComplete,
    placeholder,
    dense,
    inputClassName,
  } = field;
  return (
    <Input
      {...{
        id,
        type,
        required,
        minLength,
        maxLength,
        min,
        max,
        step,
        inputMode,
        autoComplete,
        placeholder,
        dense,
      }}
      value={value}
      disabled={disabled}
      className={inputClassName}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function TextareaControl({ field, value, disabled, onChange }: ControlProps) {
  return (
    <Textarea
      id={field.id}
      rows={field.rows}
      required={field.required}
      maxLength={field.maxLength}
      autoComplete={field.autoComplete}
      placeholder={field.placeholder}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export const InputRegistry = { input: TextControl, textarea: TextareaControl } as const;

type Props<V extends FormValues> = {
  fields: readonly FormField<V>[];
  values: V;
  onChange: (name: keyof V & string, value: string) => void;
  disabled?: boolean;
  customFields?: Record<string, ReactNode>;
};

export function FormFields<V extends FormValues>({
  fields,
  values,
  onChange,
  disabled = false,
  customFields = {},
}: Props<V>) {
  return (
    <>
      {fields.map((field) => {
        if (field.kind === 'custom')
          return <Fragment key={field.name}>{customFields[field.name]}</Fragment>;
        if (field.kind === 'group') {
          const content = (
            <FormFields
              fields={field.fields}
              values={values}
              onChange={onChange}
              disabled={disabled}
              customFields={customFields}
            />
          );
          return field.legend ? (
            <fieldset key={field.name} className={field.className}>
              <legend className="eyebrow">{field.legend}</legend>
              {content}
            </fieldset>
          ) : (
            <div key={field.name} className={field.className}>
              {content}
            </div>
          );
        }
        if (field.visible?.(values) === false) return null;
        const Control = InputRegistry[field.kind];
        return (
          <Field
            key={field.name}
            label={field.label}
            htmlFor={field.id}
            hint={field.hint}
            className={field.className}
          >
            <Control
              field={field}
              value={values[field.name]}
              disabled={disabled}
              onChange={(value) => onChange(field.name, value)}
            />
          </Field>
        );
      })}
    </>
  );
}
