import { Button, Input } from "@/components/ui";
import { ReauthenticateDialog } from "@/features/auth/ReauthenticateDialog";
import { useEmailPanel } from "./EmailPanel.module";

export function EmailPanel() {
  const model = useEmailPanel();
  return (
    <section
      className="mt-4 rounded-card bg-surface-card p-4"
      aria-labelledby="email-title"
    >
      <h2 id="email-title" className="eyebrow">
        Contact email
      </h2>
      <p className="my-3 break-all">{model.currentEmail}</p>
      {model.notice && (
        <p role="status" className="my-3">
          {model.notice}
        </p>
      )}
      {model.error && (
        <p role="alert" className="my-3">
          {model.error}
        </p>
      )}
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => void model.submit(event)}
      >
        <label htmlFor="new-contact-email">New contact email</label>
        <Input
          id="new-contact-email"
          type="email"
          autoComplete="email"
          required
          maxLength={640}
          value={model.email}
          onChange={(event) => model.setEmail(event.target.value)}
          disabled={model.busy}
        />
        <p className="text-label text-ink-muted">
          Confirm the new address from your email. Completion signs out all
          devices.
        </p>
        <Button type="submit" loading={model.busy}>
          Send confirmation
        </Button>
      </form>
      {model.verifying && !model.methods && (
        <p role="status">Loading verification methods…</p>
      )}
      {model.verifying && model.methods && (
        <ReauthenticateDialog
          intent="change your contact email"
          passwordAvailable={model.methods.passwordAvailable}
          googleAvailable={model.methods.capabilities.reauthenticateGoogle}
          onVerified={model.verified}
          onCancel={model.cancel}
        />
      )}
    </section>
  );
}
