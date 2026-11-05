import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { completeCapturedGoogle } from "@/features/auth/google-completion";
import { safeReturnPath } from "@/features/auth/client";
import { broadcastAuthEvent } from "@/features/auth/tab-events";

export function useGoogleCompletePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const started = useRef(false);
  const [error, setError] = useState("");
  const completed = (
    location.state as {
      googleCompleted?: { returnPath: string; purpose: string };
    } | null
  )?.googleCompleted;
  useEffect(() => {
    if (auth.loading || completed || started.current) return;
    started.current = true;
    void completeCapturedGoogle()
      .then(async (result) => {
        // Preserve only a non-secret result across the provider's identity-boundary remount.
        navigate("/auth/google/complete", {
          replace: true,
          state: { googleCompleted: result },
        });
        await auth.refresh();
        broadcastAuthEvent("session-replaced");
      })
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Google sign-in failed. Start again.",
        ),
      );
  }, [auth, navigate, completed]);
  useEffect(() => {
    if (!completed || auth.loading || !auth.session) return;
    if (auth.session.user.status === "pending_email") {
      navigate("/auth/confirm", { replace: true });
    } else if (!auth.session.memberships.length) {
      navigate("/profile", {
        replace: true,
        state: { googleVerified: completed.purpose === "reauthenticate" },
      });
    } else {
      navigate(safeReturnPath(completed.returnPath), {
        replace: true,
        state: { googleVerified: completed.purpose === "reauthenticate" },
      });
    }
  }, [completed, auth.loading, auth.session, navigate]);
  const failedRestore = completed && !auth.loading && !auth.session;
  return { error, failedRestore };
}
