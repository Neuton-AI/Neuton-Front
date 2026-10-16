import { FullPageLoader, InlineNotice } from '@/components/feedback';
import { FormFields } from '@/components/FormFields/FormFields';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { Button } from '@/components/ui';
import { formatMoney } from '@/lib/format';
import { useNewOrderPage } from './NewOrderPage.module';
import { OrderItems } from './OrderItems/OrderItems';
import { Row } from './Row/Row';

export function NewOrderPage() {
  const {
    quoteSubtotal,
    itemFields,
    fields,
    formValues,
    handleFieldChange,
    authLoading,
    activeShopId,
    shopsLoading,
    lines,
    currency,
    recipes,
    loading,
    itemsError,
    quote,
    quoteError,
    quoting,
    quantityOf,
    changeQuantity,
    submit,
    createOrderPending,
    handleBack,
  } = useNewOrderPage();
  if (authLoading || shopsLoading || !activeShopId) {
    return <FullPageLoader />;
  }
  return (
    <div className="shell">
      <PageHeader title="New order" onBack={handleBack} />

      <form onSubmit={submit} className="flex flex-1 flex-col gap-5 px-5 pb-8">
        <section className="flex flex-col gap-3">
          <h2 className="text-eyebrow font-medium uppercase text-ink-muted">Customer</h2>
          <FormFields fields={fields} values={formValues} onChange={handleFieldChange} />
        </section>

        <FormFields
          fields={itemFields}
          values={formValues}
          onChange={handleFieldChange}
          customFields={{
            items: (
              <OrderItems
                {...{ itemsError, loading, recipes, currency, quantityOf, changeQuantity }}
              />
            ),
          }}
        />

        <section className="flex flex-col gap-2 rounded-card bg-surface-card p-4">
          {quote ? (
            <>
              <Row label="Items" value={formatMoney(quoteSubtotal, currency)} />
              <Row label="Delivery" value={formatMoney(quote.deliveryFee, currency)} />
              <div className="h-px bg-hairline" />
              <Row label="Total" value={formatMoney(quote.totalAmount, currency)} emphasis />
              <Row label="Net profit" value={formatMoney(quote.netProfit, currency)} />
              <p className="text-label text-ink-muted">
                Margin {quote.profitMarginPercent.toFixed(1)}% · cost{' '}
                {formatMoney(quote.totalCost, currency)}
              </p>
            </>
          ) : quoteError ? (
            <InlineNotice tone="error">{quoteError}</InlineNotice>
          ) : (
            <p className="py-1 text-label text-ink-muted">
              {quoting ? 'Pricing…' : 'Add an item to see the live quote.'}
            </p>
          )}
        </section>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          block
          loading={createOrderPending}
          disabled={lines.length === 0 || quoting || quote === null}
        >
          {lines.length === 0
            ? 'Add at least one item'
            : quoting
              ? 'Pricing…'
              : `Save order · ${formatMoney(quote?.totalAmount ?? 0, currency)}`}
        </Button>
      </form>
    </div>
  );
}
