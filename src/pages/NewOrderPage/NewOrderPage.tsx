import { ConfirmDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import { ErrorState, FullPageLoader, InlineNotice } from '@/components/feedback';
import { IconClose, IconInfo } from '@/components/icons';
import type { OrderEditSnapshot } from '@/features/orders/types';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEditOrderEntry, useNewOrderLayout } from './NewOrderPage.module';
import { RecipePicker } from './components/RecipePicker/RecipePicker';
import { OrderDetails } from './components/OrderDetails';
import { OrderSummary } from './components/OrderSummary';
import { SelectedOrderItems } from './components/SelectedOrderItems';
import { UnavailableItemsDialog } from './components/UnavailableItemsDialog/UnavailableItemsDialog';
import styles from './NewOrderPage.module.css';

export function NewOrderPage() {
  return <OrderEditor />;
}

export function EditOrderPage() {
  const { loading, snapshot, editorKey, message, retry, detailPath } = useEditOrderEntry();
  if (loading) return <FullPageLoader />;
  if (snapshot) return <OrderEditor key={editorKey} snapshot={snapshot} />;
  return (
    <div className="shell flex flex-col gap-4 p-5">
      <h1 className="font-display text-title">Edit order</h1>
      <ErrorState message={message} onRetry={retry} />
      <Link className="text-body underline" to={detailPath} replace>Back to order</Link>
    </div>
  );
}

function OrderEditor({ snapshot }: { snapshot?: OrderEditSnapshot }) {
  const [edit] = useState(snapshot);
  const { model, confirmDiscard, closeRef, saveRef, contentRef,
    cancelDiscard, close, discard } = useNewOrderLayout(edit);
  const scrollArea = useRef<HTMLDivElement>(null);
  const itemsSection = useRef<HTMLElement>(null);
  if (model.authLoading || model.shopsLoading || !model.activeShopId) return <FullPageLoader />;
  return <>
    <div ref={contentRef} className={`shell ${styles.page}`}>
      <header className={styles.header}>
        <button ref={closeRef} type='button' aria-label={edit ? 'Close edit order' : 'Close new order'} onClick={close}
          disabled={model.createOrderPending}><IconClose className='h-[18px] w-[18px]' /></button>
        <h1>{edit ? 'Edit order' : 'New order'}</h1>
      </header>
      <form onSubmit={model.submit} className={styles.form}>
        <div ref={scrollArea} className={styles.content} role='region' aria-label='Order details and items' tabIndex={0}>
          <OrderDetails {...model} />
          <section ref={itemsSection} className={styles.items} aria-labelledby='order-items-heading'>
            <div className={styles.itemsHeading}>
              <h2 id='order-items-heading'>Items</h2>
              <div className={styles.warnings} aria-live='polite'>
                {model.unavailableIds.length > 0 ? (
                  <span><IconInfo className='h-3.5 w-3.5 shrink-0' />some items are not available</span>
                ) : null}
                {Object.keys(model.priceDiffByRecipeId).length > 0 ? (
                  <span><IconInfo className='h-3.5 w-3.5 shrink-0' />Some item prices have changed</span>
                ) : null}
              </div>
              <span>{model.selectedCount} units</span>
            </div>
            {model.itemsError ? <InlineNotice tone='error'>{model.itemsError}</InlineNotice> : null}
            {model.lines.length > 0 ? <SelectedOrderItems {...model} /> : null}
          </section>
        </div>
        <footer className={styles.footer}>
          <RecipePicker key={model.draftScope} recipes={model.recipes} loading={model.loading}
            error={Boolean(model.error)} disabled={model.createOrderPending}
            scrollArea={scrollArea} itemsSection={itemsSection}
            onAdd={recipe => model.changeQuantity(recipe, 1)} />
          <OrderSummary subtotal={model.subtotal} deliveryFee={model.draftDeliveryFee} currency={model.currency} />
          <button ref={saveRef} type='submit' className={styles.saveButton} formNoValidate={model.availableCount === 0}
            disabled={model.lines.length === 0 || model.createOrderPending}
            aria-busy={model.createOrderPending}>{edit ? 'Save changes' : 'Save order'}</button>
        </footer>
      </form>
    </div>
    <ConfirmDialog open={confirmDiscard} title={edit ? 'Discard changes?' : 'Discard this order?'}
      description='Your unsaved order details and selected items will be lost.'
      confirmLabel={edit ? 'Discard changes' : 'Discard order'} cancelLabel='Keep editing' onCancel={cancelDiscard}
      onConfirm={discard} />
    <UnavailableItemsDialog open={model.reviewOpen} onCancel={model.cancelReview} onConfirm={model.confirmReview} />
  </>;
}
