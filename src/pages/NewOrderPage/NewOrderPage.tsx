import { ConfirmDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import { FullPageLoader, InlineNotice } from '@/components/feedback';
import { IconClose, IconInfo } from '@/components/icons';
import { useNewOrderLayout } from './NewOrderPage.module';
import { RecipePicker } from './components/RecipePicker/RecipePicker';
import { OrderDetails } from './components/OrderDetails';
import { OrderSummary } from './components/OrderSummary';
import { SelectedOrderItems } from './components/SelectedOrderItems';
import { UnavailableItemsDialog } from './components/UnavailableItemsDialog/UnavailableItemsDialog';
import styles from './NewOrderPage.module.css';

export function NewOrderPage() {
  const { model, confirmDiscard, closeRef, saveRef, contentRef,
    cancelDiscard, close, discard } = useNewOrderLayout();
  if (model.authLoading || model.shopsLoading || !model.activeShopId) return <FullPageLoader />;
  return <>
    <div ref={contentRef} className={`shell ${styles.page}`}>
      <header className={styles.header}>
        <button ref={closeRef} type='button' aria-label='Close new order' onClick={close}
          disabled={model.createOrderPending}><IconClose className='h-[18px] w-[18px]' /></button>
        <h1>New order</h1>
      </header>
      <form onSubmit={model.submit} className={styles.form}>
        <div className={styles.content} role='region' aria-label='Order details and items' tabIndex={0}>
          <OrderDetails {...model} />
          <section className={styles.items} aria-labelledby='order-items-heading'>
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
            onAdd={recipe => model.changeQuantity(recipe, 1)} />
          <OrderSummary subtotal={model.subtotal} deliveryFee={model.draftDeliveryFee} currency={model.currency} />
          <button ref={saveRef} type='submit' className={styles.saveButton} formNoValidate={model.availableCount === 0}
            disabled={model.lines.length === 0 || model.createOrderPending}
            aria-busy={model.createOrderPending}>Save order</button>
        </footer>
      </form>
    </div>
    <ConfirmDialog open={confirmDiscard} title='Discard this order?'
      description='Your unsaved order details and selected items will be lost.'
      confirmLabel='Discard order' cancelLabel='Keep editing' onCancel={cancelDiscard}
      onConfirm={discard} />
    <UnavailableItemsDialog open={model.reviewOpen} onCancel={model.cancelReview} onConfirm={model.confirmReview} />
  </>;
}
