import { useState, type FormEvent } from "react";
import type { ManualProductInput } from "@/features/recipes/types";
import {
  measurementUnits,
  packageBaseUnit,
  type RecipeUsageContext,
} from "@/features/recipes/measurementUnits";

export type ProductDetails = Pick<
  ManualProductInput,
  "name" | "price" | "packageSize" | "packageUnit" | "quantity" | "rawSrcUnit"
>;

export const packageUnits = [
  ["g", "Grams"],
  ["kg", "Kilograms"],
  ["ml", "Milliliters"],
  ["l", "Liters"],
  ["pcs", "Pieces"],
] as const;

export function useManualProductForm({
  onSave,
  busy,
  currency,
}: {
  onSave: (details: ProductDetails) => void;
  busy: boolean;
  currency: string;
  ingredient?: { rawMaterialName: string } & RecipeUsageContext;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [size, setSize] = useState("");
  const [unit, setUnit] = useState<ProductDetails["packageUnit"]>("g");
  const [usageAmount, setUsageAmount] = useState("");
  const [usageUnit, setUsageUnit] = useState("g");
  const usageUnits = measurementUnits[packageBaseUnit(unit)];
  const [open, setOpen] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);
  const currencySymbol =
    new Intl.NumberFormat("en", { style: "currency", currency })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currency;

  function changePackageUnit(next: ProductDetails["packageUnit"]) {
    if (packageBaseUnit(unit) !== packageBaseUnit(next)) {
      setUsageAmount("");
      setUsageUnit(packageBaseUnit(next));
    }
    setUnit(next);
    setOpen(false);
  }

  function changeUsageUnit(next: string) {
    const from = usageUnits.find((entry) => entry.unit === usageUnit)!;
    const to = usageUnits.find((entry) => entry.unit === next)!;
    if (usageAmount.trim() && Number.isFinite(Number(usageAmount))) {
      setUsageAmount(
        String(
          Number(
            ((Number(usageAmount) * from.ratio) / to.ratio).toPrecision(12),
          ),
        ),
      );
    }
    setUsageUnit(next);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (
      !usageAmount.trim() ||
      !Number.isFinite(Number(usageAmount)) ||
      Number(usageAmount) <= 0 ||
      Number(usageAmount) > 999999999.999 ||
      !usageUnits.some((entry) => entry.unit === usageUnit)
    ) {
      setValidation("Enter a positive amount used in this recipe.");
      return;
    }
    if (
      !name.trim() ||
      !price.trim() ||
      !size.trim() ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0 ||
      Number(price) > 99999999.99 ||
      !Number.isFinite(Number(size)) ||
      Number(size) < 0.001 ||
      Number(size) > 999999999.999
    ) {
      setValidation(
        "Enter a product name, valid price and positive package size.",
      );
      return;
    }
    setValidation(null);
    setOpen(false);
    onSave({
      name: name.trim(),
      price: Number(price),
      packageSize: Number(size),
      packageUnit: unit,
      quantity: Number(usageAmount),
      rawSrcUnit: usageUnit,
    });
  }

  return {
    name,
    setName,
    price,
    setPrice,
    size,
    setSize,
    unit,
    usageAmount,
    setUsageAmount,
    usageUnit,
    usageUnits,
    open,
    setOpen,
    validation,
    currencySymbol,
    changePackageUnit,
    changeUsageUnit,
    submit,
  };
}
