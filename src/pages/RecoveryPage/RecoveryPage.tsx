import { Link } from "react-router-dom";
import { Button, Input } from "@/components/ui";
import { useRecoveryPage } from "./RecoveryPage.module";

export function RecoveryPage() {
  const model = useRecoveryPage();
  return (
    <main className="shell p-6" aria-labelledby="recovery-title">
      <h1 id="recovery-title" className="font-display text-3xl">
        Recover your password
      </h1>
      <p className="my-4">
        Enter your contact email to request a password reset link.
      </p>
      <form
        onSubmit={(event) => void model.submit(event)}
        className="my-6 flex flex-col gap-3"
      >
        <label htmlFor="recovery-email">Email address</label>
        <Input
          id="recovery-email"
          type="email"
          autoComplete="email"
          required
          maxLength={320}
          disabled={model.busy}
          value={model.email}
          onChange={(event) => model.setEmail(event.target.value)}
        />
        {model.error && <p role="alert">{model.error}</p>}
        {model.notice && <p role="status">{model.notice}</p>}
        <Button type="submit" loading={model.busy}>
          Send recovery email
        </Button>
      </form>
      <Link to="/signin">Back to sign in</Link>
    </main>
  );
}
