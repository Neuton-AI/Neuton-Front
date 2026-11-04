import type React from "react";
import { FormFields } from "@/components/FormFields/FormFields";
import { Button } from "@/components/ui";
import { Link } from "react-router-dom";
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
  let submitLabel = model.isSignIn ? "Sign in" : "Create account";
  if (model.busy) submitLabel = "Working…";
  return (
    <div className="shell">
      <div className="flex flex-1 flex-col justify-center px-6 pb-10">
        <AuthHeading isSignIn={model.isSignIn} />
        <AuthModeTabs isSignIn={model.isSignIn} onSelect={model.setSegment} />
        <form
          noValidate
          onSubmit={model.submit}
          className="mt-6 flex flex-col gap-4"
        >
          <FormFields
            disabled={model.busy}
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
          {model.notice ? (
            <p
              role="status"
              className="rounded-card bg-surface-cream-strong p-3 text-label font-medium text-ink"
            >
              {model.notice}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            radius="input"
            block
            loading={model.busy}
            className="h-12"
          >
            {submitLabel}
          </Button>
        </form>
        {model.isSignIn && (
          <p className="mt-3 text-right">
            <Link
              to="/forgot-password"
              className="text-label font-medium text-brand-primary-active underline underline-offset-2 hover:text-brand-primary"
            >
              Forgot password?
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};
