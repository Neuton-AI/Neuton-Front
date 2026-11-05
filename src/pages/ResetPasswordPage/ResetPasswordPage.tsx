import { Link } from "react-router-dom";
import { Button, Input } from "@/components/ui";
import { FullPageLoader } from "@/components/feedback";
import {
  useResetPasswordPage,
  useResetPasswordReady,
} from "./ResetPasswordPage.module";

export function ResetPasswordPage() {
  const ready = useResetPasswordReady();
  if (!ready) return <FullPageLoader />;
  return <ResetPasswordForm />;
}

function ResetPasswordForm() {
  const model = useResetPasswordPage();
  return (
    <main className="shell p-6" aria-labelledby="reset-title">
      <h1 id="reset-title" className="font-display text-3xl">
        Reset your password
      </h1>
      {model.done && (
        <p role="status" className="my-4">
          Password reset. Sign in with your new password.
        </p>
      )}
      {model.error && (
        <p role="alert" className="my-4">
          {model.error}
        </p>
      )}
      {!model.secret && !model.done && (
        <p className="my-4">
          Open your email link again or request a new one if it has expired or
          already been used.
        </p>
      )}
      {model.secret && (
        <form
          onSubmit={(event) => void model.submit(event)}
          className="my-6 flex flex-col gap-3"
        >
          <label htmlFor="reset-password">New password</label>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={15}
            maxLength={256}
            disabled={model.busy}
            value={model.password}
            onChange={(event) => model.setPassword(event.target.value)}
          />
          <p className="text-label text-ink-muted">Use 15–128 characters.</p>
          <label htmlFor="reset-confirmation">Confirm new password</label>
          <Input
            id="reset-confirmation"
            type="password"
            autoComplete="new-password"
            required
            maxLength={256}
            disabled={model.busy}
            value={model.confirmation}
            onChange={(event) => model.setConfirmation(event.target.value)}
          />
          <Button type="submit" loading={model.busy}>
            Reset password
          </Button>
        </form>
      )}
      <div className="my-4 flex flex-wrap gap-4">
        <Link to="/signin">Sign in</Link>
        <Link to="/forgot-password">Request a new link</Link>
      </div>
    </main>
  );
}
