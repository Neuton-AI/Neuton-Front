import { InlineNotice, Spinner } from '@/components/feedback';
import { IconClose } from '@/components/icons';
import { Button } from '@/components/ui';
import { useIngredientScanPage, type IngredientScanPageModel } from './IngredientScanPage.module';

export function IngredientScanPage() {
  return <IngredientScanView model={useIngredientScanPage()} />;
}

export function IngredientScanView({ model }: { model: IngredientScanPageModel }) {
  const {
    videoRef,
    cameraError,
    unsupported,
    ingredientName,
    barcode,
    setBarcode,
    submitManual,
    linkError,
    linking,
    linked,
    close,
  } = model;

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-surface-dark px-4 pb-8 pt-[max(var(--safe-top)+16px,16px)]">
      <div className="relative mb-4 flex w-full max-w-[358px] flex-col items-center self-center">
        <button
          type="button"
          aria-label="Close scanner"
          onClick={close}
          className="pressable absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-surface-dark-elevated"
        >
          <IconClose className="h-[18px] w-[18px] text-ink-on-dark" strokeWidth={1.5} />
        </button>
        <span className="text-[18px] font-medium leading-[25px] text-ink-on-dark">Scan barcode</span>
        {ingredientName ? (
          <span className="mt-0.5 text-[13px] font-medium leading-[18px] text-ink-on-dark-soft">
            {ingredientName}
          </span>
        ) : null}
      </div>

      <div className="relative h-[300px] w-full max-w-[358px] shrink-0 self-center overflow-hidden rounded-card bg-surface-dark-soft">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 200 120"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M18 34V22a4 4 0 0 1 4-4h14M164 18h14a4 4 0 0 1 4 4v12M182 86v12a4 4 0 0 1-4 4h-14M36 102H22a4 4 0 0 1-4-4V86"
            className="stroke-ink-on-dark"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M28 60h144"
            className="stroke-brand-primary"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-surface-dark-elevated px-[14px] py-[8px] text-[13px] font-medium leading-[18px] text-ink-on-dark">
          Align barcode within frame
        </span>
      </div>

      <div className="mt-4 flex w-full max-w-[358px] flex-col gap-3 self-center">
        {unsupported ? (
          <p className="text-center text-[13px] font-medium leading-[18px] text-ink-on-dark-soft">
            Camera scanning is not supported on this device — enter the barcode below.
          </p>
        ) : null}
        {cameraError ? <InlineNotice tone="error">{cameraError}</InlineNotice> : null}
        {linkError ? <InlineNotice tone="error">{linkError}</InlineNotice> : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="manual-barcode" className="text-label font-medium text-ink-on-dark-soft">
            Enter barcode manually
          </label>
          <div className="flex gap-2">
            <input
              id="manual-barcode"
              aria-label="Barcode"
              inputMode="numeric"
              autoComplete="off"
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitManual();
              }}
              placeholder="e.g. 4006381333931"
              className="h-11 min-w-0 flex-1 rounded-input border border-ink-on-dark-soft/40 bg-surface-dark-elevated px-3 text-body text-ink-on-dark placeholder:text-ink-on-dark-soft focus:border-brand-primary focus:outline-none"
            />
            <Button
              radius="input"
              size="md"
              disabled={linking || linked}
              onClick={submitManual}
              className="shrink-0"
            >
              Link
            </Button>
          </div>
        </div>
      </div>

      {linking ? (
        <div
          role="status"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface-dark/80"
        >
          <Spinner className="h-7 w-7 text-ink-on-dark" />
          <p className="text-[15px] font-medium text-ink-on-dark">Linking…</p>
        </div>
      ) : null}

      {linked && !linking ? (
        <div
          role="status"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface-dark/80"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-pill bg-brand-teal text-surface-dark">
            <svg
              className="h-7 w-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m5 12.5 5 5 9-11" />
            </svg>
          </span>
          <p className="text-[15px] font-medium text-ink-on-dark">Linked</p>
        </div>
      ) : null}
    </div>
  );
}
