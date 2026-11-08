import type React from "react";
import { FullPageLoader } from "@/components/feedback";
import { LandingPage } from "@/pages/LandingPage/LandingPage";
import type { ReactElement } from "react";
import { Link, Navigate } from "react-router-dom";
import { checkSession, useRequireAuth, useRootRedirect } from "./AppGate.module";

function SessionUnavailable({ message }: { message?: string }) {
  return <main className="mx-auto max-w-md p-6">
    <p role="alert">{message ?? 'Session unavailable.'}</p>
    <button className="pressable mt-4" type="button" onClick={checkSession}>Check session</button>
    <Link className="ml-4" to="/signin">Go to sign in</Link>
  </main>;
}

export const RootRedirect: React.FC = () => {
  const { session, loading, unavailable, message } = useRootRedirect();
  if (loading) return <FullPageLoader />;
  if (unavailable) return <SessionUnavailable message={message} />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
};

interface IRequireAuth {
  children: ReactElement;
}

export const RequireAuth: React.FC<IRequireAuth> = ({ children }) => {
  const { session, loading, from, unavailable, message } = useRequireAuth();
  if (loading) return <FullPageLoader />;
  if (unavailable) return <SessionUnavailable message={message} />;
  if (!session) return <Navigate to="/signin" replace state={{ from }} />;
  return children;
};
