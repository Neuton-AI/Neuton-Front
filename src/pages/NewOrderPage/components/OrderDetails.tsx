import { FormFields } from '@/components/FormFields/FormFields';
import { InlineNotice } from '@/components/feedback';
import type { NewOrderPageModel } from '../NewOrderPage.module';
import styles from '../NewOrderPage.module.css';

type Props = Pick<NewOrderPageModel, 'fields' | 'formValues' | 'handleFieldChange' | 'currency' | 'deliveryDateError'>;

export function OrderDetails({ fields, formValues, handleFieldChange, currency, deliveryDateError }: Props) {
  const currencyPart = new Intl.NumberFormat('en-US', { style: 'currency', currency })
    .formatToParts(0).find(part => part.type === 'currency')?.value ?? currency;
  return <section className={styles.details} aria-labelledby='order-details-heading'>
    <h2 id='order-details-heading'>Order details</h2>
    <FormFields fields={fields.filter(field => field.name !== 'deliveryFee')}
      values={formValues} onChange={handleFieldChange} customFields={{
        deliveryDateError: deliveryDateError ? (
          <div className='col-span-2'><InlineNotice tone='error'>{deliveryDateError}</InlineNotice></div>
        ) : null,
      }} />
    <div className={styles.fee}>
      <label htmlFor='delivery-fee'>Delivery fee</label>
      <div className={styles.feeInput}>
        <span aria-hidden='true'>{currencyPart}</span>
        <input id='delivery-fee' type='number' inputMode='decimal' min='0' max='99999999.99'
          step='0.01' required value={formValues.deliveryFee}
          onChange={event => handleFieldChange('deliveryFee', event.target.value)} />
      </div>
    </div>
  </section>;
}
