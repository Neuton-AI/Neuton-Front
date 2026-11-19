import { IconInfo } from '@/components/icons';
import { useConfirmDialog } from '@/components/ConfirmDialog/ConfirmDialog.module';
import { useId } from 'react';

const title = 'Save without unavailable items?';
const description = 'Some items are no longer available and won’t be included in this order. Do you want to continue with the available items?';

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function UnavailableItemsDialog({ open, onCancel, onConfirm }: Props) {
  const id = useId();
  const { dialogRef, cancelRef } = useConfirmDialog({
    open, onCancel, onConfirm, title, description, cancelLabel: 'Go back', confirmLabel: 'Save order',
  });
  if (!open) return null;

  return (
    <div className='fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#14141366] p-6'>
      <div ref={dialogRef} role='dialog' aria-modal='true' aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        className='flex w-full max-w-[342px] flex-col gap-4 rounded-[16px] border border-hairline bg-surface-canvas p-6 shadow-[0_12px_40px_#14141326]'>
        <div className='flex items-center gap-3'>
          <span className='grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-card text-brand-primary-active'>
            <IconInfo className='h-5 w-5' />
          </span>
          <h2 id={`${id}-title`} className='font-display text-[28px]/[30px] font-medium tracking-[-0.01em]'>{title}</h2>
        </div>
        <p id={`${id}-description`} className='text-[14px]/[22px] text-ink-muted'>{description}</p>
        <div className='flex gap-2.5 pt-2 text-[14px] font-semibold'>
          <button ref={cancelRef} type='button' onClick={onCancel}
            className='h-12 flex-1 rounded-input border border-hairline hover:bg-surface-soft'>Go back</button>
          <button type='button' onClick={onConfirm}
            className='h-12 flex-1 rounded-input bg-brand-primary text-ink-on-primary hover:bg-brand-primary-active'>Save order</button>
        </div>
      </div>
    </div>
  );
}
