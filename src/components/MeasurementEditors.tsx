import { useState, type FormEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch, type ReceiptItem, type ReceiptDetail, type RecipeIngredient, type InventoryItem, type Recipe } from '../lib/api';
import { useInventory } from '../lib/queries';
import { Button } from './ui';
import { InlineNotice } from './feedback';

type SessionProps = { token: string | null; shopId: string | null; onSaved: () => unknown };
function useMeasurementSave({ token, shopId, onSaved }: SessionProps) {
  const client = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (path: string, body: unknown, method: 'PATCH' | 'POST' = 'PATCH') => {
    setBusy(true); setError(null);
    try {
      await apiFetch(path, { token, shopId, method, body });
      await client.invalidateQueries();
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save measurements'); }
    finally { setBusy(false); }
  };
  return { save, busy, error };
}
const control = 'w-full rounded-input border border-hairline bg-surface-card p-2 text-body text-ink';
function Label({ title, children }: { title: string; children: ReactNode }) {
  return <label className="flex flex-col gap-1 text-label text-ink-muted">{title}{children}</label>;
}
function Amount({ title, value, onChange, required = false }: { title: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return <Label title={title}><input className={control} type="number" step="any" min="0" required={required} value={value} onChange={e => onChange(e.target.value)} /></Label>;
}

export function ReceiptMeasurementEditor({ item, receipt, ...session }: SessionProps & { item: ReceiptItem; receipt: ReceiptDetail }) {
  const action = useMeasurementSave(session);
  const [contents, setContents] = useState(item.packageQuantity ?? '');
  const [name, setName] = useState(item.rawName);
  const [unit, setUnit] = useState(item.packageUnit ?? 'g');
  const [count, setCount] = useState(item.quantity ?? '');
  const [purchaseUnit, setPurchaseUnit] = useState(item.unit ?? '');
  const [code, setCode] = useState(item.rawSku ?? '');
  const [chain, setChain] = useState(item.codeChain ?? '');
  const [price, setPrice] = useState(item.unitPrice ?? '');
  const [total, setTotal] = useState(item.totalPrice ?? '');
  const [multi, setMulti] = useState(item.packagesPerPurchase ?? '1');
  const [discount, setDiscount] = useState(false);
  const [reuse, setReuse] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const correction = { id: item.id, accepted: true, rawName: name, ...(contents ? { packageQuantity: Number(contents), packageUnit: unit } : {}),
      ...(count ? { quantity: Number(count) } : {}), ...(purchaseUnit ? { unit: purchaseUnit } : {}),
      ...(code ? { rawSku: code } : {}), ...(chain ? { codeChain: chain } : {}),
      ...(price ? { unitPrice: Number(price) } : {}), ...(total ? { totalPrice: Number(total) } : {}),
      packagesPerPurchase: Number(multi), discountConfirmed: discount, saveProductMeasurement: reuse };
    if (receipt.status === 'verified') void action.save(`/receipts/${receipt.id}/resolve-measurements`, { items: [correction] }, 'POST');
    else void action.save(`/receipts/${receipt.id}/items/${item.id}/measurement`, correction);
  };
  return <details className="mt-2 w-full"><summary className="cursor-pointer text-label text-brand-primary">Resolve purchase measurements</summary>
    <form onSubmit={submit} className="mt-2 flex flex-col gap-2">
      <p className="text-label">Contents describe one inner package. A weighed purchase keeps its measured quantity. An each item can be confirmed with contents 1 each.</p>
      <Label title="Purchased product name"><input className={control} value={name} required onChange={e => setName(e.target.value)} /></Label>
      <Amount title="Purchase quantity" value={count} onChange={setCount} />
      <Label title="Purchase unit"><input className={control} value={purchaseUnit} onChange={e => setPurchaseUnit(e.target.value)} placeholder="kg, g, unit, pack…" /></Label>
      <Amount title="Contents per package" value={contents} onChange={setContents} />
      <Label title="Contents unit"><select className={control} value={unit} onChange={e => setUnit(e.target.value)}>{['g', 'kg', 'ml', 'l', 'each'].map(u => <option key={u}>{u}</option>)}</select></Label>
      <Amount title="Inner packages per purchased multipack" value={multi} onChange={setMulti} required />
      <Amount title="Receipt unit price" value={price} onChange={setPrice} />
      <Amount title="Actual paid line total" value={total} onChange={setTotal} />
      <Label title="Product code"><input className={control} value={code} onChange={e => setCode(e.target.value)} /></Label>
      <Label title="Retailer for a local code"><select className={control} value={chain} onChange={e => setChain(e.target.value)}><option value="">Global barcode</option><option>shufersal</option><option>carrefour</option></select></Label>
      <label><input type="checkbox" checked={discount} onChange={e => setDiscount(e.target.checked)} /> Confirm receipt discount explains price difference</label>
      <label><input type="checkbox" checked={reuse} onChange={e => setReuse(e.target.checked)} /> Save confirmed contents for this product in my shop</label>
      {action.error ? <InlineNotice tone="error">{action.error}</InlineNotice> : null}
      <Button type="submit" loading={action.busy}>{receipt.status === 'verified' ? 'Resolve and add pending stock' : 'Save purchase corrections'}</Button>
    </form>
  </details>;
}

export function RecipeYieldEditor({ recipe, ...session }: SessionProps & { recipe: Recipe }) {
  const action = useMeasurementSave(session);
  const [quantity, setQuantity] = useState(recipe.yieldQuantity ?? '');
  const [unit, setUnit] = useState(recipe.yieldUnit);
  return <details className="mt-2"><summary className="cursor-pointer text-label text-brand-primary">Confirm batch yield</summary>
    <form className="mt-2 flex flex-col gap-2" onSubmit={e => { e.preventDefault(); void action.save(`/recipes/${recipe.id}`, { yieldQuantity: Number(quantity), yieldUnit: unit }); }}>
      <Amount title="Portions per batch" value={quantity} onChange={setQuantity} required />
      <Label title="Portion unit"><input className={control} value={unit} required onChange={e => setUnit(e.target.value)} /></Label>
      {action.error ? <InlineNotice tone="error">{action.error}</InlineNotice> : null}
      <Button type="submit" loading={action.busy}>Save batch yield</Button>
    </form>
  </details>;
}

export function RecipeMeasurementEditor({ ingredient, recipeId, ...session }: SessionProps & { ingredient: RecipeIngredient; recipeId: string }) {
  const action = useMeasurementSave(session);
  const inventory = useInventory(session.token, session.shopId);
  const [quantity, setQuantity] = useState(ingredient.quantity == null ? '' : String(ingredient.quantity));
  const [unit, setUnit] = useState(ingredient.unit ?? '');
  const [convention, setConvention] = useState(ingredient.convention ?? '');
  const [alternative, setAlternative] = useState(ingredient.selectedAlternative ?? '');
  const [itemId, setItemId] = useState(ingredient.inventoryItemId ?? '');
  const [factor, setFactor] = useState('');
  const [from, setFrom] = useState('ml');
  const [to, setTo] = useState('g');
  const [scope, setScope] = useState('recipe');
  const [packageContents, setPackageContents] = useState('');
  const [packageUnit, setPackageUnit] = useState('g');
  const [saveProduct, setSaveProduct] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void action.save(`/recipes/${recipeId}/ingredients/${ingredient.id}/measurement`, {
      quantity: Number(quantity), unit, convention: convention || null,
      ...(alternative ? { selectedAlternative: alternative } : {}), ...(itemId ? { inventoryItemId: itemId } : {}),
      ...(factor ? { profile: { from, to, factor: Number(factor) }, scope } : {}),
      ...(packageContents ? { packageContents: { quantity: Number(packageContents), unit: packageUnit }, saveProductMeasurement: saveProduct } : {}),
    });
  };
  return <details className="mt-2"><summary className="cursor-pointer text-brand-primary">Resolve ingredient</summary>
    <form onSubmit={submit} className="mt-2 flex flex-col gap-2">
      <Amount title="Recipe quantity" value={quantity} onChange={setQuantity} required />
      <Label title="Recipe unit"><input className={control} value={unit} required onChange={e => setUnit(e.target.value)} /></Label>
      <Label title="Spoon / cup convention"><select className={control} value={convention} onChange={e => setConvention(e.target.value)}><option value="">Unknown</option><option value="us">US customary</option><option value="metric">Metric (250 ml cup)</option><option value="imperial">Imperial</option></select></Label>
      {ingredient.alternatives?.length ? <Label title="Choose ingredient alternative"><select className={control} value={alternative} onChange={e => setAlternative(e.target.value)}><option value="">Choose an alternative</option>{ingredient.alternatives.map(a => <option key={a}>{a}</option>)}</select></Label> : null}
      <Label title="Link to my inventory product"><select className={control} value={itemId} onChange={e => setItemId(e.target.value)}><option value="">Keep current link</option>{inventory.data?.items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</select></Label>
      {ingredient.generalPriceId && !itemId ? <>
        <Amount title="Confirmed total contents of catalog package" value={packageContents} onChange={setPackageContents} />
        <Label title="Catalog contents unit"><select className={control} value={packageUnit} onChange={e => setPackageUnit(e.target.value)}>{['g', 'kg', 'ml', 'l', 'each'].map(u => <option key={u}>{u}</option>)}</select></Label>
        <label><input type="checkbox" checked={saveProduct} onChange={e => setSaveProduct(e.target.checked)} /> Save contents for this product in my shop</label>
      </> : null}
      <p>Optional confirmed conversion: how many target units equal one source unit.</p>
      <div className="flex gap-2"><Label title="From"><select className={control} value={from} onChange={e => setFrom(e.target.value)}>{['ml', 'g', 'each'].map(u => <option key={u}>{u}</option>)}</select></Label><Label title="To"><select className={control} value={to} onChange={e => setTo(e.target.value)}>{['g', 'ml', 'each'].map(u => <option key={u}>{u}</option>)}</select></Label></div>
      <Amount title="Confirmed conversion factor" value={factor} onChange={setFactor} />
      <Label title="Save conversion for"><select className={control} value={scope} onChange={e => setScope(e.target.value)}><option value="recipe">This recipe line</option><option value="ingredient">This ingredient in my shop</option><option value="product">This inventory product</option></select></Label>
      {action.error ? <InlineNotice tone="error">{action.error}</InlineNotice> : null}
      <Button type="submit" loading={action.busy}>Save ingredient measurements</Button>
    </form>
  </details>;
}

export function InventoryReconciliationEditor({ item, ...session }: SessionProps & { item: InventoryItem }) {
  const action = useMeasurementSave(session);
  const [quantity, setQuantity] = useState('');
  const [cost, setCost] = useState('');
  const [unit, setUnit] = useState('g');
  return <details><summary className="cursor-pointer text-label text-brand-primary">Reconcile opening balance</summary>
    <form className="flex flex-col gap-2" onSubmit={e => { e.preventDefault(); void action.save(`/inventory/${item.id}`, { reconcileMeasurement: true, unit, currentQuantity: Number(quantity), averageUnitCost: Number(cost) }); }}>
      <p className="text-label">Confirm the quantity on hand and historical average price in the same unit. This replaces the opening balance.</p>
      <Amount title="Confirmed quantity on hand" value={quantity} onChange={setQuantity} required />
      <Label title="Balance unit"><select className={control} value={unit} onChange={e => setUnit(e.target.value)}>{['g', 'kg', 'ml', 'l', 'each'].map(u => <option key={u}>{u}</option>)}</select></Label>
      <Amount title="Average cost per balance unit" value={cost} onChange={setCost} required />
      {action.error ? <InlineNotice tone="error">{action.error}</InlineNotice> : null}
      <Button type="submit" loading={action.busy}>Confirm opening balance</Button>
    </form>
  </details>;
}
