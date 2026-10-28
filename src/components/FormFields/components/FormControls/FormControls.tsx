import type React from "react";
import { Input, Textarea } from "@/components/ui";
import type { ControlField, FormValues } from "../../schema";

interface ITextControl {
  field: Omit<ControlField<FormValues>, "visible">;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

const TextControl: React.FC<ITextControl> = ({
  field,
  value,
  disabled,
  onChange,
}) => {
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
};

interface ITextareaControl {
  field: Omit<ControlField<FormValues>, "visible">;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

const TextareaControl: React.FC<ITextareaControl> = ({
  field,
  value,
  disabled,
  onChange,
}) => {
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
};

export const InputRegistry = {
  input: TextControl,
  textarea: TextareaControl,
} as const;
