import type React from "react";
import { IconEdit, IconProductLink } from "@/components/icons";
import { Spinner } from "@/components/feedback";
import type { BarcodeScannerProps } from "../../BarcodeScanner.module";
import { useBarcodeScanner } from "../../BarcodeScanner.module";

type Model = ReturnType<typeof useBarcodeScanner>;

interface IBarcodeCamera extends Pick<
  BarcodeScannerProps,
  "ingredient" | "error" | "onManualSave"
> {
  model: Model;
}

export const BarcodeCamera: React.FC<IBarcodeCamera> = ({
  ingredient,
  error,
  onManualSave,
  model,
}) => {
  return (
    <>
      {ingredient ? (
        <p className="mb-4 inline-flex w-max max-w-[60vw] shrink-0 items-center gap-2 rounded-full bg-[#252320] px-3.5 py-[7px] text-[13px] leading-[18px]">
          <span className="shrink-0 text-[#E8A48C]" aria-hidden="true">
            <IconProductLink />
          </span>
          <span className="shrink-0 whitespace-nowrap text-[#A09D96]">
            Linking to
          </span>
          <strong
            dir="auto"
            title={ingredient.rawMaterialName}
            className="min-w-0 truncate font-semibold"
          >
            {ingredient.rawMaterialName}
          </strong>
        </p>
      ) : null}
      <BarcodeViewfinder model={model} />
      <p
        className={`mt-5 max-w-[358px] rounded-full px-3.5 py-2 text-center text-[13px] leading-[18px] ${error ? "bg-[#382720] text-[#F7D2C6]" : "bg-[#252320]"}`}
        role={error ? "alert" : "status"}
      >
        {error ??
          model.cameraNotice ??
          "Hold steady · barcode scans automatically"}
      </p>
      <div className="min-h-6 flex-1" />
      <BarcodeEntry model={model} error={error} />
      {onManualSave ? (
        <div className="flex w-full max-w-[358px] flex-col gap-3">
          <div className="flex items-center gap-3 text-[13px] font-medium text-[#A09D96]">
            <span className="h-px flex-1 bg-[#2F2D29]" />
            No barcode, or it won’t scan?
            <span className="h-px flex-1 bg-[#2F2D29]" />
          </div>
          <button
            type="button"
            disabled={model.waiting}
            onClick={() => model.changeMode(true)}
            className="flex h-[52px] items-center justify-center gap-2.5 rounded-lg bg-[#FAF9F5] text-[15px] font-semibold text-[#141413] disabled:opacity-50"
          >
            <IconEdit className="h-[18px] w-[18px]" />
            Add manually
          </button>
        </div>
      ) : null}
    </>
  );
};

interface IBarcodeViewfinder {
  model: Model;
}

const BarcodeViewfinder: React.FC<IBarcodeViewfinder> = ({ model }) => {
  return (
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
  );
};

interface IBarcodeEntry {
  model: Model;
  error?: string | null;
}

const BarcodeEntry: React.FC<IBarcodeEntry> = ({ model, error }) => {
  return (
    <form
      onSubmit={model.submit}
      className="mb-5 flex w-full max-w-[358px] flex-col gap-2"
    >
      {error ? (
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
          aria-describedby={
            model.validationError ? `${model.titleId}-error` : undefined
          }
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
        <p
          id={`${model.titleId}-error`}
          role="alert"
          className="text-sm text-[#F2AD94]"
        >
          {model.validationError}
        </p>
      ) : null}
    </form>
  );
};
