import { ConfirmDialog } from '@/components/ConfirmDialog/ConfirmDialog';
import { FullPageLoader, InlineNotice } from '@/components/feedback';
import { IconClose } from '@/components/icons';
import { useNewOrderLayout } from './NewOrderPage.module';
import { RecipePicker } from './components/RecipePicker/RecipePicker';
import { OrderDetails } from './components/OrderDetails';
import { OrderSummary } from './components/OrderSummary';
import { SelectedOrderItems } from './components/SelectedOrderItems';
import styles from './NewOrderPage.module.css';

export function NewOrderPage() {
  const { model, confirmDiscard, closeRef, contentRef,
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
        <div className={styles.content}>
          <OrderDetails {...model} />
          <section className={styles.items} aria-labelledby='order-items-heading'>
            <div className={styles.itemsHeading}>
              <h2 id='order-items-heading'>Items</h2><span>{model.selectedCount} units</span>
            </div>
            {model.itemsError ? <InlineNotice tone='error'>{model.itemsError}</InlineNotice> : null}
            {model.lines.length > 0 ? <SelectedOrderItems {...model} /> : null}
            <RecipePicker key={model.draftScope} recipes={model.recipes} loading={model.loading}
              error={Boolean(model.error)} disabled={model.createOrderPending}
              onAdd={recipe => model.changeQuantity(recipe, 1)} />
          </section>
          <OrderSummary subtotal={model.quoteSubtotal} deliveryFee={model.draftDeliveryFee} currency={model.currency} />
        </div>
        <footer className={styles.footer}>
          <button type='submit' disabled={model.lines.length === 0 || model.createOrderPending}
            aria-busy={model.createOrderPending}>Save order</button>
        </footer>
      </form>
    </div>
    <ConfirmDialog open={confirmDiscard} title='Discard this order?'
      description='Your unsaved order details and selected items will be lost.'
      confirmLabel='Discard order' cancelLabel='Keep editing' onCancel={cancelDiscard}
      onConfirm={discard} />
  </>;
}
