import type { FormField } from "@/components/FormFields/schema";
import { validateFields } from "@/components/FormFields/schema";
import { signIn, signUp } from "@/features/auth/auth";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
type Mode = "signin" | "signup";
export function useAuthPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate();

  const location = useLocation();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [fullName, setFullName] = useState("");

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [segment, setSegment] = useState<Mode>(mode);

  useEffect(() => {
    setError(null);
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
    try {
      if (segment === "signin") {
        await signIn({ email, password });
      } else {
        await signUp({ email, password, fullName });
      }

      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ?? "/dashboard", { replace: true });
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
      minLength: isSignIn ? undefined : 15,
      maxLength: 128,
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
    setSegment,
    submit,
    isSignIn,
  };
}
export type AuthPageModel = ReturnType<typeof useAuthPage>;
