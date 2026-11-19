import { formatMoney } from '@/lib/format';
import styles from '../NewOrderPage.module.css';

export function OrderSummary({ subtotal, deliveryFee, currency }: {
  subtotal: number; deliveryFee: number; currency: string;
}) {
  const total = (Math.round(subtotal * 100) + Math.round(deliveryFee * 100)) / 100;
  return <section className={styles.summary} aria-label='Order breakdown'>
    <div><span>Items subtotal</span><span>{formatMoney(subtotal, currency)}</span></div>
    <div><span>Delivery</span><span>{formatMoney(deliveryFee, currency)}</span></div>
    <div className={styles.total}><span>Total</span><strong>{formatMoney(total, currency)}</strong></div>
  </section>;
}
