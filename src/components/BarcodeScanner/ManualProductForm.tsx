import { useState, type FormEvent } from 'react';
import { IconProductLink } from '@/components/icons';
import type { ManualProductInput } from '@/features/recipes/types';

export type ProductDetails = Pick<
  ManualProductInput,
  'name' | 'price' | 'packageSize' | 'packageUnit'
>;
const units = [
  ['g', 'Grams'],
  ['kg', 'Kilograms'],
  ['ml', 'Milliliters'],
  ['l', 'Liters'],
  ['pcs', 'Pieces'],
] as const;
const fieldClass =
  'h-11 w-full min-w-0 rounded-lg border border-[#E6DFD8] bg-transparent px-3.5 text-base text-[#141413] outline-none focus:border-[#CC785C]';
const labelClass =
  'flex min-w-0 flex-col gap-1.5 text-xs font-medium tracking-[0.12em] text-[#6C6A64]';

export function ManualProductForm({
  onSave,
  busy,
  error,
  currency,
  ingredient,
}: {
  onSave: (details: ProductDetails) => void;
  busy: boolean;
  error?: string | null;
  currency: string;
  ingredient?: {
    rawMaterialName: string;
    quantity: string;
    rawSrcUnit: string;
  };
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('');
  const [unit, setUnit] = useState<ProductDetails['packageUnit']>('g');
  const [open, setOpen] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);
  const currencySymbol =
    new Intl.NumberFormat('en', { style: 'currency', currency })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value ?? currency;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
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
      setValidation('Enter a product name, valid price and positive package size.');
      return;
    }
    setValidation(null);
    setOpen(false);
    onSave({
      name: name.trim(),
      price: Number(price),
      packageSize: Number(size),
      packageUnit: unit,
    });
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-[390px] flex-1 flex-col">
      <fieldset disabled={busy} className="flex min-w-0 flex-1 flex-col gap-[22px] px-4 pt-1">
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
                {ingredient.rawMaterialName} · {ingredient.quantity} {ingredient.rawSrcUnit} in this
                recipe
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
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Président unsalted butter"
            className={fieldClass}
          />
        </label>
        <div className="flex gap-3">
          <label className={`${labelClass} flex-1`}>
            PRICE
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-sm tracking-normal">
                {currencySymbol}
              </span>
              <input
                aria-label="Price"
                required
                type="number"
                inputMode="decimal"
                min="0"
                max="99999999.99"
                step="0.01"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="4.50"
                className={`${fieldClass} pl-10 tracking-normal`}
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
                value={size}
                onChange={(event) => setSize(event.target.value)}
                placeholder="250"
                className="h-full w-0 min-w-0 flex-1 bg-transparent pl-3.5 text-base tracking-normal text-[#141413] outline-none"
              />
              <button
                type="button"
                aria-label="Package unit"
                aria-expanded={open}
                aria-controls="manual-package-units"
                onClick={() => setOpen(!open)}
                className="flex h-[34px] shrink-0 items-center gap-2 rounded-md border border-[#E6DFD8] bg-[#F5F0E8] px-2.5 text-[15px] tracking-normal text-[#141413]"
              >
                {unit}
                <span aria-hidden="true">⌄</span>
              </button>
            </div>
            {open ? (
              <div
                id="manual-package-units"
                role="group"
                aria-label="Package units"
                className="absolute right-0 top-[72px] z-10 w-[172px] rounded-[10px] border border-[#E6DFD8] bg-[#FAF9F5] p-[5px] shadow-lg"
              >
                {units.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={unit === value}
                    onClick={() => {
                      setUnit(value);
                      setOpen(false);
                    }}
                    className={`flex h-11 w-full items-center gap-2.5 rounded-md px-2.5 text-left tracking-normal ${unit === value ? 'bg-[#EFE9DE] text-[#A9583E]' : 'text-[#141413]'}`}
                  >
                    <span className="w-[30px] shrink-0 text-[15px]">{value}</span>
                    <span className="flex-1 text-sm">{label}</span>
                    {unit === value ? <span aria-hidden="true">✓</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <p className="-mt-3 text-[13px] leading-[18px] text-[#6C6A64]">
          What one pack contains, e.g. 250 g or 12 pcs.
        </p>
        {validation || error ? (
          <p role="alert" className="text-sm text-[#A9583E]">
            {validation ?? error}
          </p>
        ) : null}
      </fieldset>
      <footer className="mt-6 border-t border-[#E6DFD8] px-4 pb-[max(var(--safe-bottom)+28px,28px)] pt-3">
        <button
          type="submit"
          disabled={busy}
          className="h-12 w-full rounded-lg bg-[#CC785C] text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save & link'}
        </button>
      </footer>
    </form>
  );
}
