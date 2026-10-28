import type { FormField } from "@/components/FormFields/schema";
import { validateFields } from "@/components/FormFields/schema";
import { supabase } from "@/features/auth/supabase";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
type Mode = "signin" | "signup";
export function useAuthPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate();

  const location = useLocation();

  const client = supabase;

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
    setSegment(mode);
  }, [mode]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!client || busy) return;
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
      if (segment === "signin") {
        const { error: signInError } = await client.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await client.auth.signUp({
          email,
          password,
          options: { data: { fullName } },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice("Check your inbox to confirm your email, then sign in.");
          return;
        }
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
    },
    {
      kind: "input",
      name: "password",
      id: "password",
      label: "Password",
      type: "password",
      autoComplete: isSignIn ? "current-password" : "new-password",
      required: true,
      minLength: 8,
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
    isConfigured: Boolean(client),
    busy,
    error,
    notice,
    setSegment,
    submit,
    isSignIn,
  };
}
export type AuthPageModel = ReturnType<typeof useAuthPage>;
