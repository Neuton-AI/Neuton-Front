import { Input, Textarea } from '@/components/ui';
import type { ControlField, FormValues } from './schema';

type ControlProps = {
  field: Omit<ControlField<FormValues>, 'visible'>;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

function TextControl({ field, value, disabled, onChange }: ControlProps) {
  const { id, type, required, minLength, maxLength, min, max, step, inputMode, autoComplete, placeholder, dense, inputClassName } = field;
  return (
    <Input
      {...{ id, type, required, minLength, maxLength, min, max, step, inputMode, autoComplete, placeholder, dense }}
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
