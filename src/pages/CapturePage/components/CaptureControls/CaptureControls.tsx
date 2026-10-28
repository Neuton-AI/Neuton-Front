import type React from "react";
import { Spinner } from "@/components/feedback";
import { IconClose } from "@/components/icons";
import { CaptureAction, CaptureIcon } from "../CaptureAction/CaptureAction";
import type { CapturePageModel } from "../../CapturePage.module";

interface ICaptureControls extends Pick<
  CapturePageModel,
  | "current"
  | "stacked"
  | "total"
  | "busy"
  | "adding"
  | "locked"
  | "capturing"
  | "retake"
  | "addCurrent"
  | "submit"
  | "handleShutter"
> {
  instant: boolean;
}

export const CaptureControls: React.FC<ICaptureControls> = ({ ...props }) => {
  const { current, busy } = props;
  return (
    <div
      className={`capture-controls${current ? " capture-controls--captured" : ""}`}
    >
      {current ? (
        <CapturedControls {...props} />
      ) : (
        <LiveControls {...props} busy={busy} />
      )}
    </div>
  );
};

interface ICapturedControls extends Pick<
  CapturePageModel,
  | "current"
  | "stacked"
  | "total"
  | "busy"
  | "adding"
  | "locked"
  | "capturing"
  | "retake"
  | "addCurrent"
  | "submit"
  | "handleShutter"
> {
  instant: boolean;
}

const CapturedControls: React.FC<ICapturedControls> = ({
  total,
  locked,
  busy,
  adding,
  retake,
  addCurrent,
  submit,
  instant,
}) => {
  return (
    <>
      <CaptureAction
        label="Retake"
        variant="capture-action--retake"
        disabled={locked}
        onClick={retake}
      >
        <IconClose className="h-[22px] w-[22px]" />
      </CaptureAction>
      <CaptureAction
        label="Add"
        variant="capture-action--add"
        disabled={locked || total >= 4}
        onClick={() => void addCurrent(instant)}
      >
        <CaptureIcon kind="plus" />
      </CaptureAction>
      <CaptureAction
        label="Send"
        variant="capture-action--send"
        disabled={busy || adding}
        onClick={() => void submit()}
      >
        {busy ? <Spinner className="h-6 w-6" /> : <CaptureIcon kind="send" />}
        {total > 1 && <span className="capture-send-count">{total}</span>}
      </CaptureAction>
    </>
  );
};

interface ILiveControls extends Pick<
  CapturePageModel,
  | "current"
  | "stacked"
  | "total"
  | "busy"
  | "adding"
  | "locked"
  | "capturing"
  | "retake"
  | "addCurrent"
  | "submit"
  | "handleShutter"
> {
  instant: boolean;
}

const LiveControls: React.FC<ILiveControls> = ({
  stacked,
  total,
  locked,
  busy,
  adding,
  capturing,
  handleShutter,
  submit,
}) => {
  return (
    <>
      <button
        type="button"
        className="capture-shutter"
        aria-label="Take photo"
        disabled={locked || total >= 4}
        onClick={handleShutter}
      >
        <span />
      </button>
      {stacked.length > 0 && (
        <CaptureAction
          label={busy ? "Saving…" : "Send"}
          variant="capture-action--send capture-send-saved"
          disabled={busy || adding || capturing}
          onClick={() => void submit()}
        >
          {busy ? <Spinner className="h-4 w-4" /> : <CaptureIcon kind="send" />}
          <span className="capture-send-count">{total}</span>
        </CaptureAction>
      )}
    </>
  );
};
