import type { FormField } from "@/components/FormFields/schema";
import { validateFields } from "@/components/FormFields/schema";
import { restoreSession, signIn, signUp, startGoogleSignIn, useAuth } from "@/features/auth/auth";
import { ApiError } from "@/lib/api";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
type Mode = "signin" | "signup";

function googleNotice(search: string) {
  switch (new URLSearchParams(search).get('google')) {
    case 'canceled': return 'Google sign-in was canceled. You can try again.';
    case 'retry': return 'Google sign-in could not be verified. Start again.';
    case 'unavailable': return 'Google sign-in is temporarily unavailable. Try again or sign in with a password.';
    default: return null;
  }
}

export function useAuthPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate();

  const location = useLocation();
  const { session, loading, unavailable, message: sessionMessage } = useAuth();
  const destination = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [fullName, setFullName] = useState("");

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const googleStart = useRef<AbortController>();

  const [segment, setSegment] = useState<Mode>(mode);

  useEffect(() => {
    setError(null);
    setSegment(mode);
  }, [mode]);

  useEffect(() => {
    const returned = (event: PageTransitionEvent) => {
      if (event.persisted) {
        googleStart.current?.abort();
        setGoogleBusy(false);
        void restoreSession();
      }
    };
    window.addEventListener('pageshow', returned);
    return () => {
      googleStart.current?.abort();
      window.removeEventListener('pageshow', returned);
    };
  }, []);

  const startGoogle = async () => {
    if (busy || googleBusy || session) return;
    const controller = new AbortController();
    googleStart.current = controller;
    setGoogleBusy(true);
    setError(null);
    try {
      await startGoogleSignIn(controller.signal);
    } catch (cause) {
      if (controller.signal.aborted) return;
      if (cause instanceof ApiError && cause.code === 'GOOGLE_SESSION_CHANGED') {
        await restoreSession();
      } else {
        setError(cause instanceof Error ? cause.message : 'Google sign-in could not start. Try again.');
      }
      setGoogleBusy(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || googleBusy) return;
    const validationError = Object.values(
      validateFields(fields, formValues),
    )[0];
    if (validationError) {
      setError(String(validationError));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (segment === "signin") {
        await signIn({ email, password });
      } else {
        await signUp({ email, password, fullName });
      }

      navigate(destination, { replace: true });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const checkSession = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await restoreSession();
    } finally {
      setBusy(false);
    }
  };

  const isSignIn = segment === "signin";

  const formValues = { email, password, fullName };
  const fields: readonly FormField<typeof formValues>[] = [
    {
      kind: "input",
      name: "fullName",
      id: "fullName",
      label: "Full name",
      type: "text",
      autoComplete: "name",
      required: true,
      maxLength: 120,
      placeholder: "Your name",
      visible: () => !isSignIn,
    },
    {
      kind: "input",
      name: "email",
      id: "email",
      label: "Email",
      type: "email",
      autoComplete: "email",
      required: true,
      maxLength: 254,
    },
    {
      kind: "input",
      name: "password",
      id: "password",
      label: "Password",
      type: "password",
      autoComplete: isSignIn ? "current-password" : "new-password",
      required: true,
      minLength: isSignIn ? undefined : 10,
      maxLength: 128,
      hint: isSignIn ? undefined : "Use 10 to 128 characters.",
    },
  ];
  const handleFieldChange = (name: keyof typeof formValues, value: string) => {
    if (name === "email") setEmail(value);
    else if (name === "password") setPassword(value);
    else setFullName(value);
  };
  const notice = error ?? googleNotice(location.search);
  const sessionNotice = unavailable ? sessionMessage : null;
  return {
    fields,
    formValues,
    handleFieldChange,
    busy,
    error: notice ?? sessionNotice,
    loading,
    unavailable,
    signedIn: Boolean(session),
    destination,
    checkSession,
    googleEnabled: !session,
    googleBusy,
    startGoogle,
    setSegment,
    submit,
    isSignIn,
  };
}
export type AuthPageModel = ReturnType<typeof useAuthPage>;
