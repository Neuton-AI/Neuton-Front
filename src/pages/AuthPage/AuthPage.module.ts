import type { FormField } from "@/components/FormFields/schema";
import { validateFields } from "@/components/FormFields/schema";
import { useAuth } from "@/features/auth";
import { safeReturnPath } from "@/features/auth/client";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
type Mode = "signin" | "signup";
export function useAuthPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate();

  const location = useLocation();

  const auth = useAuth();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [fullName, setFullName] = useState("");

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [notice, setNotice] = useState<string | null>(null);

  const [segment, setSegment] = useState<Mode>(mode);

  useEffect(() => {
    setError(null);
    setNotice(null);
    setPassword("");
    setSegment(mode);
  }, [mode]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const validationError = Object.values(
      validateFields(fields, formValues),
    )[0];
    if (validationError) {
      setError(String(validationError));
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      if (segment === "signup") {
        await auth.register(email, password, fullName.trim() || undefined);
        setNotice(
          "If registration can proceed, a confirmation email is on its way. Check your inbox, then sign in.",
        );
        return;
      }
      const session = await auth.login(email, password);
      if (!session) return;
      if (session.user.status === "pending_email") {
        navigate("/auth/confirm", { replace: true });
        return;
      }
      if (!session.memberships.length) {
        navigate("/profile", { replace: true });
        return;
      }
      const from = (location.state as { from?: string } | null)?.from;
      navigate(safeReturnPath(from), { replace: true });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong. Try again.",
      );
    } finally {
      setPassword("");
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
      maxLength: 100,
      placeholder: "Your name (optional)",
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
    },
    {
      kind: "input",
      name: "password",
      id: "password",
      label: "Password",
      type: "password",
      autoComplete: isSignIn ? "current-password" : "new-password",
      required: true,
      minCodePoints: 15,
      maxCodePoints: 128,
      maxLength: 256,
    },
  ];
  const handleFieldChange = (name: keyof typeof formValues, value: string) => {
    if (name === "email") setEmail(value);
    else if (name === "password") setPassword(value);
    else setFullName(value);
  };
  return {
    fields,
    formValues,
    handleFieldChange,
    busy,
    error,
    notice,
    setSegment,
    submit,
    isSignIn,
  };
}
export type AuthPageModel = ReturnType<typeof useAuthPage>;
