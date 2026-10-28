import { Field } from "@/components/ui";
import { Fragment, type ReactNode } from "react";
import { InputRegistry } from "./components/FormControls/FormControls";
import type { FormField, FormValues } from "./schema";

export { InputRegistry };

interface IFormFields<V extends FormValues> {
  fields: readonly FormField<V>[];
  values: V;
  onChange: (name: keyof V & string, value: string) => void;
  disabled?: boolean;
  customFields?: Record<string, ReactNode>;
}

export const FormFields = <V extends FormValues>({
  fields,
  values,
  onChange,
  disabled = false,
  customFields = {},
}: IFormFields<V>) => {
  return (
    <>
      {fields.map((field) => {
        if (field.kind === "custom")
          return (
            <Fragment key={field.name}>{customFields[field.name]}</Fragment>
          );
        if (field.kind === "group") {
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
};
