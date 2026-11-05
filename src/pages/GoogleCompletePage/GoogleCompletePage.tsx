import { Link } from "react-router-dom";
import { useGoogleCompletePage } from "./GoogleCompletePage.module";
export function GoogleCompletePage() {
  const { error, failedRestore } = useGoogleCompletePage();
  return (
    <main className="shell p-6" aria-labelledby="google-complete-title">
      <h1 id="google-complete-title" className="font-display text-3xl">
        Google sign-in
      </h1>
      {!error && !failedRestore && (
        <p role="status" className="my-4">
          Completing sign-in…
        </p>
      )}
      {(error || failedRestore) && (
        <>
          <p role="alert" className="my-4">
            {error ||
              "Your session could not be restored. Return to sign in and try again."}
          </p>
          <Link to="/signin">Return to sign in</Link>
        </>
      )}
    </main>
  );
}
