import { IconTrash } from '@/components/icons';
import { formatMoney } from '@/lib/format';
import type { NewOrderPageModel } from '../NewOrderPage.module';
import styles from '../NewOrderPage.module.css';

type Props = Pick<NewOrderPageModel, 'lines' | 'currency' | 'changeQuantity' | 'remove'>;

export function SelectedOrderItems({ lines, currency, changeQuantity, remove }: Props) {
  return <ul aria-label='Selected items' className={styles.lines}>
    {lines.map(line => <li key={line.recipeId} className={styles.line}>
      <div className={styles.itemName}>
        <span title={line.name}>{line.name}</span>
        <div className={styles.unitPrice}>
          <span title={formatMoney(line.unitPrice, currency)}>{formatMoney(line.unitPrice, currency)}</span>
          <span>/ each</span>
        </div>
      </div>
      <div className={styles.counter}>
        <button type='button' aria-label={`Remove one ${line.name}`}
          disabled={!line.available || line.pricingPending}
          onClick={() => changeQuantity({ id: line.recipeId }, -1)}>−</button>
        <output aria-label={`Quantity of ${line.name}`}>{line.quantity}</output>
        <button type='button' aria-label={`Add one ${line.name}`}
          disabled={!line.available || line.pricingPending || line.quantity >= 100000}
          onClick={() => changeQuantity({ id: line.recipeId }, 1)}>+</button>
      </div>
      <div className={styles.lineEnd}>
        <span title={formatMoney(Number(line.unitPrice) * line.quantity, currency)}>
          {formatMoney(Number(line.unitPrice) * line.quantity, currency)}
        </span>
        <button type='button' aria-label={`Remove ${line.name}`} onClick={() => remove(line.recipeId)}>
          <IconTrash className='h-4 w-4' />
        </button>
      </div>
    </li>)}
  </ul>;
}
