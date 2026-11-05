import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import { FullPageLoader } from "@/components/feedback";
import { ReauthenticateDialog } from "@/features/auth/ReauthenticateDialog";
import {
  useEmailChangeReady,
  useConfirmEmailChange,
} from "./ConfirmEmailChangePage.module";

export function ConfirmEmailChangePage() {
  if (!useEmailChangeReady()) return <FullPageLoader />;
  return <Confirmation />;
}
function Confirmation() {
  const model = useConfirmEmailChange();
  return (
    <main className="shell p-6" aria-labelledby="email-change-title">
      <h1 id="email-change-title" className="font-display text-3xl">
        Confirm contact email change
      </h1>
      {model.done && (
        <p role="status" className="my-4">
          Email changed. Sign in again. All previous sessions were revoked.
        </p>
      )}
      {model.error && (
        <p role="alert" className="my-4">
          {model.error}
        </p>
      )}
      {!model.done && !model.ready && (
        <p className="my-4">
          Sign in to the account that requested this change, then reopen the
          email link.
        </p>
      )}
      {!model.done && !model.secret && (
        <p className="my-4">
          Open a valid email link or request a new change from your profile.
        </p>
      )}
      {!model.done && model.ready && model.secret && (
        <div className="my-6 flex flex-col gap-3">
          <p className="break-all">Signed in as {model.email}.</p>
          <p>
            Confirm the address in the email you opened as your new contact. You
            will be signed out on every device.
          </p>
          <Button loading={model.busy} onClick={() => void model.submit()}>
            Confirm email change
          </Button>
        </div>
      )}
      {model.verifying && model.methods && (
        <>
          {model.methods.googleLinked && (
            <p className="my-3">
              After Google verification, reopen the email link. The secret is
              kept only in this open page.
            </p>
          )}
          <ReauthenticateDialog
            intent="confirm your contact email change"
            passwordAvailable={model.methods.passwordAvailable}
            googleAvailable={model.methods.capabilities.reauthenticateGoogle}
            onVerified={model.verified}
            onCancel={model.cancel}
          />
        </>
      )}
      <div className="my-4 flex flex-wrap gap-4">
        <Link to="/signin">Sign in</Link>
        <Link to="/profile">Profile</Link>
      </div>
    </main>
  );
}
