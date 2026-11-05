import { Link } from "react-router-dom";
import { Button, Input } from "@/components/ui";
import { usePasswordPanel } from "./PasswordPanel.module";
import { ReauthenticateDialog } from "@/features/auth/ReauthenticateDialog";

export function PasswordPanel() {
  const model = usePasswordPanel();
  return (
    <section
      className="mt-4 rounded-card bg-surface-card p-4"
      aria-labelledby="password-title"
    >
      <h2 id="password-title" className="eyebrow">
        Password security
      </h2>
      <p className="my-2 text-label text-ink-muted">
        Changing your password signs out your other devices. Use 15–128
        characters.
      </p>
      {model.error && (
        <p role="alert" className="my-3">
          {model.error} <Link to="/signin">Sign in again</Link>
        </p>
      )}
      {model.notice && (
        <p role="status" className="my-3">
          {model.notice}
        </p>
      )}
      <form
        onSubmit={(event) => void model.submit(event)}
        className="flex flex-col gap-3"
      >
        <label htmlFor="current-password">Current password</label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
          disabled={model.busy}
          value={model.currentPassword}
          onChange={(event) => model.setCurrentPassword(event.target.value)}
        />
        <label htmlFor="new-password">New password</label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={15}
          maxLength={256}
          disabled={model.busy}
          value={model.newPassword}
          onChange={(event) => model.setNewPassword(event.target.value)}
        />
        <Button type="submit" loading={model.busy}>
          Change password
        </Button>
      </form>
      <Button
        variant="outline"
        className="mt-3"
        disabled={model.busy}
        onClick={model.startVerification}
      >
        Verify identity
      </Button>
      {model.verifying && (
        <ReauthenticateDialog
          intent="change your password"
          onVerified={model.verified}
          onCancel={model.cancelVerification}
        />
      )}
    </section>
  );
}
