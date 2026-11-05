import { Link } from "react-router-dom";
import { Button, Input } from "@/components/ui";
import { useReauthenticateDialog } from "./ReauthenticateDialog.module";

export function ReauthenticateDialog({
  intent,
  onVerified,
  onCancel,
}: {
  intent: string;
  onVerified: () => void;
  onCancel: () => void;
}) {
  const model = useReauthenticateDialog(onVerified);
  return (
    <dialog
      ref={model.dialogRef}
      aria-labelledby="reauth-title"
      aria-describedby="reauth-intent"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-card bg-surface-card p-6 text-ink backdrop:bg-black/40"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id="reauth-title" className="font-display text-2xl">
        Verify your identity
      </h2>
      <p id="reauth-intent" className="my-3">
        Verify your password to {intent}. You will review and submit the action
        afterward.
      </p>
      {model.error && (
        <p role="alert" className="my-3">
          {model.error} <Link to="/signin">Sign in again</Link>
        </p>
      )}
      <form
        onSubmit={(event) => void model.submit(event)}
        className="flex flex-col gap-3"
      >
        <label htmlFor="reauth-password">Password</label>
        <Input
          id="reauth-password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
          disabled={model.busy}
          value={model.password}
          onChange={(event) => model.setPassword(event.target.value)}
        />
        <Button type="submit" loading={model.busy}>
          Verify password
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </form>
    </dialog>
  );
}
