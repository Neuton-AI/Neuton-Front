import type { FormField } from "@/components/FormFields/schema";
import { validateFields } from "@/components/FormFields/schema";
import { useState } from "react";

export function useCreateShopForm({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState("");

  const formValues = { name };
  const fields: readonly FormField<typeof formValues>[] = [
    {
      kind: "input",
      name: "name",
      id: "new-shop",
      label: "Shop name",
      dense: true,
      placeholder: "Sunday Bakes",
      minLength: 2,
      maxLength: 120,
      required: true,
    },
  ];
  const handleFieldChange = (_name: keyof typeof formValues, value: string) =>
    setName(value);
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || Object.keys(validateFields(fields, formValues)).length) return;
    onSubmit(name.trim());
  };
  return { handleSubmit, fields, formValues, handleFieldChange, name };
}
export type CreateShopFormModel = ReturnType<typeof useCreateShopForm>;
