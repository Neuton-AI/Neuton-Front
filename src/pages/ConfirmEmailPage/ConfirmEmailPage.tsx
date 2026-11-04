import { Link } from "react-router-dom";
import { Button, Input } from "@/components/ui";
import { useConfirmEmailPage } from "./ConfirmEmailPage.module";

export function ConfirmEmailPage() {
  const {
    auth,
    secret,
    email,
    setEmail,
    busy,
    notice,
    error,
    confirm,
    resend,
    forget,
    signOut,
  } = useConfirmEmailPage();
  return (
    <main className="shell p-6" aria-labelledby="confirmation-title">
      <h1 id="confirmation-title" className="font-display text-3xl">
        Confirm your email
      </h1>
      <p className="my-4">
        Open the link from your inbox, then press Confirm email here. An expired
        or used link needs a new email.
      </p>
      {secret && (
        <Button
          disabled={busy}
          onClick={() => {
            void confirm();
          }}
        >
          Confirm email
        </Button>
      )}
      {notice && (
        <p role="status" className="my-4">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="my-4">
          {error}
        </p>
      )}
      <form className="my-6 flex flex-col gap-3" onSubmit={resend}>
        <label htmlFor="confirmation-email">Email address</label>
        <Input
          id="confirmation-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          disabled={busy}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button type="submit" disabled={busy}>
          Resend confirmation
        </Button>
      </form>
      <Link to="/signin" onClick={forget}>
        Sign in
      </Link>
      {auth.user && (
        <Button
          disabled={busy}
          onClick={() => {
            void signOut();
          }}
        >
          Sign out
        </Button>
      )}
    </main>
  );
}
