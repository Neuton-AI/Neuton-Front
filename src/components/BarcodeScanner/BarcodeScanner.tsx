import { IconClose } from '@/components/icons';
import { Spinner } from '@/components/feedback';
import { useBarcodeScanner, type BarcodeScannerProps } from './BarcodeScanner.module';

export function BarcodeScanner(props: BarcodeScannerProps) {
  const model = useBarcodeScanner(props);
  return (
    <div
      ref={model.dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={model.titleId}
      className="fixed inset-0 z-[60] flex flex-col items-center overflow-y-auto bg-[#181715] px-4 pb-[max(var(--safe-bottom)+24px,24px)] pt-[max(var(--safe-top)+16px,16px)] text-[#FAF9F5]"
    >
      <header className="relative mb-6 flex min-h-9 w-full max-w-[358px] items-center justify-center">
        <button
          ref={model.closeRef}
          type="button"
          aria-label="Close barcode scanner"
          onClick={model.close}
          className="absolute left-0 flex h-9 w-9 items-center justify-center rounded-full bg-[#252320]"
        >
          <IconClose className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </button>
        <h2 id={model.titleId} className="text-[18px] font-medium">
          Scan barcode
        </h2>
      </header>
      <p className="mb-5 max-w-[358px] text-center text-sm text-[#A09D96]">
        Scan the product to find a price for this ingredient.
      </p>
      <div className="relative flex min-h-[240px] w-full max-w-[358px] flex-1 items-center justify-center overflow-hidden rounded-[16px] bg-[#1F1E1B]">
        <video
          ref={model.videoRef}
          autoPlay
          playsInline
          muted
          aria-label="Barcode camera preview"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="relative h-36 w-[80%] rounded-xl border-2 border-[#FAF9F5]/80"
        >
          <div className="absolute left-3 right-3 top-1/2 h-px bg-[#CC785C]" />
        </div>
        {model.waiting ? (
          <div
            role="status"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#181715]/85"
          >
            <Spinner className="h-7 w-7" />
            <span className="text-sm">Finding product price…</span>
          </div>
        ) : null}
      </div>
      <p className="mt-4 text-center text-sm text-[#A09D96]" role="status">
        {model.cameraNotice ?? 'Align the product barcode within the frame.'}
      </p>
      {props.error ? (
        <p role="alert" className="mt-3 max-w-[358px] text-center text-sm text-[#F2AD94]">
          {props.error}
        </p>
      ) : null}
      <form onSubmit={model.submit} className="mt-6 flex w-full max-w-[358px] flex-col gap-2">
        <label htmlFor={`${model.titleId}-barcode`} className="text-sm font-medium">
          Or enter barcode
        </label>
        <div className="flex gap-2">
          <input
            id={`${model.titleId}-barcode`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={14}
            value={model.barcode}
            onChange={(event) => model.setBarcode(event.target.value)}
            disabled={model.waiting}
            aria-invalid={Boolean(model.validationError)}
            aria-describedby={model.validationError ? `${model.titleId}-error` : undefined}
            className="h-12 min-w-0 flex-1 rounded-[10px] border border-[#A09D96]/40 bg-[#252320] px-3 text-base outline-none focus:border-[#CC785C] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={model.waiting || !model.barcode.trim()}
            className="rounded-[10px] bg-[#CC785C] px-5 text-sm font-medium text-white disabled:opacity-50"
          >
            Find price
          </button>
        </div>
        {model.validationError ? (
          <p id={`${model.titleId}-error`} role="alert" className="text-sm text-[#F2AD94]">
            {model.validationError}
          </p>
        ) : null}
      </form>
    </div>
  );
}
