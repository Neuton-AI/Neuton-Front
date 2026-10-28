import { IconClose, IconProductScan } from '@/components/icons';
import { useBarcodeScanner, type BarcodeScannerProps } from './BarcodeScanner.module';
import { BarcodeCamera } from './BarcodeCamera';
import { ManualProductForm } from './ManualProductForm';

export function BarcodeScanner(props: BarcodeScannerProps) {
  const model = useBarcodeScanner(props);
  return (
    <div
      ref={model.dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={model.titleId}
      className={`fixed inset-0 z-[60] flex flex-col items-center overflow-y-auto pt-[max(var(--safe-top)+16px,16px)] ${model.manual ? 'bg-[#FAF9F5] text-[#141413]' : 'bg-[#181715] px-4 pb-[max(var(--safe-bottom)+32px,32px)] text-[#FAF9F5]'}`}
    >
      <BarcodeHeader {...props} model={model} />
      {model.manual && props.onManualSave ? (
        <ManualProductForm
          onSave={props.onManualSave}
          busy={Boolean(props.busy)}
          error={props.error}
          currency={props.currency ?? 'USD'}
          ingredient={props.ingredient}
        />
      ) : (
        <BarcodeCamera {...props} model={model} />
      )}
    </div>
  );
}

function BarcodeHeader({
  busy,
  model,
}: BarcodeScannerProps & { model: ReturnType<typeof useBarcodeScanner> }) {
  return (
    <header className={`relative mb-4 flex min-h-9 w-full items-center gap-3 ${model.manual ? 'max-w-[390px] px-4' : 'max-w-[358px]'}`}>
      <button
        ref={model.closeRef}
        type="button"
        aria-label={model.manual ? 'Back to barcode scanner' : 'Close barcode scanner'}
        disabled={busy}
        onClick={() => (model.manual ? model.changeMode(false) : model.close())}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-50 ${model.manual ? 'bg-[#EFE9DE]' : 'bg-[#252320]'}`}
      >
        {model.manual ? <span aria-hidden="true">←</span> : <IconClose className="h-[18px] w-[18px]" />}
      </button>
      <h2 id={model.titleId} className={model.manual ? 'flex-1 font-display text-[28px] leading-[34px] tracking-[-0.3px]' : 'flex-1 text-center text-[18px] font-medium'}>
        {model.manual ? 'Add product' : 'Scan barcode'}
      </h2>
      {model.manual ? (
        <button type="button" disabled={busy} onClick={() => model.changeMode(false)} className="flex items-center gap-1.5 text-sm font-medium text-[#A9583E]">
          <IconProductScan />
          Scan
        </button>
      ) : (
        <button
          type="button"
          aria-label="Toggle flashlight"
          disabled={!model.torchAvailable || model.waiting}
          aria-pressed={model.torchOn}
          onClick={() => void model.toggleTorch()}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#252320] disabled:opacity-40"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
          </svg>
        </button>
      )}
    </header>
  );
}

