import type React from "react";
import { IconProductLink } from "@/components/icons";
import type { RecipeUsageContext } from "@/features/recipes/measurementUnits";
import {
  packageUnits,
  useManualProductForm,
  type ProductDetails,
} from "./ManualProductForm.module";

export type { ProductDetails };

const fieldClass =
  "h-11 min-w-0 rounded-lg border border-[#E6DFD8] bg-transparent px-3.5 text-base text-[#141413] outline-none focus:border-[#CC785C]";
const labelClass =
  "flex min-w-0 flex-col gap-1.5 text-xs font-medium tracking-[0.12em] text-[#6C6A64]";

interface IManualProductForm {
  onSave: (details: ProductDetails) => void;
  busy: boolean;
  error?: string | null;
  currency: string;
  ingredient?: { rawMaterialName: string } & RecipeUsageContext;
}

export const ManualProductForm: React.FC<IManualProductForm> = ({
  onSave,
  busy,
  error,
  currency,
  ingredient,
}) => {
  const form = useManualProductForm({ onSave, busy, currency, ingredient });
  return (
    <form
      onSubmit={form.submit}
      className="flex w-full max-w-[390px] flex-1 flex-col"
    >
      <fieldset
        disabled={busy}
        className="flex min-w-0 flex-1 flex-col gap-[22px] px-4 pt-1"
      >
        {ingredient ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-[#EFE9DE] px-3.5 py-2.5">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#F5F0E8] text-[#A9583E]"
            >
              <IconProductLink />
            </span>
            <div>
              <p className="text-xs font-medium tracking-[0.12em] text-[#6C6A64]">
                LINKING TO INGREDIENT
              </p>
              <p className="text-[15px] font-medium leading-5">
                {ingredient.rawMaterialName} · {ingredient.quantity}{" "}
                {ingredient.rawSrcUnit} in this recipe
              </p>
            </div>
          </div>
        ) : null}
        <label className={labelClass}>
          PRODUCT NAME
          <input
            autoFocus
            aria-label="Product name"
            required
            maxLength={160}
            value={form.name}
            onChange={(event) => form.setName(event.target.value)}
            placeholder="e.g. Président unsalted butter"
            className={fieldClass}
          />
        </label>
        <ManualPriceRow form={form} />
        <p className="-mt-3 text-[13px] leading-[18px] text-[#6C6A64]">
          What one pack contains, e.g. 250 g or 12 pcs.
        </p>
        <ManualUsage form={form} />
        {form.validation || error ? (
          <p role="alert" className="text-sm text-[#A9583E]">
            {form.validation ?? error}
          </p>
        ) : null}
      </fieldset>
      <footer className="mt-6 border-t border-[#E6DFD8] px-4 pb-[max(var(--safe-bottom)+28px,28px)] pt-3">
        <button
          type="submit"
          disabled={busy}
          className="h-12 w-full rounded-lg bg-[#CC785C] text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save & link"}
        </button>
      </footer>
    </form>
  );
};

interface IManualPriceRow {
  form: ReturnType<typeof useManualProductForm>;
}

const ManualPriceRow: React.FC<IManualPriceRow> = ({ form }) => {
  return (
    <div className="flex gap-3">
      <label className={`${labelClass} flex-1`}>
        PRICE
        <div className="flex h-11 items-center gap-1.5 rounded-lg border border-[#E6DFD8] px-3.5 focus-within:border-[#CC785C]">
          <span className="shrink-0 text-sm tracking-normal">
            {form.currencySymbol}
          </span>
          <input
            aria-label="Price"
            required
            type="number"
            inputMode="decimal"
            min="0"
            max="99999999.99"
            step="0.01"
            value={form.price}
            onChange={(event) => form.setPrice(event.target.value)}
            placeholder="4.50"
            className="h-full w-0 min-w-0 flex-1 bg-transparent text-base tracking-normal text-[#141413] outline-none"
          />
        </div>
      </label>
      <div className={`${labelClass} relative flex-1`}>
        <label htmlFor="manual-package-size">PACKAGE SIZE</label>
        <div className="flex h-11 items-center rounded-lg border border-[#E6DFD8] pr-1 focus-within:border-[#CC785C]">
          <input
            id="manual-package-size"
            aria-label="Package size"
            required
            type="number"
            inputMode="decimal"
            min="0.001"
            max="999999999.999"
            step="0.001"
            value={form.size}
            onChange={(event) => form.setSize(event.target.value)}
            placeholder="250"
            className="h-full w-0 min-w-0 flex-1 bg-transparent pl-3.5 text-base tracking-normal text-[#141413] outline-none"
          />
          <button
            type="button"
            aria-label="Package unit"
            aria-expanded={form.open}
            aria-controls="manual-package-units"
            onClick={() => form.setOpen(!form.open)}
            className={`flex h-[34px] shrink-0 items-center gap-2 rounded-md border bg-[#F5F0E8] pl-3 pr-2.5 text-[15px] font-medium tracking-normal text-[#141413] ${form.open ? "border-[#CC785C]" : "border-[#E6DFD8]"}`}
          >
            {form.unit}
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              className={`shrink-0 ${form.open ? "rotate-180" : ""}`}
            >
              <path
                d="m6 9 6 6 6-6"
                fill="none"
                stroke="#6C6A64"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        {form.open ? (
          <div
            id="manual-package-units"
            role="group"
            aria-label="Package units"
            className="absolute right-0 top-[72px] z-10 w-[172px] rounded-[10px] border border-[#E6DFD8] bg-[#FAF9F5] p-[5px] shadow-lg"
          >
            {packageUnits.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={form.unit === value}
                onClick={() => form.changePackageUnit(value)}
                className={`flex h-11 w-full items-center gap-2.5 rounded-md px-2.5 text-left tracking-normal ${form.unit === value ? "bg-[#EFE9DE] text-[#A9583E]" : "text-[#141413]"}`}
              >
                <span className="w-[30px] shrink-0 text-[15px]">{value}</span>
                <span className="flex-1 text-sm">{label}</span>
                {form.unit === value ? <span aria-hidden="true">✓</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

interface IManualUsage {
  form: ReturnType<typeof useManualProductForm>;
}

const ManualUsage: React.FC<IManualUsage> = ({ form }) => {
  return (
    <div className={labelClass}>
      <label htmlFor="manual-recipe-amount">AMOUNT USED IN THIS RECIPE</label>
      <div className="flex gap-3">
        <input
          id="manual-recipe-amount"
          aria-label="Amount used in this recipe"
          aria-describedby="manual-recipe-amount-help"
          required
          type="number"
          inputMode="decimal"
          min="0"
          max="999999999.999"
          step="any"
          value={form.usageAmount}
          onChange={(event) => form.setUsageAmount(event.target.value)}
          placeholder="Enter recipe amount"
          className={`${fieldClass} flex-1`}
        />
        <select
          aria-label="Recipe amount unit"
          value={form.usageUnit}
          onChange={(event) => form.changeUsageUnit(event.target.value)}
          className={`${fieldClass} w-[132px] shrink-0 tracking-normal`}
        >
          {form.usageUnits.map(({ unit, label }) => (
            <option key={unit} value={unit}>
              {unit} · {label}
            </option>
          ))}
        </select>
      </div>
      <p
        id="manual-recipe-amount-help"
        className="text-[13px] font-normal leading-[18px] tracking-normal"
      >
        How much this recipe uses, separate from the package size.
      </p>
    </div>
  );
};
