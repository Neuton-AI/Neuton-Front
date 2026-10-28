import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FormFields, InputRegistry } from "../FormFields";
import { validateFields, type FormField } from "../schema";

const fields: readonly FormField<{
  name: string;
  notes: string;
  amount: string;
}>[] = [
  {
    kind: "input",
    name: "name",
    id: "name",
    label: "Name",
    required: true,
    minLength: 2,
    maxLength: 5,
  },
  {
    kind: "textarea",
    name: "notes",
    id: "notes",
    label: "Notes",
    visible: (values) => values.name === "show",
  },
  {
    kind: "group",
    name: "numbers",
    className: "grid",
    fields: [
      {
        kind: "input",
        type: "number",
        name: "amount",
        id: "amount",
        label: "Amount",
        min: 0,
        max: 10,
      },
    ],
  },
  { kind: "custom", name: "items" },
];
describe("form engine", () => {
  it("resolves registered controls, conditional fields, and custom fields", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <FormFields
        fields={fields}
        values={{ name: "", notes: "", amount: "1" }}
        onChange={onChange}
        customFields={{ items: <button>Add item</button> }}
      />,
    );
    expect(Object.keys(InputRegistry)).toEqual(["input", "textarea"]);
    expect(screen.queryByRole("textbox", { name: "Notes" })).toBeNull();
    expect(
      screen.getByRole("spinbutton", { name: "Amount" }),
    ).toBeInTheDocument();
    await userEvent
      .setup()
      .type(screen.getByRole("textbox", { name: "Name" }), "a");
    expect(onChange).toHaveBeenCalledWith("name", "a");
    expect(
      screen.getByRole("button", { name: "Add item" }),
    ).toBeInTheDocument();
    rerender(
      <FormFields
        fields={fields}
        values={{ name: "show", notes: "", amount: "1" }}
        onChange={onChange}
        disabled
      />,
    );
    expect(screen.getByRole("textbox", { name: "Notes" })).toBeDisabled();
  });

  it.each([
    ["", "1", "Name is required."],
    ["a", "1", "Name is too short."],
    ["abcdef", "1", "Name is too long."],
    ["valid", "-1", "Amount is outside the allowed range."],
    ["valid", "11", "Amount is outside the allowed range."],
    ["valid", "bad", "Amount is outside the allowed range."],
  ])("validates name %s and amount %s", (name, amount, message) => {
    expect(
      Object.values(validateFields(fields, { name, notes: "", amount })),
    ).toContain(message);
  });
  it("accepts valid values and ignores hidden required controls", () => {
    expect(
      validateFields(fields, { name: "valid", notes: "", amount: "1" }),
    ).toEqual({});
  });
});
