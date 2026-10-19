import { useState } from 'react';
import { IconClose, IconEdit, IconProductLink, IconProductScan } from '@/components/icons';
import { Spinner } from '@/components/feedback';
import { useBarcodeScanner, type BarcodeScannerProps } from './BarcodeScanner.module';
import { ManualProductForm } from './ManualProductForm';

export function BarcodeScanner(props: BarcodeScannerProps) {
  const [manual, setManual] = useState(false);
  function changeMode(value: boolean) {
    setManual(value);
    props.onModeChange?.();
  }
  const model = useBarcodeScanner({ ...props, paused: manual });
  return (
    <div
      ref={model.dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={model.titleId}
      className={`fixed inset-0 z-[60] flex flex-col items-center overflow-y-auto pt-[max(var(--safe-top)+16px,16px)] ${manual ? 'bg-[#FAF9F5] text-[#141413]' : 'bg-[#181715] px-4 pb-[max(var(--safe-bottom)+32px,32px)] text-[#FAF9F5]'}`}
    >
      <header
        className={`relative mb-4 flex min-h-9 w-full items-center gap-3 ${manual ? 'max-w-[390px] px-4' : 'max-w-[358px]'}`}
      >
        <button
          ref={model.closeRef}
          type="button"
          aria-label={manual ? 'Back to barcode scanner' : 'Close barcode scanner'}
          disabled={props.busy}
          onClick={() => (manual ? changeMode(false) : model.close())}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-50 ${manual ? 'bg-[#EFE9DE]' : 'bg-[#252320]'}`}
        >
          {manual ? <span aria-hidden="true">←</span> : <IconClose className="h-[18px] w-[18px]" />}
        </button>
        <h2
          id={model.titleId}
          className={
            manual
              ? 'flex-1 font-display text-[28px] leading-[34px] tracking-[-0.3px]'
              : 'flex-1 text-center text-[18px] font-medium'
          }
        >
          {manual ? 'Add product' : 'Scan barcode'}
        </h2>
        {manual ? (
          <button
            type="button"
            disabled={props.busy}
            onClick={() => changeMode(false)}
            className="flex items-center gap-1.5 text-sm font-medium text-[#A9583E]"
          >
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
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
            </svg>
          </button>
        )}
      </header>
      {manual && props.onManualSave ? (
        <ManualProductForm
          onSave={props.onManualSave}
          busy={Boolean(props.busy)}
          error={props.error}
          currency={props.currency ?? 'USD'}
          ingredient={props.ingredient}
        />
      ) : (
        <>
          {props.ingredient ? (
            <p className="mb-4 rounded-full bg-[#252320] px-3.5 py-[7px] text-[13px] leading-[18px]">
              <span className="mr-2 text-[#E8A48C]" aria-hidden="true">
                <IconProductLink />
              </span>
              <span className="text-[#A09D96]">Linking to </span>
              <strong className="font-semibold">{props.ingredient.rawMaterialName}</strong>
            </p>
          ) : null}
          <div className="relative flex min-h-[240px] w-full max-w-[358px] flex-1 basis-[390px] items-center justify-center overflow-hidden rounded-2xl bg-[#1F1E1B]">
            <video
              ref={model.videoRef}
              autoPlay
              playsInline
              muted
              aria-label="Barcode camera preview"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-7">
              <span className="absolute left-0 top-0 h-9 w-9 rounded-tl-md border-l-4 border-t-4" />
              <span className="absolute right-0 top-0 h-9 w-9 rounded-tr-md border-r-4 border-t-4" />
              <span className="absolute bottom-0 left-0 h-9 w-9 rounded-bl-md border-b-4 border-l-4" />
              <span className="absolute bottom-0 right-0 h-9 w-9 rounded-br-md border-b-4 border-r-4" />
              <div className="absolute inset-x-4 top-1/2 h-0.5 rounded bg-[#CC785C] shadow-[0_0_14px_2px_#CC785C8C]" />
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
          <p
            className={`mt-5 max-w-[358px] rounded-full px-3.5 py-2 text-center text-[13px] leading-[18px] ${props.error ? 'bg-[#382720] text-[#F7D2C6]' : 'bg-[#252320]'}`}
            role={props.error ? 'alert' : 'status'}
          >
            {props.error ?? model.cameraNotice ?? 'Hold steady · barcode scans automatically'}
          </p>
          <div className="min-h-6 flex-1" />
          <form onSubmit={model.submit} className="mb-5 flex w-full max-w-[358px] flex-col gap-2">
            {props.error ? (
              <p className="text-[13px] text-[#A09D96]">
                Type the number printed under the bars instead.
              </p>
            ) : null}
            <label htmlFor={`${model.titleId}-barcode`} className="sr-only">
              Or enter barcode
            </label>
            <div className="flex h-12 items-center gap-2.5 rounded-[10px] border border-[#242220] bg-[#1A1917] pl-3.5 pr-2 focus-within:border-[#CC785C] focus-within:shadow-[0_0_0_4px_#CC785C29]">
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#A09D96"
                strokeWidth="2"
              >
                <path d="M3 5v14M7 5v14M11 5v14M16 5v14M20 5v14M14 5v14" />
              </svg>
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
                placeholder="Type barcode number"
                className="h-full min-w-0 flex-1 bg-transparent text-base tracking-[0.06em] outline-none placeholder:text-sm placeholder:tracking-normal placeholder:text-[#A09D96] disabled:opacity-50"
              />
              <button
                type="submit"
                aria-label="Find price"
                disabled={model.waiting || !model.barcode.trim()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#CC785C] text-white disabled:bg-[#211F1D] disabled:text-[#A09D96]"
              >
                <span aria-hidden="true">→</span>
              </button>
            </div>
            {model.validationError ? (
              <p id={`${model.titleId}-error`} role="alert" className="text-sm text-[#F2AD94]">
                {model.validationError}
              </p>
            ) : null}
          </form>
          {props.onManualSave ? (
            <div className="flex w-full max-w-[358px] flex-col gap-3">
              <div className="flex items-center gap-3 text-[13px] font-medium text-[#A09D96]">
                <span className="h-px flex-1 bg-[#2F2D29]" />
                No barcode, or it won’t scan?
                <span className="h-px flex-1 bg-[#2F2D29]" />
              </div>
              <button
                type="button"
                disabled={model.waiting}
                onClick={() => changeMode(true)}
                className="flex h-[52px] items-center justify-center gap-2.5 rounded-lg bg-[#FAF9F5] text-[15px] font-semibold text-[#141413] disabled:opacity-50"
              >
                <IconEdit className="h-[18px] w-[18px]" />
                Add manually
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
