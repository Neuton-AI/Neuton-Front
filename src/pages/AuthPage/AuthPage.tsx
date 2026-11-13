import type React from "react";
import { FormFields } from "@/components/FormFields/FormFields";
import { Button } from "@/components/ui";
import { Navigate } from "react-router-dom";
import {
  AuthHeading,
  AuthModeTabs,
} from "./components/AuthHeading/AuthHeading";
import { useAuthPage } from "./AuthPage.module";

type Mode = "signin" | "signup";

interface IAuthPage {
  mode: Mode;
}

export const AuthPage: React.FC<IAuthPage> = ({ mode }) => {
  const model = useAuthPage({ mode });
  const submitLabel = model.isSignIn ? "Sign in" : "Create account";
  if (model.signedIn && !model.busy) return <Navigate to={model.destination} replace />;
  return (
    <div className="shell">
      <div className="flex flex-1 flex-col justify-center px-6 pb-10">
        <AuthHeading isSignIn={model.isSignIn} />
        <AuthModeTabs isSignIn={model.isSignIn} onSelect={model.setSegment} />
        <form onSubmit={model.submit} className="mt-6 flex flex-col gap-4">
          <FormFields
            fields={model.fields}
            values={model.formValues}
            onChange={model.handleFieldChange}
          />
          {model.error ? (
            <p
              role="alert"
              className="rounded-card bg-semantic-error/10 p-3 text-label font-medium text-ink"
            >
              {model.error}
            </p>
          ) : null}
          {model.unavailable && (
            <Button variant="outline" onClick={model.checkSession} loading={model.busy}>Check session again</Button>
          )}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            radius="input"
            block
            loading={model.busy}
            disabled={model.googleBusy}
            className="h-12"
          >
            {model.busy ? "Working…" : submitLabel}
          </Button>
        </form>
        {model.googleEnabled && (
          <Button type="button" variant="secondary" size="lg" radius="input" block
            loading={model.googleBusy} disabled={model.busy} onClick={model.startGoogle} className="mt-4 h-12">
            Continue with Google
          </Button>
        )}
      </div>
    </div>
  );
};
