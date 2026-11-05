import { Button, Input } from "@/components/ui";
import { ReauthenticateDialog } from "@/features/auth/ReauthenticateDialog";
import { PasswordPanel } from "./PasswordPanel";
import { useMethodsPanel } from "./MethodsPanel.module";

export function MethodsPanel() {
  const model = useMethodsPanel();
  const methods = model.methods;
  return (
    <>
      <section
        className="mt-4 rounded-card bg-surface-card p-4"
        aria-labelledby="methods-title"
      >
        <h2 id="methods-title" className="eyebrow">
          Sign-in methods
        </h2>
        {model.error && (
          <p role="alert" className="my-3">
            {model.error}
          </p>
        )}
        {model.notice && (
          <p role="status" className="my-3">
            {model.notice}
          </p>
        )}
        {!methods && !model.error && (
          <p role="status" className="my-3">
            Loading sign-in methods…
          </p>
        )}
        {!methods && model.error && (
          <Button variant="outline" onClick={model.retry}>
            Try again
          </Button>
        )}
        {methods && (
          <div className="mt-3 flex flex-col gap-3">
            <p>
              {methods.passwordAvailable
                ? "Password available"
                : "No password added"}
            </p>
            <p>
              {methods.googleLinked ? "Google linked" : "Google not linked"}
            </p>
            {!methods.googleLinked && (
              <>
                <p className="text-label text-ink-muted">
                  Link the Google account you choose. Your contact email stays
                  the same.
                </p>
                <Button
                  variant="outline"
                  disabled={model.busy}
                  onClick={() => void model.link()}
                >
                  Link Google
                </Button>
              </>
            )}
            {methods.googleLinked && !methods.passwordAvailable && (
              <>
                <p className="text-label text-ink-muted">
                  Add a password before removing Google. Verify your linked
                  Google identity first.
                </p>
                {methods.capabilities.addPassword && (
                  <form
                    className="flex flex-col gap-3"
                    onSubmit={(event) => void model.change("add", event)}
                  >
                    <label htmlFor="first-password">First password</label>
                    <Input
                      id="first-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={15}
                      maxLength={256}
                      disabled={model.busy}
                      value={model.password}
                      onChange={(event) =>
                        model.setPassword(event.target.value)
                      }
                    />
                    <Button type="submit" loading={model.busy}>
                      Add password
                    </Button>
                  </form>
                )}
              </>
            )}
            {methods.googleLinked && methods.passwordAvailable && (
              <>
                <p className="text-label text-ink-muted">
                  After unlinking, use your password to sign in.
                </p>
                <Button
                  variant="outline"
                  disabled={model.busy || !methods.capabilities.unlinkGoogle}
                  onClick={() => void model.change("unlink")}
                >
                  Unlink Google
                </Button>
              </>
            )}
            <Button
              variant="outline"
              disabled={model.busy}
              onClick={model.verify}
            >
              Verify identity
            </Button>
          </div>
        )}
        {model.verifying && methods && (
          <ReauthenticateDialog
            intent="manage your sign-in methods"
            passwordAvailable={methods.passwordAvailable}
            googleAvailable={methods.capabilities.reauthenticateGoogle}
            onVerified={model.verified}
            onCancel={model.cancelVerification}
          />
        )}
      </section>
      {methods?.passwordAvailable && <PasswordPanel />}
    </>
  );
}
