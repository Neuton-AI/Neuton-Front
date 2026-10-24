import { InlineNotice } from '@/components/feedback';
import { Button, Field, Input } from '@/components/ui';
import { useReceiptMerchantEditor, type MerchantEditorProps } from './ReceiptMerchantEditor.module';

export function ReceiptMerchantEditor(props: MerchantEditorProps) {
  const { name, setName, error, save, pending, disabled } = useReceiptMerchantEditor(props);
  return (
    <form
      onSubmit={(event) => void save(event)}
      className="flex shrink-0 flex-col gap-2 rounded-card bg-surface-card p-4"
    >
      <Field htmlFor="receipt-merchant" label="Merchant name">
        <Input
          id="receipt-merchant"
          value={name}
          maxLength={200}
          disabled={pending}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter merchant name"
          autoComplete="organization"
        />
      </Field>
      <Button type="submit" size="sm" disabled={disabled} loading={pending} className="self-end">
        Save merchant
      </Button>
      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}
    </form>
  );
}
